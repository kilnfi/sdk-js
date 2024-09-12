import { Service } from "./service";
import { ServiceProps } from "../types/service";
import { Integration } from "../types/integrations";
import { DecodedTxRaw } from "@cosmjs/proto-signing";
import { Balance, CosmosSignedTx, CosmosTx, CosmosTxHash, CosmosTxStatus } from "../types/cosmos";
export declare class NobleService extends Service {
    constructor({ testnet }: ServiceProps);
    usdcToUusdc(amountUsdc: string): string;
    /**
     * Get balance of given address for given denom (uusdc on NOBLE)
     * @param address
     * @param denom
     */
    getBalance(address: string, denom: string): Promise<Balance>;
    /**
     * Burn noble USDC to it can be minted on Ethereum
     * @param pubkey
     * @param recipient
     * @param amountUsdc
     */
    craftBurnUsdc(pubkey: string, recipient: string, amountUsdc: number): Promise<CosmosTx>;
    /**
     * Transfer IBC USDC from your account to an OSMO account
     * @param pubkey
     * @param recipient
     * @param amountUsdc
     */
    craftOsmoIbcTransfer(pubkey: string, recipient: string, amountUsdc: number): Promise<CosmosTx>;
    /**
     * Sign transaction with given integration
     * @param integration custody solution to sign with
     * @param tx raw transaction
     * @param note note to identify the transaction in your custody solution
     */
    sign(integration: Integration, tx: CosmosTx, note?: string): Promise<CosmosSignedTx>;
    /**
     * Broadcast transaction to the network
     * @param signedTx
     */
    broadcast(signedTx: CosmosSignedTx): Promise<CosmosTxHash>;
    /**
     * Get transaction status
     * @param txHash
     */
    getTxStatus(txHash: string): Promise<CosmosTxStatus>;
    /**
     * Decode transaction
     * @param txSerialized transaction serialized
     */
    decodeTx(txSerialized: string): Promise<DecodedTxRaw>;
}
