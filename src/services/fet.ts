import { Service } from "./service";

import { ServiceProps } from "../types/service";
import { Integration } from "../types/integrations";
import api from "../api";
import { DecodedTxRaw } from "@cosmjs/proto-signing";
import { CosmosSignedTx, CosmosTx, CosmosTxHash, CosmosTxStatus } from "../types/cosmos";
import { SigningAlgorithm } from "fireblocks-sdk";
import { parseUnits } from "viem";

export class FetService extends Service {
  constructor({ testnet }: ServiceProps) {
    super({ testnet });
  }

  /**
   * Convert FET to aFET
   * @param amountFet
   */
  fetToAfet(amountFet: string): string {
    return parseUnits(amountFet, 18).toString();
  }

  /**
   * Craft fetch.ai staking transaction
   * @param accountId id of the kiln account to use for the stake transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAddress validator address to delegate to
   * @param amountFet how many tokens to stake in FET
   * @param restakeRewards If enabled, the rewards will be automatically restaked
   * @param granteeAddress validator grantee address
   */
  async craftStakeTx(
    accountId: string,
    pubkey: string,
    validatorAddress: string,
    amountFet: number,
    restakeRewards: boolean = false,
    granteeAddress?: string,
  ): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/fet/transaction/stake`, {
      account_id: accountId,
      pubkey: pubkey,
      validator: validatorAddress,
      amount_afet: this.fetToAfet(amountFet.toString()),
      restake_rewards: restakeRewards,
      grantee_address: granteeAddress,
    });
    return data;
  }

  /**
   * Craft fetch.ai withdraw rewards transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAddress validator address to which the delegation has been made
   */
  async craftWithdrawRewardsTx(pubkey: string, validatorAddress: string): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/fet/transaction/withdraw-rewards`, {
      pubkey: pubkey,
      validator: validatorAddress,
    });
    return data;
  }

  /**
   * Craft fetch.ai restake rewards transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAddress validator address to which the delegation has been made
   * @param granteeAddress validator grantee address
   */
  async craftRestakeRewardsTx(pubkey: string, validatorAddress: string, granteeAddress: string): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/fet/transaction/restake-rewards`, {
      pubkey: pubkey,
      validator_address: validatorAddress,
      grantee_address: granteeAddress,
    });
    return data;
  }

  /**
   * Craft fetch.ai unstaking transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAddress validator address to which the delegation has been made
   * @param amountFet how many tokens to undelegate in FET
   */
  async craftUnstakeTx(pubkey: string, validatorAddress: string, amountFet?: number): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/fet/transaction/unstake`, {
      pubkey: pubkey,
      validator: validatorAddress,
      amount_afet: amountFet ? this.fetToAfet(amountFet.toString()) : undefined,
    });
    return data;
  }

  /**
   * Craft fetch.ai redelegate transaction
   * @param accountId id of the kiln account to use for the new stake
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorSourceAddress validator address of the current delegation
   * @param validatorDestinationAddress validator address to which the delegation will be moved
   * @param amountFet how many tokens to redelegate in FET
   */
  async craftRedelegateTx(
    accountId: string,
    pubkey: string,
    validatorSourceAddress: string,
    validatorDestinationAddress: string,
    amountFet?: number,
  ): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/fet/transaction/redelegate`, {
      account_id: accountId,
      pubkey: pubkey,
      validator_source: validatorSourceAddress,
      validator_destination: validatorDestinationAddress,
      amount_afet: amountFet ? this.fetToAfet(amountFet.toString()) : undefined,
    });
    return data;
  }

  /**
   * Craft fetch.ai send transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param to recipient address
   * @param amountFet how many tokens to send in FET
   */
  async craftSendTx(pubkey: string, to: string, amountFet: number): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/fet/transaction/send`, {
      pubkey: pubkey,
      amount_afet: this.fetToAfet(amountFet.toString()),
      to: to,
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
    const fbNote = note ? note : "FET tx from @kilnfi/sdk";
    const signer = this.getFbSigner(integration);
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.data.unsigned_tx_hash,
            derivationPath: [44, 118, integration.vaultId, 0, 0],
          },
        ],
        algorithm: SigningAlgorithm.MPC_ECDSA_SECP256K1,
      },
    };
    const fbTx = await signer.sign(payload, undefined, fbNote);
    const signature: string = fbTx.signedMessages![0].signature.fullSig;
    const { data } = await api.post<CosmosSignedTx>(`/v1/fet/transaction/prepare`, {
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
    const { data } = await api.post<CosmosTxHash>(`/v1/fet/transaction/broadcast`, {
      tx_serialized: signedTx.data.signed_tx_serialized,
    });
    return data;
  }

  /**
   * Get transaction status
   * @param txHash
   */
  async getTxStatus(txHash: string): Promise<CosmosTxStatus> {
    const { data } = await api.get<CosmosTxStatus>(`/v1/fet/transaction/status?tx_hash=${txHash}`);
    return data;
  }

  /**
   * Decode transaction
   * @param txSerialized transaction serialized
   */
  async decodeTx(txSerialized: string): Promise<DecodedTxRaw> {
    const { data } = await api.get<DecodedTxRaw>(`/v1/fet/transaction/decode?tx_serialized=${txSerialized}`);
    return data;
  }
}
