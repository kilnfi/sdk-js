import { Service } from "./service";
import { OsmoRewards, OsmoStakes } from "../types/osmo";
import { ServiceProps } from "../types/service";
import { Integration } from "../types/integrations";
import { DecodedTxRaw } from "@cosmjs/proto-signing";
import { CosmosSignedTx, CosmosTx, CosmosTxHash, CosmosTxStatus } from "../types/cosmos";
export declare class OsmoService extends Service {
    constructor({ testnet }: ServiceProps);
    /**
     * Convert OSMO to UOSMO
     * @param amountOsmo
     */
    osmoToUosmo(amountOsmo: string): string;
    /**
     * Craft osmo staking transaction
     * @param accountId id of the kiln account to use for the stake transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to delegate to
     * @param amountOsmo how many tokens to stake in OSMO
     * @param restakeRewards If enabled, the rewards will be automatically restaked
     * @param granteeAddress validator grantee address
     */
    craftStakeTx(accountId: string, pubkey: string, validatorAddress: string, amountOsmo: number, restakeRewards?: boolean, granteeAddress?: string): Promise<CosmosTx>;
    /**
     * Craft osmo withdraw rewards transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to which the delegation has been made
     */
    craftWithdrawRewardsTx(pubkey: string, validatorAddress: string): Promise<CosmosTx>;
    /**
     * Craft osmo restake rewards transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to which the delegation has been made
     * @param granteeAddress validator grantee address
     */
    craftRestakeRewardsTx(pubkey: string, validatorAddress: string, granteeAddress: string): Promise<CosmosTx>;
    /**
     * Craft osmo unstaking transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to which the delegation has been made
     * @param amountOsmo how many tokens to undelegate in OSMO
     */
    craftUnstakeTx(pubkey: string, validatorAddress: string, amountOsmo?: number): Promise<CosmosTx>;
    /**
     * Craft osmo redelegate transaction
     * @param accountId id of the kiln account to use for the new stake
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorSourceAddress validator address of the current delegation
     * @param validatorDestinationAddress validator address to which the delegation will be moved
     * @param amountOsmo how many tokens to redelegate in OSMO
     */
    craftRedelegateTx(accountId: string, pubkey: string, validatorSourceAddress: string, validatorDestinationAddress: string, amountOsmo?: number): Promise<CosmosTx>;
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
    /**
     * Retrieve stakes of given kiln accounts
     * @param accountIds kiln account ids of which you wish to retrieve stakes
     * @returns {OsmoStakes} Osmo Stakes
     */
    getStakesByAccounts(accountIds: string[]): Promise<OsmoStakes>;
    /**
     * Retrieve stakes of given stake accounts
     * @param delegators delegator addresses of which you wish to retrieve stakes
     * @param validators validator addresses of which you wish to retrieve stakes
     * @returns {OsmoStakes} Osmo Stakes
     */
    getStakesByDelegatorsAndValidators(delegators: string[], validators: string[]): Promise<OsmoStakes>;
    /**
     * Retrieve rewards for given accounts
     * @param accountIds kiln account ids of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {OsmoRewards} Osmo rewards
     */
    getRewardsByAccounts(accountIds: string[], startDate?: string, endDate?: string): Promise<OsmoRewards>;
    /**
     * Retrieve rewards for given stake accounts
     * @param delegators delegator addresses of which you wish to retrieve rewards
     * @param validators validator addresses of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {OsmoRewards} Osmo rewards
     */
    getRewardsByDelegatorsAndValidators(delegators: string[], validators: string[], startDate?: string, endDate?: string): Promise<OsmoRewards>;
}
