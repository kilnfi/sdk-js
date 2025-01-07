import type {
  CreateTransactionResponse,
  Fireblocks,
  TransactionRequest,
  TransactionResponse,
} from '@fireblocks/ts-sdk';
import { formatEther, formatUnits } from 'viem';
import type { components } from './openapi/schema.js';

/**
 * Fireblocks asset id
 * ref: https://github.com/fireblocks/fireblocks-web3-provider/blob/main/src/constants.ts
 */
export type FireblocksAssetId =
  | 'SOL_TEST'
  | 'SOL'
  | 'ETH_TEST5'
  | 'ETH_TEST6'
  | 'ETH'
  | 'ATOM_COS'
  | 'OSMO_TEST'
  | 'OSMO'
  | 'ADA_TEST'
  | 'ADA'
  | 'NEAR_TEST'
  | 'NEAR'
  | 'XTZ_TEST'
  | 'XTZ'
  | 'DOT'
  | 'KSM'
  | 'DV4TNT_TEST'
  | 'DYDX_DYDX'
  | 'CELESTIA'
  | 'INJ_INJ'
  | 'TON_TEST'
  | 'TON'
  | 'KAVA_KAVA'
  | 'TRX'
  | 'BTC';

export class FireblocksSigner {
  constructor(
    protected fireblocks: Fireblocks,
    protected vaultId: `${number}`,
  ) {}

  /**
   * Wait for given transaction to be completed
   * @param fbTx fireblocks transaction
   */
  protected async waitForTxCompletion(fbTx: CreateTransactionResponse): Promise<TransactionResponse> {
    try {
      let tx = fbTx;
      while (tx.status !== 'COMPLETED') {
        if (tx.status === 'BLOCKED' || tx.status === 'FAILED' || tx.status === 'CANCELLED') {
          throw Error(`Fireblocks signer: the transaction has been ${tx.status}`);
        }
        if (tx.status === 'REJECTED') {
          throw Error(
            'Fireblocks signer: the transaction has been rejected, make sure that the TAP security policy is not blocking the transaction',
          );
        }
        tx = (await this.fireblocks.transactions.getTransaction({ txId: fbTx.id as string })).data;
      }

      return tx;
    } catch (err) {
      throw new Error(`Fireblocks signer (waitForTxCompletion): ${err}`);
    }
  }

  /**
   * Sign a transaction with fireblocks using Fireblocks raw message signing feature
   * @param payloadToSign transaction data in hexadecimal
   * @param assetId fireblocks asset id
   * @param note optional fireblocks custom note
   */
  public async sign(payloadToSign: object, assetId?: FireblocksAssetId, note = ''): Promise<TransactionResponse> {
    try {
      const assetArgs = assetId
        ? ({
            assetId,
            source: {
              type: 'VAULT_ACCOUNT',
              id: this.vaultId,
            },
          } satisfies Partial<TransactionRequest>)
        : undefined;

      const tx: TransactionRequest = {
        ...assetArgs,
        operation: 'RAW',
        note,
        extraParameters: payloadToSign,
      };
      const fbTx = (await this.fireblocks.transactions.createTransaction({ transactionRequest: tx })).data;
      return await this.waitForTxCompletion(fbTx);
    } catch (err) {
      throw new Error(`Fireblocks signer (signWithFB): ${err}`);
    }
  }

  /**
   * Sign an EIP-712 Ethereum typed message with fireblocks
   * @param eip712message eip712message to sign
   * @param assetId fireblocks asset id
   * @param note optional fireblocks custom note
   */
  public async signTypedMessage(
    eip712message: object,
    assetId: 'ETH' | 'ETH_TEST5' | 'ETH_TEST6',
    note = '',
  ): Promise<TransactionResponse> {
    try {
      const tx: TransactionRequest = {
        assetId: assetId,
        operation: 'TYPED_MESSAGE',
        source: {
          type: 'VAULT_ACCOUNT',
          id: this.vaultId,
        },
        note,
        extraParameters: {
          rawMessageData: {
            messages: [
              {
                content: eip712message,
                type: 'EIP712',
              },
            ],
          },
        },
      };
      const fbTx = (await this.fireblocks.transactions.createTransaction({ transactionRequest: tx })).data;
      return await this.waitForTxCompletion(fbTx);
    } catch (err) {
      throw new Error(`Fireblocks signer (signWithFB): ${err}`);
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
    payloadToSign: object,
    assetId: FireblocksAssetId,
    tx: components['schemas']['ETHUnsignedTx'] | components['schemas']['POLUnsignedTx'],
    destinationId: string,
    sendAmount = true,
    note = '',
  ): Promise<TransactionResponse> {
    try {
      const txArgs: TransactionRequest = {
        assetId: assetId,
        operation: 'CONTRACT_CALL',
        source: {
          type: 'VAULT_ACCOUNT',
          id: this.vaultId,
        },
        destination: {
          type: 'EXTERNAL_WALLET',
          id: destinationId,
        },
        amount: tx.amount_wei && sendAmount ? formatEther(BigInt(tx.amount_wei), 'wei') : '0',
        note,
        extraParameters: payloadToSign,
        gasLimit: tx.gas_limit,
        priorityFee: formatUnits(BigInt(tx.max_priority_fee_per_gas_wei), 9),
        maxFee: formatUnits(BigInt(tx.max_fee_per_gas_wei), 9),
      };
      const fbTx = (await this.fireblocks.transactions.createTransaction({ transactionRequest: txArgs })).data;
      return await this.waitForTxCompletion(fbTx);
    } catch (err) {
      throw new Error(`Fireblocks signer (signAndBroadcastWithFB): ${err}`);
    }
  }
}
