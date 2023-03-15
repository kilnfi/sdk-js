import {
  FireblocksSDK,
  PeerType,
  TransactionOperation,
  TransactionStatus,
  CreateTransactionResponse,
  TransactionResponse,
} from "fireblocks-sdk";

type AssetId = 'SOL_TEST' | 'SOL' | 'ETH_TEST3' | 'ETH' | 'ATOM_COS_TEST' | 'ATOM_COS' | 'ADA_TEST' | 'ADA' | 'NEAR_TEST' | 'NEAR' | 'XTZ_TEST' | 'XTZ';

export class FbSigner {
  protected fireblocks: FireblocksSDK;
  protected vaultId: number;

  constructor(fireblocks: FireblocksSDK, vaultId: number){
    this.fireblocks = fireblocks;
    this.vaultId = vaultId;
  };


  /**
   * Wait for given transaction to be completed
   * @param fbTx: fireblocks transaction
   * @private
   */
  protected async waitForTxCompletion(fbTx: CreateTransactionResponse): Promise<TransactionResponse>{
    try {
      let tx = fbTx;
      while (tx.status != TransactionStatus.COMPLETED) {
        if(tx.status == TransactionStatus.BLOCKED || tx.status == TransactionStatus.FAILED || tx.status == TransactionStatus.REJECTED || tx.status == TransactionStatus.CANCELLED){
          throw Error("Exiting the operation");
        }
        setTimeout(() => { }, 4000);
        tx = await this.fireblocks.getTransactionById(fbTx.id);
      }

      return (await this.fireblocks.getTransactionById(fbTx.id));
    } catch (err: any) {
      throw new Error('waitForTxCompletion: ' + err);
    }
  }


  /**
   * Sign a transaction with fireblocks
   * @param payloadToSign: transaction data in hexadecimal
   * @param assetId: fireblocks asset id
   * @param note: fireblocks custom note
   */
  public async signWithFB(payloadToSign: any, assetId: AssetId, note?: string): Promise<TransactionResponse>{
    try {
      const fbTx = await this.fireblocks.createTransaction(
        {
          assetId: assetId,
          operation: TransactionOperation.RAW,
          source: {
            type: PeerType.VAULT_ACCOUNT,
            id: this.vaultId.toString()
          },
          note,
          extraParameters: payloadToSign,
        }
      );
      return (await this.waitForTxCompletion(fbTx));
    } catch (err: any){
      throw new Error('signWithFB: ' + err);
    }
  }
}

