import { Service } from "./service";
import { XtzNetworkStats, XtzRewards, XtzSignedTx, XtzStakes, XtzTx, XtzTxHash, XtzTxStatus } from "../types/xtz";
import { ServiceProps } from "../types/service";
import { Integration } from "../types/integrations";
import { ForgeParams } from "@taquito/local-forging";
export declare class XtzService extends Service {
    constructor({ testnet }: ServiceProps);
    /**
     * Craft Tezos delegation transaction
     * @param accountId id of the kiln account to use for the stake transaction
     * @param walletAddress wallet address delegating
     * @param bakerAddress baker address that you wish to delegate to
     */
    craftStakeTx(accountId: string, walletAddress: string, bakerAddress: string): Promise<XtzTx>;
    /**
     * Craft Tezos undelegation transaction
     * @param walletAddress wallet address delegating
     */
    craftUnStakeTx(walletAddress: string): Promise<XtzTx>;
    /**
     * Sign transaction with given integration
     * @param integration custody solution to sign with
     * @param tx raw transaction
     * @param note note to identify the transaction in your custody solution
     */
    sign(integration: Integration, tx: XtzTx, note?: string): Promise<XtzSignedTx>;
    /**
     * Broadcast transaction to the network
     * @param signedTx serialized signed tx
     */
    broadcast(signedTx: XtzSignedTx): Promise<XtzTxHash>;
    /**
     * Get transaction status
     * @param blockNumber
     * @param txHash transaction hash
     */
    getTxStatus(blockNumber: number, txHash: string): Promise<XtzTxStatus>;
    /**
     * Decode transaction
     * @param txSerialized transaction serialized
     */
    decodeTx(txSerialized: string): Promise<ForgeParams>;
    /**
     * Retrieve stakes of given kiln accounts
     * @param accountIds account ids of which you wish to retrieve rewards
     * @returns {XtzStakes} Tezos Stakes
     */
    getStakesByAccounts(accountIds: string[]): Promise<XtzStakes>;
    /**
     * Retrieve stakes of given wallet addresses
     * @param walletAddresses addresses of the wallets of which you wish to retrieve rewards
     * @returns {XtzStakes} Tezos Stakes
     */
    getStakesByWallets(walletAddresses: string[]): Promise<XtzStakes>;
    /**
     * Retrieve rewards by day of given kiln accounts
     * @param accountIds account ids of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {XtzRewards} Tezos rewards
     */
    getRewardsByAccounts(accountIds: string[], startDate?: string, endDate?: string): Promise<XtzRewards>;
    /**
     * Retrieve rewards by day of given wallet addresses
     * @param walletAddresses addresses of the wallets of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {XtzRewards} Tezos rewards
     */
    getRewardsByWallets(walletAddresses: string[], startDate?: string, endDate?: string): Promise<XtzRewards>;
    /**
     * Retrieve XTZ network stats
     */
    getNetworkStats(): Promise<XtzNetworkStats>;
    /**
     * Convert XTZ to mutez
     * @param xtz
     */
    xtzToMutez(xtz: string): string;
}
