import { Service } from './service';

import { ServiceProps } from '../types/service';
import { Integration } from '../types/integrations';
import api from '../api';
import { DecodedTxRaw } from "@cosmjs/proto-signing";
import { CosmosSignedTx, CosmosTx, CosmosTxHash, CosmosTxStatus } from "../types/cosmos";

export class DydxService extends Service {

  constructor({ testnet }: ServiceProps) {
    super({ testnet });
  }

  /**
   * Convert DYDX to ADYDX
   * @param amountDydx
   */
  dydxToAdydx(amountDydx: string): string {
    return (parseFloat(amountDydx) * 10 ** 18).toFixed();
  }

  /**
   * Craft dydx staking transaction
   * @param accountId id of the kiln account to use for the stake transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAddress validator address to delegate to
   * @param amountDydx how many tokens to stake in DYDX
   */
  async craftStakeTx(
    accountId: string,
    pubkey: string,
    validatorAddress: string,
    amountDydx: number,
  ): Promise<CosmosTx> {

    const { data } = await api.post<CosmosTx>(
      `/v1/dydx/transaction/stake`,
      {
        account_id: accountId,
        pubkey: pubkey,
        validator: validatorAddress,
        amount_adydx: this.dydxToAdydx(amountDydx.toString()),
      });
    return data;
    
  }

  /**
   * Craft dydx withdraw rewards transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAddress validator address to which the delegation has been made
   */
  async craftWithdrawRewardsTx(
    pubkey: string,
    validatorAddress: string,
  ): Promise<CosmosTx> {

    const { data } = await api.post<CosmosTx>(
      `/v1/dydx/transaction/withdraw-rewards`,
      {
        pubkey: pubkey,
        validator: validatorAddress,
      });
    return data;
    
  }

  /**
   * Craft dydx unstaking transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAddress validator address to which the delegation has been made
   * @param amountDydx how many tokens to undelegate in DYDX
   */
  async craftUnstakeTx(
    pubkey: string,
    validatorAddress: string,
    amountDydx?: number,
  ): Promise<CosmosTx> {

    const { data } = await api.post<CosmosTx>(
      `/v1/dydx/transaction/unstake`,
      {
        pubkey: pubkey,
        validator: validatorAddress,
        amount_adydx: amountDydx ? this.dydxToAdydx(amountDydx.toString()) : undefined,
      });
    return data;
    
  }

  /**
   * Craft dydx redelegate transaction
   * @param accountId id of the kiln account to use for the new stake
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorSourceAddress validator address of the current delegation
   * @param validatorDestinationAddress validator address to which the delegation will be moved
   * @param amountDydx how many tokens to redelegate in DYDX
   */
  async craftRedelegateTx(
    accountId: string,
    pubkey: string,
    validatorSourceAddress: string,
    validatorDestinationAddress: string,
    amountDydx?: number,
  ): Promise<CosmosTx> {

    const { data } = await api.post<CosmosTx>(
      `/v1/dydx/transaction/redelegate`,
      {
        account_id: accountId,
        pubkey: pubkey,
        validator_source: validatorSourceAddress,
        validator_destination: validatorDestinationAddress,
        amount_adydx: amountDydx ? this.dydxToAdydx(amountDydx.toString()) : undefined,
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
            'content': tx.data.unsigned_tx_hash,
          },
        ],
      },
    };
    const fbNote = note ? note : 'DYDX tx from @kilnfi/sdk';
    const signer = this.getFbSigner(integration);
    const fbTx = await signer.signWithFB(payload, this.testnet ? 'DV4TNT_TEST' : 'DYDX_DYDX', fbNote);
    const signature: string = fbTx.signedMessages![0].signature.fullSig;
    const { data } = await api.post<CosmosSignedTx>(
      `/v1/dydx/transaction/prepare`,
      {
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

    const { data } = await api.post<CosmosTxHash>(
      `/v1/dydx/transaction/broadcast`,
      {
        tx_serialized: signedTx.data.signed_tx_serialized,
      });
    return data;

  }

  /**
   * Get transaction status
   * @param txHash
   */
  async getTxStatus(txHash: string): Promise<CosmosTxStatus> {

    const { data } = await api.get<CosmosTxStatus>(
      `/v1/dydx/transaction/status?tx_hash=${txHash}`);
    return data;

  }

  /**
   * Decode transaction
   * @param txSerialized transaction serialized
   */
  async decodeTx(txSerialized: string): Promise<DecodedTxRaw> {

    const { data } = await api.get<DecodedTxRaw>(
      `/v1/dydx/transaction/decode?tx_serialized=${txSerialized}`);
    return data;

  }
}
