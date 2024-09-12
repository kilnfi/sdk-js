import { transactions } from "near-api-js";
import { Service } from "./service";
import { NearNetworkStats, NearRewards, NearSignedTx, NearStakes, NearTx, NearTxHash, NearTxStatus } from "../types/near";
import { ServiceProps } from "../types/service";
import { Integration } from "../types/integrations";
export declare class NearService extends Service {
    constructor({ testnet }: ServiceProps);
    private getConnection;
    /**
     * Convert NEAR to YOCTO
     * @param amountNear
     */
    nearToYocto(amountNear: string): string;
    /**
     * Craft near stake transaction
     * @param accountId id of the kiln account to use for the stake transaction
     * @param walletId near wallet id
     * @param stakePoolId stake pool id
     * @param amountNear amount to stake in NEAR
     */
    craftStakeTx(accountId: string, walletId: string, stakePoolId: string, amountNear: number): Promise<NearTx>;
    /**
     * Craft near unstake transaction, unstaking takes 2-3 epochs (~48 hours) and needs to be done before a staked amount can be withdrawn
     * @param walletId near wallet id
     * @param stakePoolId stake pool id
     * @param amountNear amount to unstake in NEAR
     */
    craftUnstakeTx(walletId: string, stakePoolId: string, amountNear?: number): Promise<NearTx>;
    /**
     * Craft near withdraw transaction, withdrawing funds from a pool can only be done after previously unstaking funds
     * @param walletId near wallet id
     * @param stakePoolId stake pool id
     * @param amountNear amount to withdraw in NEAR
     */
    craftWithdrawTx(walletId: string, stakePoolId: string, amountNear?: number): Promise<NearTx>;
    /**
     * Sign transaction with given integration
     * @param integration custody solution to sign with
     * @param tx raw transaction
     * @param note note to identify the transaction in your custody solution
     */
    sign(integration: Integration, tx: NearTx, note?: string): Promise<NearSignedTx>;
    /**
     * Broadcast a signed near transaction to the network
     * @param signedTx
     */
    broadcast(signedTx: NearSignedTx): Promise<NearTxHash>;
    /**
     * Get transaction status
     * @param transactionHash transaction hash
     * @param poolId pool id
     */
    getTxStatus(transactionHash: string, poolId: string): Promise<NearTxStatus>;
    /**
     * Decode transaction
     * @param txSerialized transaction serialized
     */
    decodeTx(txSerialized: string): Promise<transactions.Transaction>;
    /**
     * Retrieve stakes of given kiln accounts
     * @param accountIds kiln account ids of which you wish to retrieve stakes
     * @returns {NearStakes} Near Stakes
     */
    getStakesByAccounts(accountIds: string[]): Promise<NearStakes>;
    /**
     * Retrieve stakes of given stake accounts
     * @param stakeAccounts list of stake accounts {poolId_walletId}
     * @returns {NearStakes} Near Stakes
     */
    getStakesByStakeAccounts(stakeAccounts: string[]): Promise<NearStakes>;
    /**
     * Retrieve stakes of given wallets
     * @param wallets wallet addresses of which you wish to retrieve stakes
     * @returns {NearStakes} Near Stakes
     */
    getStakesByWallets(wallets: string[]): Promise<NearStakes>;
    /**
     * Retrieve rewards history of given kiln accounts
     * @param accountIds kiln account ids of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {NearStakes} Near Stakes
     */
    getRewardsByAccounts(accountIds: string[], startDate?: string, endDate?: string): Promise<NearRewards>;
    /**
     * Retrieve rewards history of given stake accounts
     * @param stakeAccounts list of stake accounts {poolId_walletId}
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {NearRewards} Near Rewards
     */
    getRewardsByStakeAccounts(stakeAccounts: string[], startDate?: string, endDate?: string): Promise<NearRewards>;
    /**
     * Retrieve rewards history of given wallets
     * @param wallets wallet addresses of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {NearRewards} Near Rewards
     */
    getRewardsByWallets(wallets: string[], startDate?: string, endDate?: string): Promise<NearRewards>;
    /**
     * Retrieve NEAR network stats
     */
    getNetworkStats(): Promise<NearNetworkStats>;
}
