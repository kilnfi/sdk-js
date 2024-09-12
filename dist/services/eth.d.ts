import { EthDecodedTx, EthKilnStats, EthNetworkStats, EthRewards, EthSignedTx, EthStakes, EthTx, EthTxHash, EthTxStatus } from "../types/eth";
import { Service } from "./service";
import { ServiceProps } from "../types/service";
import { Integration } from "../types/integrations";
import { TransactionResponse } from "fireblocks-sdk";
export declare class EthService extends Service {
    constructor({ testnet }: ServiceProps);
    /**
     * Spin up Ethereum validators and craft a staking transaction
     * @param accountId id of the kiln account to use for the stake transaction
     * @param walletAddress withdrawal creds /!\ losing it => losing the ability to withdraw
     * @param amountEth how many tokens to stake in ETH (must be a multiple of 32)
     */
    craftStakeTx(accountId: string, walletAddress: string, amountEth: number): Promise<EthTx>;
    /**
     * Request the exit of validators
     * @param walletAddress wallet address used to send the tx
     * @param validatorAddresses list of validator addresses to exit
     */
    craftExitRequestTx(walletAddress: string, validatorAddresses: string[]): Promise<EthTx>;
    /**
     * Sign transaction with given integration
     * @param integration custody solution to sign with
     * @param tx ETH transaction
     * @param note note to identify the transaction in your custody solution
     */
    sign(integration: Integration, tx: EthTx, note?: string): Promise<EthSignedTx>;
    /**
     * Sign transaction with given integration using Fireblocks contract call feature
     * @param integration custody solution to sign with
     * @param tx ETH transaction
     * @param note note to identify the transaction in your custody solution
     */
    signAndBroadcast(integration: Integration, tx: EthTx, note?: string): Promise<TransactionResponse>;
    /**
     * Broadcast transaction to the network
     * @param signedTx
     */
    broadcast(signedTx: EthSignedTx): Promise<EthTxHash>;
    /**
     * Get transaction status
     * @param txHash transaction hash
     */
    getTxStatus(txHash: string): Promise<EthTxStatus>;
    /**
     * Decode transaction
     * @param txSerialized transaction serialized
     */
    decodeTx(txSerialized: string): Promise<EthDecodedTx>;
    /**
     * Retrieve stakes of given kiln accounts
     * @param accountIds account ids of which you wish to retrieve rewards
     * @returns {EthStakes} Ethereum Stakes
     */
    getStakesByAccounts(accountIds: string[]): Promise<EthStakes>;
    /**
     * Retrieve stakes of given wallet addresses
     * @param walletAddresses addresses of the wallets of which you wish to retrieve rewards
     * @returns {EthStakes} Ethereum Stakes
     */
    getStakesByWallets(walletAddresses: string[]): Promise<EthStakes>;
    /**
     * Retrieve stakes on given validator addresses
     * @param validatorAddresses validator addresses of which you wish to retrieve rewards
     * @returns {EthStakes} Ethereum Stakes
     */
    getStakesByValidators(validatorAddresses: string[]): Promise<EthStakes>;
    /**
     * Retrieve rewards by day of given kiln accounts
     * @param accountIds account ids of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {EthRewards} Ethereum rewards
     */
    getRewardsByAccounts(accountIds: string[], startDate?: string, endDate?: string): Promise<EthRewards>;
    /**
     * Retrieve rewards by day of given wallet addresses
     * @param walletAddresses addresses of the wallets of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {EthRewards} Ethereum rewards
     */
    getRewardsByWallets(walletAddresses: string[], startDate?: string, endDate?: string): Promise<EthRewards>;
    /**
     * Retrieve rewards by day on given validator addresses
     * @param validatorAddresses validator addresses of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {EthRewards} Ethereum rewards
     */
    getRewardsByValidators(validatorAddresses: string[], startDate?: string, endDate?: string): Promise<EthRewards>;
    /**
     * Retrieve ETH network stats
     */
    getNetworkStats(): Promise<EthNetworkStats>;
    /**
     * Retrieve ETH kiln stats
     */
    getKilnStats(): Promise<EthKilnStats>;
    /**
     * Convert ETH to WEI
     * @param eth
     */
    ethToWei(eth: string): string;
}
