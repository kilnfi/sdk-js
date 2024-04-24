import { LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import api from "../api";
import { SolNetworkStats, SolRewards, SolSignedTx, SolStakes, SolTx, SolTxHash, SolTxStatus } from "../types/sol";
import { Service } from "./service";
import { ServiceProps } from "../types/service";
import { Integration } from "../types/integrations";
import { parseUnits } from "viem";

export class SolService extends Service {
  constructor({ testnet }: ServiceProps) {
    super({ testnet });
  }

  /**
   * Craft Solana staking transaction
   * @param accountId id of the kiln account to use for the stake transaction
   * @param walletAddress used to create the stake account and retrieve rewards in the future
   * @param voteAccountAddress vote account address of the validator that you wish to delegate to
   * @param amountSol how much to stake in SOL (min 0.01 SOL)
   * @param memo custom memo message to include in the transaction
   */
  async craftStakeTx(
    accountId: string,
    walletAddress: string,
    voteAccountAddress: string,
    amountSol: number,
    memo?: string,
  ): Promise<SolTx> {
    const { data } = await api.post<SolTx>(`/v1/sol/transaction/stake`, {
      account_id: accountId,
      wallet: walletAddress,
      amount_lamports: this.solToLamports(amountSol.toString()),
      vote_account_address: voteAccountAddress,
      memo,
    });
    return data;
  }

  /**
   * Craft Solana desactivate stake account transaction
   * @param stakeAccountAddress stake account address to deactivate
   * @param walletAddress wallet that has authority over the stake account
   */
  async craftDeactivateStakeTx(stakeAccountAddress: string, walletAddress: string): Promise<SolTx> {
    const { data } = await api.post<SolTx>(`/v1/sol/transaction/deactivate-stake`, {
      stake_account: stakeAccountAddress,
      wallet: walletAddress,
    });
    return data;
  }

  /**
   * Craft Solana withdraw stake transaction
   * @param stakeAccountAddress stake account address to deactivate
   * @param walletAddress wallet that has authority over the stake account
   * @param amountSol: amount to withdraw in SOL, if not specified the whole balance will be withdrawn
   */
  async craftWithdrawStakeTx(stakeAccountAddress: string, walletAddress: string, amountSol?: number): Promise<SolTx> {
    const { data } = await api.post<SolTx>(`/v1/sol/transaction/withdraw-stake`, {
      stake_account: stakeAccountAddress,
      wallet: walletAddress,
      amount_lamports: amountSol ? this.solToLamports(amountSol.toString()) : undefined,
    });
    return data;
  }

  /**
   * Craft merge stake accounts transaction, merging stake accounts can only be done on these conditions
   * https://docs.solana.com/staking/stake-accounts#merging-stake-accounts
   * @param stakeAccountSourceAddress source stake account to merge into the destination stake account
   * @param stakeAccountDestinationAddress stake account to merge the source stake account into
   * @param walletAddress that has authority over the 2 stake accounts to merge
   */
  async craftMergeStakesTx(
    stakeAccountSourceAddress: string,
    stakeAccountDestinationAddress: string,
    walletAddress: string,
  ): Promise<SolTx> {
    const { data } = await api.post<SolTx>(`/v1/sol/transaction/merge-stakes`, {
      stake_account_source: stakeAccountSourceAddress,
      stake_account_destination: stakeAccountDestinationAddress,
      wallet: walletAddress,
    });
    return data;
  }

  /**
   * Craft split stake account transaction
   * @param accountId kiln account id to associate the new stake account with
   * @param stakeAccountAddress stake account to split
   * @param walletAddress that has authority over the stake account to split
   * @param amountSol amount in SOL to put in the new stake account
   */
  async craftSplitStakeTx(
    accountId: string,
    stakeAccountAddress: string,
    walletAddress: string,
    amountSol: number,
  ): Promise<SolTx> {
    const { data } = await api.post<SolTx>(`/v1/sol/transaction/split-stake`, {
      account_id: accountId,
      stake_account: stakeAccountAddress,
      wallet: walletAddress,
      amount_lamports: this.solToLamports(amountSol.toString()),
    });
    return data;
  }

  /**
   * Sign transaction with given integration
   * @param integration custody solution to sign with
   * @param tx raw transaction
   * @param note note to identify the transaction in your custody solution
   */
  async sign(integration: Integration, tx: SolTx, note?: string): Promise<SolSignedTx> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.data.unsigned_tx_hash,
          },
        ],
      },
    };

    const fbSigner = this.getFbSigner(integration);
    const fbNote = note ? note : "SOL tx from @kilnfi/sdk";
    const fbTx = await fbSigner.sign(payload, this.testnet ? "SOL_TEST" : "SOL", fbNote);
    const signatures: string[] = [];
    fbTx.signedMessages?.forEach((signedMessage: any) => {
      if (signedMessage.derivationPath[3] == 0) {
        signatures.push(signedMessage.signature.fullSig);
      }
    });

    const { data } = await api.post<SolSignedTx>(`/v1/sol/transaction/prepare`, {
      unsigned_tx_serialized: tx.data.unsigned_tx_serialized,
      signatures: signatures,
    });
    data.data.fireblocks_tx = fbTx;
    return data;
  }

  /**
   * Broadcast transaction to the network
   * @param signedTx serialized signed tx
   */
  async broadcast(signedTx: SolSignedTx): Promise<SolTxHash> {
    const { data } = await api.post<SolTxHash>(`/v1/sol/transaction/broadcast`, {
      tx_serialized: signedTx.data.signed_tx_serialized,
    });
    return data;
  }

  /**
   * Get transaction status
   * @param txHash transaction hash
   */
  async getTxStatus(txHash: string): Promise<SolTxStatus> {
    const { data } = await api.get<SolTxStatus>(`/v1/sol/transaction/status?tx_hash=${txHash}`);
    return data;
  }

  /**
   * Decode transaction
   * @param txSerialized transaction serialized
   */
  async decodeTx(txSerialized: string): Promise<Transaction> {
    const { data } = await api.get<Transaction>(`/v1/sol/transaction/decode?tx_serialized=${txSerialized}`);
    return data;
  }

  /**
   * Retrieve stakes of given kiln accounts
   * @param accountIds kiln account ids of which you wish to retrieve stakes
   * @returns {SolStakes} Solana Stakes
   */
  async getStakesByAccounts(accountIds: string[]): Promise<SolStakes> {
    const { data } = await api.get<SolStakes>(`/v1/sol/stakes?accounts=${accountIds.join(",")}`);
    return data;
  }

  /**
   * Retrieve stakes of given stake accounts
   * @param stakeAccounts stake account addresses of which you wish to retrieve stakes
   * @returns {SolStakes} Solana Stakes
   */
  async getStakesByStakeAccounts(stakeAccounts: string[]): Promise<SolStakes> {
    const { data } = await api.get<SolStakes>(`/v1/sol/stakes?stake_accounts=${stakeAccounts.join(",")}`);
    return data;
  }

  /**
   * Retrieve stakes of given wallets
   * @param wallets wallet addresses of which you wish to retrieve stakes
   * @returns {SolStakes} Solana Stakes
   */
  async getStakesByWallets(wallets: string[]): Promise<SolStakes> {
    const { data } = await api.get<SolStakes>(`/v1/sol/stakes?wallets=${wallets.join(",")}`);
    return data;
  }

  /**
   * Retrieve rewards for given accounts
   * @param accountIds kiln account ids of which you wish to retrieve rewards
   * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
   * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
   * @returns {SolRewards} Solana rewards
   */
  async getRewardsByAccounts(accountIds: string[], startDate?: string, endDate?: string): Promise<SolRewards> {
    const query = `/v1/sol/rewards?accounts=${accountIds.join(",")}${
      startDate ? `&start_date=${startDate}` : ""
    }${endDate ? `&end_date=${endDate}` : ""}`;
    const { data } = await api.get<SolRewards>(query);
    return data;
  }

  /**
   * Retrieve rewards for given stake accounts
   * @param stakeAccounts stake account addresses of which you wish to retrieve rewards
   * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
   * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
   * @returns {SolRewards} Solana rewards
   */
  async getRewardsByStakeAccounts(stakeAccounts: string[], startDate?: string, endDate?: string): Promise<SolRewards> {
    const query = `/v1/sol/rewards?stake_accounts=${stakeAccounts.join(",")}${
      startDate ? `&start_date=${startDate}` : ""
    }${endDate ? `&end_date=${endDate}` : ""}`;
    const { data } = await api.get<SolRewards>(query);
    return data;
  }

  /**
   * Retrieve rewards for given stake accounts
   * @param wallets wallet addresses of which you wish to retrieve rewards
   * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
   * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
   * @returns {SolRewards} Solana rewards
   */
  async getRewardsByWallets(wallets: string[], startDate?: string, endDate?: string): Promise<SolRewards> {
    const query = `/v1/sol/rewards?wallets=${wallets.join(",")}${
      startDate ? `&start_date=${startDate}` : ""
    }${endDate ? `&end_date=${endDate}` : ""}`;
    const { data } = await api.get<SolRewards>(query);
    return data;
  }

  /**
   * Retrieve SOL network stats
   */
  async getNetworkStats(): Promise<SolNetworkStats> {
    const { data } = await api.get<SolNetworkStats>(`/v1/sol/network-stats`);
    return data;
  }

  /**
   * Convert SOL to Lamports
   * @param sol
   */
  solToLamports(sol: string): string {
    return parseUnits(sol, 9).toString();
  }
}
