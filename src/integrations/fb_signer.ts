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
import { MaticTx } from "../types/matic";

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
   * @param tx Ethereum transaction
   * @param destinationId Fireblocks destination id, this corresponds to the Fireblocks whitelisted contract address id
   * @param sendAmount send the amount in tx to smart contract
   */
  public async signAndBroadcastWithFB(payloadToSign: any, assetId: AssetId, tx: EthTx | MaticTx, destinationId: string, sendAmount: boolean = true, note?: string): Promise<TransactionResponse> {
    try {
      const txArgs: TransactionArguments = {
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
        amount: tx.data.amount_wei && sendAmount ? utils.formatEther(tx.data.amount_wei) : "0",
        note,
        extraParameters: payloadToSign,
        gasLimit: tx.data.gas_limit,
        priorityFee: utils.formatUnits(tx.data.max_priority_fee_per_gas_wei, 'gwei'),
        maxFee: utils.formatUnits(tx.data.max_fee_per_gas_wei, 'gwei'),
      };
      const fbTx = await this.fireblocks.createTransaction(txArgs);
      return (await this.waitForTxCompletion(fbTx));
    } catch (err: any) {
      throw new Error('Fireblocks signer (signAndBroadcastWithFB): ' + err);
    }
  }
}

