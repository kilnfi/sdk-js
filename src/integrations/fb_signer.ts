import {
  CreateTransactionResponse,
  FireblocksSDK,
  PeerType,
  TransactionArguments,
  TransactionOperation,
  TransactionResponse,
  TransactionStatus,
} from 'fireblocks-sdk';

import { utils } from 'ethers';
import { EthTx } from '../types/eth';

type AssetId =
  'SOL_TEST'
  | 'SOL'
  | 'ETH_TEST3'
  | 'ETH'
  | 'ATOM_COS_TEST'
  | 'ATOM_COS'
  | 'ADA_TEST'
  | 'ADA'
  | 'NEAR_TEST'
  | 'NEAR'
  | 'XTZ_TEST'
  | 'XTZ';

export class FbSigner {
  protected fireblocks: FireblocksSDK;
  protected vaultId: number;

  constructor(fireblocks: FireblocksSDK, vaultId: number) {
    this.fireblocks = fireblocks;
    this.vaultId = vaultId;
  };


  /**
   * Wait for given transaction to be completed
   * @param fbTx: fireblocks transaction
   * @private
   */
  protected async waitForTxCompletion(fbTx: CreateTransactionResponse): Promise<TransactionResponse> {
    try {
      let tx = fbTx;
      while (tx.status != TransactionStatus.COMPLETED) {
        if (tx.status == TransactionStatus.BLOCKED || tx.status == TransactionStatus.FAILED || tx.status == TransactionStatus.REJECTED || tx.status == TransactionStatus.CANCELLED) {
          throw Error(`Fireblocks signer: the transaction has been ${tx.status}`);
        }
        setTimeout(() => {
        }, 4000);
        tx = await this.fireblocks.getTransactionById(fbTx.id);
      }

      return (await this.fireblocks.getTransactionById(fbTx.id));
    } catch (err: any) {
      throw new Error('Fireblocks signer (waitForTxCompletion): ' + err);
    }
  }


  /**
   * Sign a transaction with fireblocks using Fireblocks raw message signing feature
   * @param payloadToSign: transaction data in hexadecimal
   * @param assetId: fireblocks asset id
   * @param note: optional fireblocks custom note
   */
  public async signWithFB(payloadToSign: any, assetId: AssetId, note?: string): Promise<TransactionResponse> {
    try {
      const tx: TransactionArguments = {
        assetId: assetId,
        operation: TransactionOperation.RAW,
        source: {
          type: PeerType.VAULT_ACCOUNT,
          id: this.vaultId.toString(),
        },
        note,
        extraParameters: payloadToSign,
      };
      const fbTx = await this.fireblocks.createTransaction(tx);
      return (await this.waitForTxCompletion(fbTx));
    } catch (err: any) {
      throw new Error('Fireblocks signer (signWithFB): ' + err);
    }
  }

  /**
   * Sign and broadcast a transaction with fireblocks using Fireblocks contract call feature
   * @param payloadToSign: transaction data in hexadecimal
   * @param assetId: fireblocks asset id
   * @param note: optional fireblocks custom note
   * @param ethTx Ethereum transaction
   * @param destinationId Fireblocks destination id, this corresponds to the Fireblocks whitelisted contract address id
   */
  public async signAndBroadcastWithFB(payloadToSign: any, assetId: AssetId, ethTx: EthTx, destinationId: string, note?: string): Promise<TransactionResponse> {
    try {
      const tx: TransactionArguments = {
        assetId: assetId,
        operation: TransactionOperation.CONTRACT_CALL,
        source: {
          type: PeerType.VAULT_ACCOUNT,
          id: this.vaultId.toString(),
        },
        destination: {
          type: PeerType.EXTERNAL_WALLET,
          id: destinationId,
        },
        amount: utils.formatEther(ethTx.data.amount_wei),
        note,
        extraParameters: payloadToSign,
        gasLimit: ethTx.data.gas_limit,
        priorityFee: utils.formatUnits(ethTx.data.max_priority_fee_per_gas_wei, 'gwei'),
        maxFee: utils.formatUnits(ethTx.data.max_fee_per_gas_wei, 'gwei'),
      };
      const fbTx = await this.fireblocks.createTransaction(tx);
      return (await this.waitForTxCompletion(fbTx));
    } catch (err: any) {
      throw new Error('Fireblocks signer (signAndBroadcastWithFB): ' + err);
    }
  }
}

