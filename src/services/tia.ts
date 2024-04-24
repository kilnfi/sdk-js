import { Service } from "./service";

import { ServiceProps } from "../types/service";
import { Integration } from "../types/integrations";
import api from "../api";
import { DecodedTxRaw } from "@cosmjs/proto-signing";
import { CosmosSignedTx, CosmosTx, CosmosTxHash, CosmosTxStatus } from "../types/cosmos";
import { parseUnits } from "viem";

export class TiaService extends Service {
  constructor({ testnet }: ServiceProps) {
    super({ testnet });
  }

  /**
   * Convert TIA to uTIA
   * @param amountTia
   */
  tiaToUtia(amountTia: string): string {
    return parseUnits(amountTia, 6).toString();
  }

  /**
   * Craft tia staking transaction
   * @param accountId id of the kiln account to use for the stake transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAddress validator address to delegate to
   * @param amountTia how many tokens to stake in TIA
   * @param restakeRewards If enabled, the rewards will be automatically restaked
   */
  async craftStakeTx(
    accountId: string,
    pubkey: string,
    validatorAddress: string,
    amountTia: number,
    restakeRewards: boolean = false,
  ): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/tia/transaction/stake`, {
      account_id: accountId,
      pubkey: pubkey,
      validator: validatorAddress,
      amount_utia: this.tiaToUtia(amountTia.toString()),
      restake_rewards: restakeRewards,
    });
    return data;
  }

  /**
   * Craft tia withdraw rewards transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAddress validator address to which the delegation has been made
   */
  async craftWithdrawRewardsTx(pubkey: string, validatorAddress: string): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/tia/transaction/withdraw-rewards`, {
      pubkey: pubkey,
      validator: validatorAddress,
    });
    return data;
  }

  /**
   * Craft tia restake rewards transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAccount validator account address (wallet controlling the validator)
   * @param validatorAddress validator address to which the delegation has been made
   */
  async craftRestakeRewardsTx(pubkey: string, validatorAddress: string): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/tia/transaction/restake-rewards`, {
      pubkey: pubkey,
      validator_address: validatorAddress,
    });
    return data;
  }

  /**
   * Craft tia unstaking transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAddress validator address to which the delegation has been made
   * @param amountTia how many tokens to undelegate in TIA
   */
  async craftUnstakeTx(pubkey: string, validatorAddress: string, amountTia?: number): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/tia/transaction/unstake`, {
      pubkey: pubkey,
      validator: validatorAddress,
      amount_utia: amountTia ? this.tiaToUtia(amountTia.toString()) : undefined,
    });
    return data;
  }

  /**
   * Craft tia redelegate transaction
   * @param accountId id of the kiln account to use for the new stake
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorSourceAddress validator address of the current delegation
   * @param validatorDestinationAddress validator address to which the delegation will be moved
   * @param amountTia how many tokens to redelegate in TIA
   */
  async craftRedelegateTx(
    accountId: string,
    pubkey: string,
    validatorSourceAddress: string,
    validatorDestinationAddress: string,
    amountTia?: number,
  ): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/tia/transaction/redelegate`, {
      account_id: accountId,
      pubkey: pubkey,
      validator_source: validatorSourceAddress,
      validator_destination: validatorDestinationAddress,
      amount_utia: amountTia ? this.tiaToUtia(amountTia.toString()) : undefined,
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
    const fbNote = note ? note : "TIA tx from @kilnfi/sdk";
    const signer = this.getFbSigner(integration);
    const fbTx = await signer.sign(payload, "CELESTIA", fbNote);
    const signature: string = fbTx.signedMessages![0].signature.fullSig;
    const { data } = await api.post<CosmosSignedTx>(`/v1/tia/transaction/prepare`, {
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
    const { data } = await api.post<CosmosTxHash>(`/v1/tia/transaction/broadcast`, {
      tx_serialized: signedTx.data.signed_tx_serialized,
    });
    return data;
  }

  /**
   * Get transaction status
   * @param txHash
   */
  async getTxStatus(txHash: string): Promise<CosmosTxStatus> {
    const { data } = await api.get<CosmosTxStatus>(`/v1/tia/transaction/status?tx_hash=${txHash}`);
    return data;
  }

  /**
   * Decode transaction
   * @param txSerialized transaction serialized
   */
  async decodeTx(txSerialized: string): Promise<DecodedTxRaw> {
    const { data } = await api.get<DecodedTxRaw>(`/v1/tia/transaction/decode?tx_serialized=${txSerialized}`);
    return data;
  }
}
