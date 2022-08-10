import {
  FireblocksSDK,
  PeerType,
  TransactionOperation,
  TransactionStatus,
  CreateTransactionResponse,
  TransactionResponse,
} from "fireblocks-sdk";

type AssetId = 'SOL_TEST' | 'SOL';

export class FbSigner {
  constructor(
    private fireblocks: FireblocksSDK,
    private vaultAccountId: string,
  ){};


  /**
   * Wait for given transaction to be completed
   * @param fbTx: fireblocks transaction
   * @private
   */
  private async waitForTxCompletion(fbTx: CreateTransactionResponse): Promise<TransactionResponse>{

    let tx = fbTx;
    while (tx.status != TransactionStatus.COMPLETED) {
      if(tx.status == TransactionStatus.BLOCKED || tx.status == TransactionStatus.FAILED || tx.status == TransactionStatus.REJECTED || tx.status == TransactionStatus.CANCELLED){
        throw Error("Exiting the operation");
      }
      setTimeout(() => { }, 4000);
      tx = await this.fireblocks.getTransactionById(fbTx.id);
    }

    return (await this.fireblocks.getTransactionById(fbTx.id));
  }


  /**
   * Sign a transaction with fireblocks
   * @param payloadToSign: transaction data in hexadecimal
   * @param assetId: fireblocks asset id
   * @param note: fireblocks custom note
   */
  public async signWithFB(payloadToSign: any, assetId: AssetId, note?: string){
    const fbTx = await this.fireblocks.createTransaction(
      {
        assetId: assetId,
        operation: TransactionOperation.RAW,
        source: {
          type: PeerType.VAULT_ACCOUNT,
          id: String(this.vaultAccountId)
        },
        note,
        extraParameters: {
          rawMessageData: {
            messages: payloadToSign
          }
        }

      }
    );
    return (await this.waitForTxCompletion(fbTx));
  }
}

