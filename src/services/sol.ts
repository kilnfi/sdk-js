import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import api from '../api';
import {
  SolNetworkStats,
  SolRewards,
  SolSignedTx,
  SolStakes,
  SolTx,
  SolTxHash,
  SolTxStatus,
} from '../types/sol';
import { Service } from './service';
import { ServiceProps } from '../types/service';
import { Integration } from '../types/integrations';


export class SolService extends Service {
  constructor({ testnet }: ServiceProps) {
    super({ testnet });
  }

  /**
   * Craft Solana staking transaction
   * @param accountId id of the kiln account to use for the stake transaction
   * @param walletAddress used to create the stake account and retrieve rewards in the future
   * @param voteAccountAddress vote account address of the validator that you wish to delegate to
   * @param amountLamports how much to stake in lamports (min 0.01 SOL)
   */
  async craftStakeTx(
    accountId: string,
    walletAddress: string,
    voteAccountAddress: string,
    amountLamports: string,
  ): Promise<SolTx> {
    try {
      const { data } = await api.post<SolTx>(
        `/v1/sol/transaction/stake`,
        {
          account_id: accountId,
          wallet: walletAddress,
          amount_lamports: amountLamports,
          options: {
            vote_account_address: voteAccountAddress,
          },
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft Solana desactivate stake account transaction
   * @param stakeAccountAddress stake account address to deactivate
   * @param walletAddress wallet that has authority over the stake account
   */
  async craftDeactivateStakeTx(
    stakeAccountAddress: string,
    walletAddress: string,
  ): Promise<SolTx> {
    try {
      const { data } = await api.post<SolTx>(
        `/v1/sol/transaction/deactivate-stake`,
        {
          stake_account: stakeAccountAddress,
          wallet: walletAddress,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft Solana withdraw stake transaction
   * @param stakeAccountAddress stake account address to deactivate
   * @param walletAddress wallet that has authority over the stake account
   * @param amountLamports: amount to withdraw in lamports, if not specified the whole balance will be withdrawn
   */
  async craftWithdrawStakeTx(
    stakeAccountAddress: string,
    walletAddress: string,
    amountLamports?: string,
  ): Promise<SolTx> {
    try {
      const { data } = await api.post<SolTx>(
        `/v1/sol/transaction/withdraw-stake`,
        {
          stake_account: stakeAccountAddress,
          wallet: walletAddress,
          amount_lamports: amountLamports,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
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
    try {
      const { data } = await api.post<SolTx>(
        `/v1/sol/transaction/merge-stakes`,
        {
          stake_account_source: stakeAccountSourceAddress,
          stake_account_destination: stakeAccountDestinationAddress,
          wallet: walletAddress,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft split stake account transaction
   * @param accountId kiln account id to associate the new stake account with
   * @param stakeAccountAddress stake account to split
   * @param walletAddress that has authority over the stake account to split
   * @param amountLamports amount in lamports to put in the new stake account
   */
  async craftSplitStakeTx(
    accountId: string,
    stakeAccountAddress: string,
    walletAddress: string,
    amountLamports: string,
  ): Promise<SolTx> {
    try {
      const { data } = await api.post<SolTx>(
        `/v1/sol/transaction/split-stake`,
        {
          account_id: accountId,
          stake_account: stakeAccountAddress,
          wallet: walletAddress,
          amount_lamports: amountLamports,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Sign transaction with given integration
   * @param integration custody solution to sign with
   * @param tx raw ada transaction
   * @param note note to identify the transaction in your custody solution
   */
  async sign(integration: Integration, tx: SolTx, note?: string): Promise<SolSignedTx> {
    try {
      const payload = {
        rawMessageData: {
          messages: [
            {
              'content': tx.data.unsigned_tx_hash,
            },
          ],
        },
      };

      const fbSigner = this.getFbSigner(integration);
      const fbNote = note ? note : 'SOL tx from @kilnfi/sdk';
      const fbSignatures = await fbSigner.signWithFB(payload, this.testnet ? 'SOL_TEST' : 'SOL', fbNote);
      const signatures: string[] = [];
      fbSignatures.signedMessages?.forEach((signedMessage: any) => {
        if (signedMessage.derivationPath[3] == 0) {
          signatures.push(signedMessage.signature.fullSig);
        }
      });

      const { data } = await api.post<SolSignedTx>(
        `/v1/sol/transaction/prepare`,
        {
          unsigned_tx_serialized: tx.data.unsigned_tx_serialized,
          signatures: signatures,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }


  /**
   * Broadcast transaction to the network
   * @param signedTx: serialized signed tx
   */
  async broadcast(signedTx: SolSignedTx): Promise<SolTxHash> {
    try {
      const { data } = await api.post<SolTxHash>(
        `/v1/sol/transaction/broadcast`,
        {
          tx_serialized: signedTx.data.signed_tx_serialized,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Get transaction status
   * @param txHash: transaction hash
   */
  async getTxStatus(txHash: string): Promise<SolTxStatus> {
    try {
      const { data } = await api.get<SolTxStatus>(
        `/v1/sol/transaction/status?tx_hash=${txHash}`);
      return data;
    } catch (e: any) {
      throw new Error(e);
    }
  }

  /**
   * Retrieve stakes of given kiln accounts
   * @param accountIds: kiln account ids of which you wish to retrieve stakes
   * @returns {SolStakes} Solana Stakes
   */
  async getStakesByAccounts(
    accountIds: string[],
  ): Promise<SolStakes> {
    try {
      const { data } = await api.get<SolStakes>(
        `/v1/sol/stakes?accounts=${accountIds.join(',')}`);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Retrieve stakes of given stake accounts
   * @param stakeAccounts: stake account addresses of which you wish to retrieve stakes
   * @returns {SolStakes} Solana Stakes
   */
  async getStakesByStakeAccounts(
    stakeAccounts: string[],
  ): Promise<SolStakes> {
    try {
      const { data } = await api.get<SolStakes>(
        `/v1/sol/stakes?stake_accounts=${stakeAccounts.join(',')}`);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Retrieve stakes of given wallets
   * @param wallets: wallet addresses of which you wish to retrieve stakes
   * @returns {SolStakes} Solana Stakes
   */
  async getStakesByWallets(
    wallets: string[],
  ): Promise<SolStakes> {
    try {
      const { data } = await api.get<SolStakes>(
        `/v1/sol/stakes?wallets=${wallets.join(',')}`);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Retrieve rewards for given accounts
   * @param accountIds kiln account ids of which you wish to retrieve rewards
   * @param startDate: optional date YYYY-MM-DD from which you wish to retrieve rewards
   * @param endDate: optional date YYYY-MM-DD until you wish to retrieve rewards
   * @returns {SolRewards} Solana rewards
   */
  async getRewardsByAccounts(
    accountIds: string[],
    startDate?: string,
    endDate?: string,
  ): Promise<SolRewards> {
    try {
      const query = `/v1/sol/rewards?accounts=${accountIds.join(',')}${
        startDate ? `&start_date=${startDate}` : ''
      }${endDate ? `&end_date=${endDate}` : ''}`;
      const { data } = await api.get<SolRewards>(query);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Retrieve rewards for given stake accounts
   * @param stakeAccounts stake account addresses of which you wish to retrieve rewards
   * @param startDate: optional date YYYY-MM-DD from which you wish to retrieve rewards
   * @param endDate: optional date YYYY-MM-DD until you wish to retrieve rewards
   * @returns {SolRewards} Solana rewards
   */
  async getRewardsByStakeAccounts(
    stakeAccounts: string[],
    startDate?: string,
    endDate?: string,
  ): Promise<SolRewards> {
    try {
      const query = `/v1/sol/rewards?stake_accounts=${stakeAccounts.join(',')}${
        startDate ? `&start_date=${startDate}` : ''
      }${endDate ? `&end_date=${endDate}` : ''}`;
      const { data } = await api.get<SolRewards>(query);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Retrieve rewards for given stake accounts
   * @param wallets wallet addresses of which you wish to retrieve rewards
   * @param startDate: optional date YYYY-MM-DD from which you wish to retrieve rewards
   * @param endDate: optional date YYYY-MM-DD until you wish to retrieve rewards
   * @returns {SolRewards} Solana rewards
   */
  async getRewardsByWallets(
    wallets: string[],
    startDate?: string,
    endDate?: string,
  ): Promise<SolRewards> {
    try {
      const query = `/v1/sol/rewards?wallets=${wallets.join(',')}${
        startDate ? `&start_date=${startDate}` : ''
      }${endDate ? `&end_date=${endDate}` : ''}`;
      const { data } = await api.get<SolRewards>(query);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Retrieve SOL network stats
   */
  async getNetworkStats(): Promise<SolNetworkStats> {
    try {
      const { data } = await api.get<SolNetworkStats>(
        `/v1/sol/network-stats`,
      );
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Convert SOL to Lamports
   * @param sol
   */
  solToLamports(sol: string): string {
    return (Number(sol) * LAMPORTS_PER_SOL).toString();
  }
}
