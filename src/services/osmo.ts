import { Service } from "./service";

import { OsmoRewards, OsmoStakes } from "../types/osmo";
import { ServiceProps } from "../types/service";
import { Integration } from "../types/integrations";
import api from "../api";
import { DecodedTxRaw } from "@cosmjs/proto-signing";
import { CosmosSignedTx, CosmosTx, CosmosTxHash, CosmosTxStatus } from "../types/cosmos";
import { parseUnits } from "viem";

export class OsmoService extends Service {
  constructor({ testnet }: ServiceProps) {
    super({ testnet });
  }

  /**
   * Convert OSMO to UOSMO
   * @param amountOsmo
   */
  osmoToUosmo(amountOsmo: string): string {
    return parseUnits(amountOsmo, 6).toString();
  }

  /**
   * Craft osmo staking transaction
   * @param accountId id of the kiln account to use for the stake transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAddress validator address to delegate to
   * @param amountOsmo how many tokens to stake in OSMO
   * @param restakeRewards If enabled, the rewards will be automatically restaked
   * @param granteeAddress validator grantee address
   */
  async craftStakeTx(
    accountId: string,
    pubkey: string,
    validatorAddress: string,
    amountOsmo: number,
    restakeRewards: boolean = false,
    granteeAddress?: string,
  ): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/osmo/transaction/stake`, {
      account_id: accountId,
      pubkey: pubkey,
      validator: validatorAddress,
      amount_uosmo: this.osmoToUosmo(amountOsmo.toString()),
      restake_rewards: restakeRewards,
      grantee_address: granteeAddress,
    });
    return data;
  }

  /**
   * Craft osmo withdraw rewards transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAddress validator address to which the delegation has been made
   */
  async craftWithdrawRewardsTx(pubkey: string, validatorAddress: string): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/osmo/transaction/withdraw-rewards`, {
      pubkey: pubkey,
      validator: validatorAddress,
    });
    return data;
  }

  /**
   * Craft osmo restake rewards transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAddress validator address to which the delegation has been made
   * @param granteeAddress validator grantee address
   */
  async craftRestakeRewardsTx(pubkey: string, validatorAddress: string, granteeAddress: string): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/osmo/transaction/restake-rewards`, {
      pubkey: pubkey,
      validator_address: validatorAddress,
      grantee_address: granteeAddress,
    });
    return data;
  }

  /**
   * Craft osmo unstaking transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAddress validator address to which the delegation has been made
   * @param amountOsmo how many tokens to undelegate in OSMO
   */
  async craftUnstakeTx(pubkey: string, validatorAddress: string, amountOsmo?: number): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/osmo/transaction/unstake`, {
      pubkey: pubkey,
      validator: validatorAddress,
      amount_uosmo: amountOsmo ? this.osmoToUosmo(amountOsmo.toString()) : undefined,
    });
    return data;
  }

  /**
   * Craft osmo redelegate transaction
   * @param accountId id of the kiln account to use for the new stake
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorSourceAddress validator address of the current delegation
   * @param validatorDestinationAddress validator address to which the delegation will be moved
   * @param amountOsmo how many tokens to redelegate in OSMO
   */
  async craftRedelegateTx(
    accountId: string,
    pubkey: string,
    validatorSourceAddress: string,
    validatorDestinationAddress: string,
    amountOsmo?: number,
  ): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/osmo/transaction/redelegate`, {
      account_id: accountId,
      pubkey: pubkey,
      validator_source: validatorSourceAddress,
      validator_destination: validatorDestinationAddress,
      amount_uosmo: amountOsmo ? this.osmoToUosmo(amountOsmo.toString()) : undefined,
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
            preHash: {
              content: tx.data.unsigned_tx_serialized,
              hashAlgorithm: "SHA256",
            },
          },
        ],
      },
    };
    const fbNote = note ? note : "OSMO tx from @kilnfi/sdk";
    const signer = this.getFbSigner(integration);
    const fbTx = await signer.sign(payload, "OSMO", fbNote);
    const signature: string = fbTx.signedMessages![0].signature.fullSig;
    const { data } = await api.post<CosmosSignedTx>(`/v1/osmo/transaction/prepare`, {
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
    const { data } = await api.post<CosmosTxHash>(`/v1/osmo/transaction/broadcast`, {
      tx_serialized: signedTx.data.signed_tx_serialized,
    });
    return data;
  }

  /**
   * Get transaction status
   * @param txHash
   */
  async getTxStatus(txHash: string): Promise<CosmosTxStatus> {
    const { data } = await api.get<CosmosTxStatus>(`/v1/osmo/transaction/status?tx_hash=${txHash}`);
    return data;
  }

  /**
   * Decode transaction
   * @param txSerialized transaction serialized
   */
  async decodeTx(txSerialized: string): Promise<DecodedTxRaw> {
    const { data } = await api.get<DecodedTxRaw>(`/v1/osmo/transaction/decode?tx_serialized=${txSerialized}`);
    return data;
  }

  /**
   * Retrieve stakes of given kiln accounts
   * @param accountIds kiln account ids of which you wish to retrieve stakes
   * @returns {OsmoStakes} Osmo Stakes
   */
  async getStakesByAccounts(accountIds: string[]): Promise<OsmoStakes> {
    const { data } = await api.get<OsmoStakes>(`/v1/osmo/stakes?accounts=${accountIds.join(",")}`);
    return data;
  }

  /**
   * Retrieve stakes of given stake accounts
   * @param delegators delegator addresses of which you wish to retrieve stakes
   * @param validators validator addresses of which you wish to retrieve stakes
   * @returns {OsmoStakes} Osmo Stakes
   */
  async getStakesByDelegatorsAndValidators(delegators: string[], validators: string[]): Promise<OsmoStakes> {
    const { data } = await api.get<OsmoStakes>(
      `/v1/osmo/stakes?delegators=${delegators.join(",")}&validators=${validators.join(",")}`,
    );
    return data;
  }

  /**
   * Retrieve rewards for given accounts
   * @param accountIds kiln account ids of which you wish to retrieve rewards
   * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
   * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
   * @returns {OsmoRewards} Osmo rewards
   */
  async getRewardsByAccounts(accountIds: string[], startDate?: string, endDate?: string): Promise<OsmoRewards> {
    const query = `/v1/osmo/rewards?accounts=${accountIds.join(",")}${
      startDate ? `&start_date=${startDate}` : ""
    }${endDate ? `&end_date=${endDate}` : ""}`;
    const { data } = await api.get<OsmoRewards>(query);
    return data;
  }

  /**
   * Retrieve rewards for given stake accounts
   * @param delegators delegator addresses of which you wish to retrieve rewards
   * @param validators validator addresses of which you wish to retrieve rewards
   * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
   * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
   * @returns {OsmoRewards} Osmo rewards
   */
  async getRewardsByDelegatorsAndValidators(
    delegators: string[],
    validators: string[],
    startDate?: string,
    endDate?: string,
  ): Promise<OsmoRewards> {
    const query = `/v1/osmo/rewards?delegators=${delegators.join(",")}&validators=${validators.join(",")}${
      startDate ? `&start_date=${startDate}` : ""
    }${endDate ? `&end_date=${endDate}` : ""}`;
    const { data } = await api.get<OsmoRewards>(query);
    return data;
  }
}
