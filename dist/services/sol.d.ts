import { Transaction } from "@solana/web3.js";
import { SolNetworkStats, SolRewards, SolSignedTx, SolStakes, SolTx, SolTxHash, SolTxStatus } from "../types/sol";
import { Service } from "./service";
import { ServiceProps } from "../types/service";
import { Integration } from "../types/integrations";
export declare class SolService extends Service {
    constructor({ testnet }: ServiceProps);
    /**
     * Craft Solana staking transaction
     * @param accountId id of the kiln account to use for the stake transaction
     * @param walletAddress used to create the stake account and retrieve rewards in the future
     * @param voteAccountAddress vote account address of the validator that you wish to delegate to
     * @param amountSol how much to stake in SOL (min 0.01 SOL)
     * @param memo custom memo message to include in the transaction
     */
    craftStakeTx(accountId: string, walletAddress: string, voteAccountAddress: string, amountSol: number, memo?: string): Promise<SolTx>;
    /**
     * Craft Solana desactivate stake account transaction
     * @param stakeAccountAddress stake account address to deactivate
     * @param walletAddress wallet that has authority over the stake account
     */
    craftDeactivateStakeTx(stakeAccountAddress: string, walletAddress: string): Promise<SolTx>;
    /**
     * Craft Solana withdraw stake transaction
     * @param stakeAccountAddress stake account address to deactivate
     * @param walletAddress wallet that has authority over the stake account
     * @param amountSol: amount to withdraw in SOL, if not specified the whole balance will be withdrawn
     */
    craftWithdrawStakeTx(stakeAccountAddress: string, walletAddress: string, amountSol?: number): Promise<SolTx>;
    /**
     * Craft merge stake accounts transaction, merging stake accounts can only be done on these conditions
     * https://docs.solana.com/staking/stake-accounts#merging-stake-accounts
     * @param stakeAccountSourceAddress source stake account to merge into the destination stake account
     * @param stakeAccountDestinationAddress stake account to merge the source stake account into
     * @param walletAddress that has authority over the 2 stake accounts to merge
     */
    craftMergeStakesTx(stakeAccountSourceAddress: string, stakeAccountDestinationAddress: string, walletAddress: string): Promise<SolTx>;
    /**
     * Craft split stake account transaction
     * @param accountId kiln account id to associate the new stake account with
     * @param stakeAccountAddress stake account to split
     * @param walletAddress that has authority over the stake account to split
     * @param amountSol amount in SOL to put in the new stake account
     */
    craftSplitStakeTx(accountId: string, stakeAccountAddress: string, walletAddress: string, amountSol: number): Promise<SolTx>;
    /**
     * Sign transaction with given integration
     * @param integration custody solution to sign with
     * @param tx raw transaction
     * @param note note to identify the transaction in your custody solution
     */
    sign(integration: Integration, tx: SolTx, note?: string): Promise<SolSignedTx>;
    /**
     * Broadcast transaction to the network
     * @param signedTx serialized signed tx
     */
    broadcast(signedTx: SolSignedTx): Promise<SolTxHash>;
    /**
     * Get transaction status
     * @param txHash transaction hash
     */
    getTxStatus(txHash: string): Promise<SolTxStatus>;
    /**
     * Decode transaction
     * @param txSerialized transaction serialized
     */
    decodeTx(txSerialized: string): Promise<Transaction>;
    /**
     * Retrieve stakes of given kiln accounts
     * @param accountIds kiln account ids of which you wish to retrieve stakes
     * @returns {SolStakes} Solana Stakes
     */
    getStakesByAccounts(accountIds: string[]): Promise<SolStakes>;
    /**
     * Retrieve stakes of given stake accounts
     * @param stakeAccounts stake account addresses of which you wish to retrieve stakes
     * @returns {SolStakes} Solana Stakes
     */
    getStakesByStakeAccounts(stakeAccounts: string[]): Promise<SolStakes>;
    /**
     * Retrieve stakes of given wallets
     * @param wallets wallet addresses of which you wish to retrieve stakes
     * @returns {SolStakes} Solana Stakes
     */
    getStakesByWallets(wallets: string[]): Promise<SolStakes>;
    /**
     * Retrieve rewards for given accounts
     * @param accountIds kiln account ids of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {SolRewards} Solana rewards
     */
    getRewardsByAccounts(accountIds: string[], startDate?: string, endDate?: string): Promise<SolRewards>;
    /**
     * Retrieve rewards for given stake accounts
     * @param stakeAccounts stake account addresses of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {SolRewards} Solana rewards
     */
    getRewardsByStakeAccounts(stakeAccounts: string[], startDate?: string, endDate?: string): Promise<SolRewards>;
    /**
     * Retrieve rewards for given stake accounts
     * @param wallets wallet addresses of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {SolRewards} Solana rewards
     */
    getRewardsByWallets(wallets: string[], startDate?: string, endDate?: string): Promise<SolRewards>;
    /**
     * Retrieve SOL network stats
     */
    getNetworkStats(): Promise<SolNetworkStats>;
    /**
     * Convert SOL to Lamports
     * @param sol
     */
    solToLamports(sol: string): string;
}
