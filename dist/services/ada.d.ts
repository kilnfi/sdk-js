import { Service } from "./service";
import { AdaNetworkStats, AdaRewards, AdaSignedTx, AdaStakes, AdaTx, AdaTxHash, AdaTxStatus } from "../types/ada";
import { ServiceProps } from "../types/service";
import { Integration } from "../types/integrations";
import { TransactionJSON } from "@emurgo/cardano-serialization-lib-nodejs";
export declare class AdaService extends Service {
    constructor({ testnet }: ServiceProps);
    /**
     * Craft ada delegate transaction, all the wallet's balance will be delegated to the pool
     * @param accountId id of the kiln account to use for the stake transaction
     * @param walletAddress withdrawal creds /!\ losing it => losing the ability to withdraw
     * @param poolId pool id (bech32) to delegate to, eg. KILN0 - pool10rdglgh4pzvkf936p2m669qzarr9dusrhmmz9nultm3uvq4eh5k
     */
    craftStakeTx(accountId: string, walletAddress: string, poolId: string): Promise<AdaTx>;
    /**
     * Craft ada withdraw rewards transaction
     * @param walletAddress wallet delegating that will receive the rewards
     * @param amountAda amount of rewards to withdraw in ADA, if not provided all rewards are withdrawn
     */
    craftWithdrawRewardsTx(walletAddress: string, amountAda?: number): Promise<AdaTx>;
    /**
     * Craft ada undelegate transaction
     * @param walletAddress wallet delegating that will receive the rewards
     */
    craftUnstakeTx(walletAddress: string): Promise<AdaTx>;
    /**
     * Convert ADA to Lovelace
     * @param amountAda
     */
    adaToLovelace(amountAda: string): string;
    /**
     * Sign transaction with given integration
     * @param integration custody solution to sign with
     * @param tx raw ada transaction
     * @param note note to identify the transaction in your custody solution
     */
    sign(integration: Integration, tx: AdaTx, note?: string): Promise<AdaSignedTx>;
    /**
     * Broadcast transaction to the network
     * @param signedTx
     */
    broadcast(signedTx: AdaSignedTx): Promise<AdaTxHash>;
    /**
     * Get transaction status
     * @param txHash transaction hash
     */
    getTxStatus(txHash: string): Promise<AdaTxStatus>;
    /**
     * Decode transaction
     * @param txSerialized transaction serialized
     */
    decodeTx(txSerialized: string): Promise<TransactionJSON>;
    /**
     * Retrieve stakes of given kiln accounts
     * @param accountIds kiln account ids of which you wish to retrieve stakes
     * @returns {AdaStakes} Cardano Stakes
     */
    getStakesByAccounts(accountIds: string[]): Promise<AdaStakes>;
    /**
     * Retrieve stakes of given stake accounts
     * @param stakeAddresses stake addresses of which you wish to retrieve stakes
     * @returns {AdaStakes} Cardano Stakes
     */
    getStakesByStakeAddresses(stakeAddresses: string[]): Promise<AdaStakes>;
    /**
     * Retrieve stakes of given wallets
     * @param wallets wallet addresses of which you wish to retrieve stakes
     * @returns {AdaStakes} Cardano Stakes
     */
    getStakesByWallets(wallets: string[]): Promise<AdaStakes>;
    /**
     * Retrieve rewards for given accounts
     * @param accountIds kiln account ids of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {AdaRewards} Cardano rewards
     */
    getRewardsByAccounts(accountIds: string[], startDate?: string, endDate?: string): Promise<AdaRewards>;
    /**
     * Retrieve rewards for given stake accounts
     * @param stakeAddresses stake addresses of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {AdaRewards} Cardano rewards
     */
    getRewardsByStakeAddresses(stakeAddresses: string[], startDate?: string, endDate?: string): Promise<AdaRewards>;
    /**
     * Retrieve rewards for given stake accounts
     * @param wallets wallet addresses of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {AdaRewards} Cardano rewards
     */
    getRewardsByWallets(wallets: string[], startDate?: string, endDate?: string): Promise<AdaRewards>;
    /**
     * Retrieve ADA network stats
     */
    getNetworkStats(): Promise<AdaNetworkStats>;
}
