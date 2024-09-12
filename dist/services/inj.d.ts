import { Service } from "./service";
import { ServiceProps } from "../types/service";
import { Integration } from "../types/integrations";
import { DecodedTxRaw } from "@cosmjs/proto-signing";
import { CosmosSignedTx, CosmosTx, CosmosTxHash, CosmosTxStatus } from "../types/cosmos";
export declare class InjService extends Service {
    constructor({ testnet }: ServiceProps);
    /**
     * Convert INJ to inj
     * @param amount
     */
    injToAinj(amount: string): string;
    /**
     * Craft inj staking transaction
     * @param accountId id of the kiln account to use for the stake transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to delegate to
     * @param amountInj how many tokens to stake in INJ
     * @param restakeRewards If enabled, the rewards will be automatically restaked
     * @param granteeAddress validator grantee address
     */
    craftStakeTx(accountId: string, pubkey: string, validatorAddress: string, amountInj: number, restakeRewards?: boolean, granteeAddress?: string): Promise<CosmosTx>;
    /**
     * Craft inj withdraw rewards transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to which the delegation has been made
     */
    craftWithdrawRewardsTx(pubkey: string, validatorAddress: string): Promise<CosmosTx>;
    /**
     * Craft inj restake rewards transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to which the delegation has been made
     * @param granteeAddress validator grantee address
     */
    craftRestakeRewardsTx(pubkey: string, validatorAddress: string, granteeAddress: string): Promise<CosmosTx>;
    /**
     * Craft inj unstaking transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to which the delegation has been made
     * @param amountInj how many tokens to undelegate in INJ
     */
    craftUnstakeTx(pubkey: string, validatorAddress: string, amountInj?: number): Promise<CosmosTx>;
    /**
     * Craft inj redelegate transaction
     * @param accountId id of the kiln account to use for the new stake
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorSourceAddress validator address of the current delegation
     * @param validatorDestinationAddress validator address to which the delegation will be moved
     * @param amountInj how many tokens to redelegate in INJ
     */
    craftRedelegateTx(accountId: string, pubkey: string, validatorSourceAddress: string, validatorDestinationAddress: string, amountInj?: number): Promise<CosmosTx>;
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
