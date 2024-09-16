import {
  CreateTransactionResponse,
  FireblocksSDK,
  PeerType,
  TransactionArguments,
  TransactionOperation,
  TransactionResponse,
  TransactionStatus,
} from "fireblocks-sdk";

import { formatUnits, formatEther } from "viem";
import { components } from "../openapi/schema";

export type AssetId =
  | "SOL_TEST"
  | "SOL"
  | "ETH_TEST5"
  | "ETH_TEST6"
  | "ETH"
  | "ATOM_COS_TEST"
  | "ATOM_COS"
  | "OSMO_TEST"
  | "OSMO"
  | "ADA_TEST"
  | "ADA"
  | "NEAR_TEST"
  | "NEAR"
  | "XTZ_TEST"
  | "XTZ"
  | "DOT"
  | "KSM"
  | "DV4TNT_TEST"
  | "DYDX_DYDX"
  | "CELESTIA"
  | "INJ_INJ"
  | "TON_TEST"
  | "TON"
  | "KAVA_KAVA";

export class FbSigner {
  protected fireblocks: FireblocksSDK;
  protected vaultId: number;

  constructor(fireblocks: FireblocksSDK, vaultId: number) {
    this.fireblocks = fireblocks;
    this.vaultId = vaultId;
  }

  /**
   * Wait for given transaction to be completed
   * @param fbTx fireblocks transaction
   * @private
   */
  protected async waitForTxCompletion(fbTx: CreateTransactionResponse): Promise<TransactionResponse> {
    try {
      let tx = fbTx;
      while (tx.status != TransactionStatus.COMPLETED) {
        if (
          tx.status == TransactionStatus.BLOCKED ||
          tx.status == TransactionStatus.FAILED ||
          tx.status == TransactionStatus.CANCELLED
        ) {
          throw Error(`Fireblocks signer: the transaction has been ${tx.status}`);
        } else if (tx.status == TransactionStatus.REJECTED) {
          throw Error(
            `Fireblocks signer: the transaction has been rejected, make sure that the TAP security policy is not blocking the transaction`,
          );
        }
        tx = await this.fireblocks.getTransactionById(fbTx.id);
      }

      return await this.fireblocks.getTransactionById(fbTx.id);
    } catch (err: any) {
      throw new Error("Fireblocks signer (waitForTxCompletion): " + err);
    }
  }

  /**
   * Sign a transaction with fireblocks using Fireblocks raw message signing feature
   * @param payloadToSign transaction data in hexadecimal
   * @param assetId fireblocks asset id
   * @param note optional fireblocks custom note
   */
  public async sign(payloadToSign: any, assetId?: AssetId, note?: string): Promise<TransactionResponse> {
    try {
      const assetArgs = assetId
        ? {
            assetId,
            source: {
              type: PeerType.VAULT_ACCOUNT,
              id: this.vaultId.toString(),
            },
          }
        : {};

      const tx: TransactionArguments = {
        ...assetArgs,
        operation: TransactionOperation.RAW,
        note,
        extraParameters: payloadToSign,
      };
      const fbTx = await this.fireblocks.createTransaction(tx);
      return await this.waitForTxCompletion(fbTx);
    } catch (err: any) {
      console.log(err);
      throw new Error("Fireblocks signer (signWithFB): " + err);
    }
  }

  /**
   * Sign an EIP-712 Ethereum typed message with fireblocks
   * @param eip712message eip712message to sign
   * @param assetId fireblocks asset id
   * @param note optional fireblocks custom note
   */
  public async signTypedMessage(
    eip712message: any,
    assetId: "ETH" | "ETH_TEST5" | "ETH_TEST6",
    note?: string,
  ): Promise<TransactionResponse> {
    try {
      const tx: TransactionArguments = {
        assetId: assetId,
        operation: TransactionOperation.TYPED_MESSAGE,
        source: {
          type: PeerType.VAULT_ACCOUNT,
          id: this.vaultId.toString(),
        },
        note,
        extraParameters: {
          rawMessageData: {
            messages: [
              {
                content: eip712message,
                type: "EIP712",
              },
            ],
          },
        },
      };
      const fbTx = await this.fireblocks.createTransaction(tx);
      return await this.waitForTxCompletion(fbTx);
    } catch (err: any) {
      console.log(err);
      throw new Error("Fireblocks signer (signWithFB): " + err);
    }
  }

  /**
   * Sign and broadcast a transaction with fireblocks using Fireblocks contract call feature
   * @param payloadToSign transaction data in hexadecimal
   * @param assetId fireblocks asset id
   * @param note optional fireblocks custom note
   * @param tx Ethereum transaction
   * @param destinationId Fireblocks destination id, this corresponds to the Fireblocks whitelisted contract address id
   * @param sendAmount send the amount in tx to smart contract
   */
  public async signAndBroadcastWith(
    payloadToSign: any,
    assetId: AssetId,
    tx: components["schemas"]["ETHUnsignedTx"] | components["schemas"]["POLUnsignedTx"],
    destinationId: string,
    sendAmount: boolean = true,
    note?: string,
  ): Promise<TransactionResponse> {
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
        amount: tx.amount_wei && sendAmount ? formatEther(tx.amount_wei, "wei") : "0",
        note,
        extraParameters: payloadToSign,
        gasLimit: tx.gas_limit,
        priorityFee: formatUnits(tx.max_priority_fee_per_gas_wei, 9),
        maxFee: formatUnits(tx.max_fee_per_gas_wei, 9),
      };
      const fbTx = await this.fireblocks.createTransaction(txArgs);
      return await this.waitForTxCompletion(fbTx);
    } catch (err: any) {
      throw new Error("Fireblocks signer (signAndBroadcastWithFB): " + err);
    }
  }
}
