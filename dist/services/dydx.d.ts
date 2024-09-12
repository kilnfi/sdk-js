import { Service } from "./service";
import { ServiceProps } from "../types/service";
import { Integration } from "../types/integrations";
import { DecodedTxRaw } from "@cosmjs/proto-signing";
import { Balance, CosmosSignedTx, CosmosTx, CosmosTxHash, CosmosTxStatus } from "../types/cosmos";
export declare class DydxService extends Service {
    constructor({ testnet }: ServiceProps);
    /**
     * Convert DYDX to ADYDX
     * @param amountDydx
     */
    dydxToAdydx(amountDydx: string): string;
    usdcToUusdc(amountUsdc: string): string;
    /**
     * Craft dydx staking transaction
     * @param accountId id of the kiln account to use for the stake transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to delegate to
     * @param amountDydx how many tokens to stake in DYDX
     */
    craftStakeTx(accountId: string, pubkey: string, validatorAddress: string, amountDydx: number): Promise<CosmosTx>;
    /**
     * Craft dydx withdraw rewards transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to which the delegation has been made
     */
    craftWithdrawRewardsTx(pubkey: string, validatorAddress: string): Promise<CosmosTx>;
    /**
     * Craft dydx unstaking transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to which the delegation has been made
     * @param amountDydx how many tokens to undelegate in DYDX
     */
    craftUnstakeTx(pubkey: string, validatorAddress: string, amountDydx?: number): Promise<CosmosTx>;
    /**
     * Craft dydx redelegate transaction
     * @param accountId id of the kiln account to use for the new stake
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorSourceAddress validator address of the current delegation
     * @param validatorDestinationAddress validator address to which the delegation will be moved
     * @param amountDydx how many tokens to redelegate in DYDX
     */
    craftRedelegateTx(accountId: string, pubkey: string, validatorSourceAddress: string, validatorDestinationAddress: string, amountDydx?: number): Promise<CosmosTx>;
    /**
     * Transfer IBC USDC from your account to your NOBLE account
     * @param pubkey
     * @param amountUsdc
     */
    craftNobleIbcTransfer(pubkey: string, amountUsdc: number): Promise<CosmosTx>;
    /**
     * Get balance of given address for given denom (ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5 for USDC on DYDX)
     * @param address
     * @param denom
     */
    getBalance(address: string, denom: string): Promise<Balance>;
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
