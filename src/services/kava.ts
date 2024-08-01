import { Service } from "./service";

import { ServiceProps } from "../types/service";
import { Integration } from "../types/integrations";
import api from "../api";
import { DecodedTxRaw } from "@cosmjs/proto-signing";
import { CosmosSignedTx, CosmosTx, CosmosTxHash, CosmosTxStatus } from "../types/cosmos";
import { parseUnits } from "viem";

export class KavaService extends Service {
  constructor({ testnet }: ServiceProps) {
    super({ testnet });
  }

  /**
   * Convert KAVA to ukava
   * @param amount
   */
  kavaToUkava(amount: string): string {
    return parseUnits(amount, 6).toString();
  }

  /**
   * Craft kava staking transaction
   * @param accountId id of the kiln account to use for the stake transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAddress validator address to delegate to
   * @param amountKava how many tokens to stake in KAVA
   * @param restakeRewards If enabled, the rewards will be automatically restaked
   * @param granteeAddress validator grantee address
   */
  async craftStakeTx(
    accountId: string,
    pubkey: string,
    validatorAddress: string,
    amountKava: number,
    restakeRewards: boolean = false,
    granteeAddress?: string,
  ): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/kava/transaction/stake`, {
      account_id: accountId,
      pubkey: pubkey,
      validator: validatorAddress,
      amount_ukava: this.kavaToUkava(amountKava.toString()),
      restake_rewards: restakeRewards,
      grantee_address: granteeAddress,
    });
    return data;
  }

  /**
   * Craft kava withdraw rewards transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAddress validator address to which the delegation has been made
   */
  async craftWithdrawRewardsTx(pubkey: string, validatorAddress: string): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/kava/transaction/withdraw-rewards`, {
      pubkey: pubkey,
      validator: validatorAddress,
    });
    return data;
  }

  /**
   * Craft kava restake rewards transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAddress validator address to which the delegation has been made
   * @param granteeAddress validator grantee address
   */
  async craftRestakeRewardsTx(pubkey: string, validatorAddress: string, granteeAddress: string): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/kava/transaction/restake-rewards`, {
      pubkey: pubkey,
      validator_address: validatorAddress,
      grantee_address: granteeAddress,
    });
    return data;
  }

  /**
   * Craft kava unstaking transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAddress validator address to which the delegation has been made
   * @param amountKava how many tokens to undelegate in KAVA
   */
  async craftUnstakeTx(pubkey: string, validatorAddress: string, amountKava?: number): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/kava/transaction/unstake`, {
      pubkey: pubkey,
      validator: validatorAddress,
      amount_kava: amountKava ? this.kavaToUkava(amountKava.toString()) : undefined,
    });
    return data;
  }

  /**
   * Craft kava redelegate transaction
   * @param accountId id of the kiln account to use for the new stake
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorSourceAddress validator address of the current delegation
   * @param validatorDestinationAddress validator address to which the delegation will be moved
   * @param amountKava how many tokens to redelegate in KAVA
   */
  async craftRedelegateTx(
    accountId: string,
    pubkey: string,
    validatorSourceAddress: string,
    validatorDestinationAddress: string,
    amountKava?: number,
  ): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/kava/transaction/redelegate`, {
      account_id: accountId,
      pubkey: pubkey,
      validator_source: validatorSourceAddress,
      validator_destination: validatorDestinationAddress,
      amount_ukava: amountKava ? this.kavaToUkava(amountKava.toString()) : undefined,
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
    const fbNote = note ? note : "KAVA tx from @kilnfi/sdk";
    const signer = this.getFbSigner(integration);
    const fbTx = await signer.sign(payload, "KAVA_KAVA", fbNote);
    const signature: string = fbTx.signedMessages![0].signature.fullSig;
    const { data } = await api.post<CosmosSignedTx>(`/v1/kava/transaction/prepare`, {
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
    const { data } = await api.post<CosmosTxHash>(`/v1/kava/transaction/broadcast`, {
      tx_serialized: signedTx.data.signed_tx_serialized,
    });
    return data;
  }

  /**
   * Get transaction status
   * @param txHash
   */
  async getTxStatus(txHash: string): Promise<CosmosTxStatus> {
    const { data } = await api.get<CosmosTxStatus>(`/v1/kava/transaction/status?tx_hash=${txHash}`);
    return data;
  }

  /**
   * Decode transaction
   * @param txSerialized transaction serialized
   */
  async decodeTx(txSerialized: string): Promise<DecodedTxRaw> {
    const { data } = await api.get<DecodedTxRaw>(`/v1/kava/transaction/decode?tx_serialized=${txSerialized}`);
    return data;
  }
}
