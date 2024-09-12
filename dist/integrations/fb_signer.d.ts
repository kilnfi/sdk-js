import { CreateTransactionResponse, FireblocksSDK, TransactionResponse } from "fireblocks-sdk";
import { EthTx } from "../types/eth";
import { MaticTx } from "../types/matic";
export type AssetId = "SOL_TEST" | "SOL" | "ETH_TEST5" | "ETH_TEST6" | "ETH" | "ATOM_COS_TEST" | "ATOM_COS" | "OSMO_TEST" | "OSMO" | "ADA_TEST" | "ADA" | "NEAR_TEST" | "NEAR" | "XTZ_TEST" | "XTZ" | "DOT" | "KSM" | "DV4TNT_TEST" | "DYDX_DYDX" | "CELESTIA" | "INJ_INJ" | "TON_TEST" | "TON" | "KAVA_KAVA";
export declare class FbSigner {
    protected fireblocks: FireblocksSDK;
    protected vaultId: number;
    constructor(fireblocks: FireblocksSDK, vaultId: number);
    /**
     * Wait for given transaction to be completed
     * @param fbTx fireblocks transaction
     * @private
     */
    protected waitForTxCompletion(fbTx: CreateTransactionResponse): Promise<TransactionResponse>;
    /**
     * Sign a transaction with fireblocks using Fireblocks raw message signing feature
     * @param payloadToSign transaction data in hexadecimal
     * @param assetId fireblocks asset id
     * @param note optional fireblocks custom note
     */
    sign(payloadToSign: any, assetId?: AssetId, note?: string): Promise<TransactionResponse>;
    /**
     * Sign an EIP-712 Ethereum typed message with fireblocks
     * @param eip712message eip712message to sign
     * @param assetId fireblocks asset id
     * @param note optional fireblocks custom note
     */
    signTypedMessage(eip712message: any, assetId: "ETH" | "ETH_TEST5" | "ETH_TEST6", note?: string): Promise<TransactionResponse>;
    /**
     * Sign and broadcast a transaction with fireblocks using Fireblocks contract call feature
     * @param payloadToSign transaction data in hexadecimal
     * @param assetId fireblocks asset id
     * @param note optional fireblocks custom note
     * @param tx Ethereum transaction
     * @param destinationId Fireblocks destination id, this corresponds to the Fireblocks whitelisted contract address id
     * @param sendAmount send the amount in tx to smart contract
     */
    signAndBroadcastWith(payloadToSign: any, assetId: AssetId, tx: EthTx | MaticTx, destinationId: string, sendAmount?: boolean, note?: string): Promise<TransactionResponse>;
}
