import { Service } from "./service";

import { AtomRewards, AtomStakes } from "../types/atom";
import { ServiceProps } from "../types/service";
import { Integration } from "../types/integrations";
import api from "../api";
import { DecodedTxRaw } from "@cosmjs/proto-signing";
import { CosmosSignedTx, CosmosTx, CosmosTxHash, CosmosTxStatus } from "../types/cosmos";
import { parseUnits } from "viem";

export class AtomService extends Service {
  constructor({ testnet }: ServiceProps) {
    super({ testnet });
  }

  /**
   * Convert ATOM to UATOM
   * @param amountAtom
   */
  atomToUatom(amountAtom: string): string {
    return parseUnits(amountAtom, 6).toString();
  }

  /**
   * Craft atom staking transaction
   * @param accountId id of the kiln account to use for the stake transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAddress validator address to delegate to
   * @param amountAtom how many tokens to stake in ATOM
   * @param restakeRewards If enabled, the rewards will be automatically restaked
   */
  async craftStakeTx(
    accountId: string,
    pubkey: string,
    validatorAddress: string,
    amountAtom: number,
    restakeRewards: boolean = false,
  ): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/atom/transaction/stake`, {
      account_id: accountId,
      pubkey: pubkey,
      validator: validatorAddress,
      amount_uatom: this.atomToUatom(amountAtom.toString()),
      restake_rewards: restakeRewards,
    });
    return data;
  }

  /**
   * Craft atom withdraw rewards transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAddress validator address to which the delegation has been made
   */
  async craftWithdrawRewardsTx(pubkey: string, validatorAddress: string): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/atom/transaction/withdraw-rewards`, {
      pubkey: pubkey,
      validator: validatorAddress,
    });
    return data;
  }

  /**
   * Craft atom restake rewards transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAddress validator address to which the delegation has been made
   */
  async craftRestakeRewardsTx(pubkey: string, validatorAddress: string): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/atom/transaction/restake-rewards`, {
      pubkey: pubkey,
      validator_address: validatorAddress,
    });
    return data;
  }

  /**
   * Craft atom unstaking transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAddress validator address to which the delegation has been made
   * @param amountAtom how many tokens to undelegate in ATOM
   */
  async craftUnstakeTx(pubkey: string, validatorAddress: string, amountAtom?: number): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/atom/transaction/unstake`, {
      pubkey: pubkey,
      validator: validatorAddress,
      amount_uatom: amountAtom ? this.atomToUatom(amountAtom.toString()) : undefined,
    });
    return data;
  }

  /**
   * Craft atom redelegate transaction
   * @param accountId id of the kiln account to use for the new stake
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorSourceAddress validator address of the current delegation
   * @param validatorDestinationAddress validator address to which the delegation will be moved
   * @param amountAtom how many tokens to redelegate in ATOM
   */
  async craftRedelegateTx(
    accountId: string,
    pubkey: string,
    validatorSourceAddress: string,
    validatorDestinationAddress: string,
    amountAtom?: number,
  ): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/atom/transaction/redelegate`, {
      account_id: accountId,
      pubkey: pubkey,
      validator_source: validatorSourceAddress,
      validator_destination: validatorDestinationAddress,
      amount_uatom: amountAtom ? this.atomToUatom(amountAtom.toString()) : undefined,
    });
    return data;
  }

  /**
   * Sign transaction with given integration
   * @param integration custody solution to sign with
   * @param tx raw transaction
   * @param note note to identify the transaction in your custody solution
   */
  async sign(integration: Integration, tx: CosmosTx, note?: string): Promise<CosmosSignedTx> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.data.unsigned_tx_hash,
          },
        ],
      },
    };
    const fbNote = note ? note : "ATOM tx from @kilnfi/sdk";
    const signer = this.getFbSigner(integration);
    const fbTx = await signer.sign(payload, this.testnet ? "ATOM_COS_TEST" : "ATOM_COS", fbNote);
    const signature: string = fbTx.signedMessages![0].signature.fullSig;
    const { data } = await api.post<CosmosSignedTx>(`/v1/atom/transaction/prepare`, {
      pubkey: tx.data.pubkey,
      tx_body: tx.data.tx_body,
      tx_auth_info: tx.data.tx_auth_info,
      signature: signature,
    });
    data.data.fireblocks_tx = fbTx;
    return data;
  }

  /**
   * Broadcast transaction to the network
   * @param signedTx
   */
  async broadcast(signedTx: CosmosSignedTx): Promise<CosmosTxHash> {
    const { data } = await api.post<CosmosTxHash>(`/v1/atom/transaction/broadcast`, {
      tx_serialized: signedTx.data.signed_tx_serialized,
    });
    return data;
  }

  /**
   * Get transaction status
   * @param txHash
   */
  async getTxStatus(txHash: string): Promise<CosmosTxStatus> {
    const { data } = await api.get<CosmosTxStatus>(`/v1/atom/transaction/status?tx_hash=${txHash}`);
    return data;
  }

  /**
   * Decode transaction
   * @param txSerialized transaction serialized
   */
  async decodeTx(txSerialized: string): Promise<DecodedTxRaw> {
    const { data } = await api.get<DecodedTxRaw>(`/v1/atom/transaction/decode?tx_serialized=${txSerialized}`);
    return data;
  }

  /**
   * Retrieve stakes of given kiln accounts
   * @param accountIds kiln account ids of which you wish to retrieve stakes
   * @returns {AtomStakes} Atom Stakes
   */
  async getStakesByAccounts(accountIds: string[]): Promise<AtomStakes> {
    const { data } = await api.get<AtomStakes>(`/v1/atom/stakes?accounts=${accountIds.join(",")}`);
    return data;
  }

  /**
   * Retrieve stakes of given stake accounts
   * @param delegators delegator addresses of which you wish to retrieve stakes
   * @param validators validator addresses of which you wish to retrieve stakes
   * @returns {AtomStakes} Atom Stakes
   */
  async getStakesByDelegatorsAndValidators(delegators: string[], validators: string[]): Promise<AtomStakes> {
    const { data } = await api.get<AtomStakes>(
      `/v1/atom/stakes?delegators=${delegators.join(",")}&validators=${validators.join(",")}`,
    );
    return data;
  }

  /**
   * Retrieve rewards for given accounts
   * @param accountIds kiln account ids of which you wish to retrieve rewards
   * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
   * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
   * @returns {AtomRewards} Atom rewards
   */
  async getRewardsByAccounts(accountIds: string[], startDate?: string, endDate?: string): Promise<AtomRewards> {
    const query = `/v1/atom/rewards?accounts=${accountIds.join(",")}${
      startDate ? `&start_date=${startDate}` : ""
    }${endDate ? `&end_date=${endDate}` : ""}`;
    const { data } = await api.get<AtomRewards>(query);
    return data;
  }

  /**
   * Retrieve rewards for given stake accounts
   * @param delegators delegator addresses of which you wish to retrieve rewards
   * @param validators validator addresses of which you wish to retrieve rewards
   * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
   * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
   * @returns {AtomRewards} Atom rewards
   */
  async getRewardsByDelegatorsAndValidators(
    delegators: string[],
    validators: string[],
    startDate?: string,
    endDate?: string,
  ): Promise<AtomRewards> {
    const query = `/v1/atom/rewards?delegators=${delegators.join(",")}&validators=${validators.join(",")}${
      startDate ? `&start_date=${startDate}` : ""
    }${endDate ? `&end_date=${endDate}` : ""}`;
    const { data } = await api.get<AtomRewards>(query);
    return data;
  }
}
