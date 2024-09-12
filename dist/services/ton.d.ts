import { Service } from "./service";
import { ServiceProps } from "../types/service";
import { Integration } from "../types/integrations";
import { TonSignedTx, TonTx, TonTxHash, TonTxStatus } from "../types/ton";
export declare class TonService extends Service {
    constructor({ testnet }: ServiceProps);
    /**
     * Craft TON staking transaction to a single nomination pool
     * @param accountId id of the kiln account to use for the stake transaction
     * @param walletAddress sender of the transaction
     * @param poolAddress single nomination pool address
     * @param amountTon how much to stake in TON
     */
    craftStakeSingleNominationPoolTx(accountId: string, walletAddress: string, poolAddress: string, amountTon: number): Promise<TonTx>;
    /**
     * Craft TON staking transaction to a nomination pool
     * @param accountId id of the kiln account to use for the stake transaction
     * @param walletAddress sender of the transaction
     * @param poolAddress nomination pool address
     * @param amountTon how much to stake in TON
     */
    craftStakeNominationPoolTx(accountId: string, walletAddress: string, poolAddress: string, amountTon: number): Promise<TonTx>;
    /**
     * Craft TON unstake transaction from a single nomination pool
     * @param walletAddress sender of the transaction
     * @param poolAddress single nomination pool address
     * @param amountTon how much to stake in TON
     */
    craftUnstakeSingleNominationPoolTx(walletAddress: string, poolAddress: string, amountTon?: number): Promise<TonTx>;
    /**
     * Craft TON unstake transaction from a nomination pool
     * @param walletAddress sender of the transaction
     * @param poolAddress nomination pool address
     */
    craftUnstakeNominationPoolTx(walletAddress: string, poolAddress: string): Promise<TonTx>;
    /**
     * Craft TON whitelist tx for vesting contract
     * @param walletAddress sender of the transaction
     * @param vestingContractAddress vesting contract address
     * @param addresses addresses to whitelist
     */
    craftWhitelistVestingContractTx(walletAddress: string, vestingContractAddress: string, addresses: string[]): Promise<TonTx>;
    /**
     * Craft TON stake from a vesting contract tx
     * @param accountId id of the kiln account to use for the stake transaction
     * @param walletAddress sender of the transaction
     * @param vestingContractAddress vesting contract address
     * @param destinationAddress the destination to which the TON will be sent to
     * @param amountTon the amount of TON to send
     */
    craftStakeFromVestingContractTx(accountId: string, walletAddress: string, vestingContractAddress: string, destinationAddress: string, amountTon: number): Promise<TonTx>;
    /**
     * Craft TON unstake from a vesting contract tx
     * @param walletAddress sender of the transaction
     * @param vestingContractAddress vesting contract address
     * @param poolAddress the pool address to unstake from
     * @param amountTon the amount of TON to unstake
     */
    craftUnstakeFromVestingContractTx(walletAddress: string, vestingContractAddress: string, poolAddress: string, amountTon: number): Promise<TonTx>;
    /**
     * Sign transaction with given integration
     * @param integration custody solution to sign with
     * @param tx raw transaction
     * @param note note to identify the transaction in your custody solution
     */
    sign(integration: Integration, tx: TonTx, note?: string): Promise<TonSignedTx>;
    /**
     * Broadcast transaction to the network
     * @param signedTx serialized signed tx
     */
    broadcast(signedTx: TonSignedTx): Promise<TonTxHash>;
    /**
     * Get transaction status by message hash
     * @param msgHash transaction hash
     */
    getTxStatus(msgHash: string): Promise<TonTxStatus>;
    /**
     * Convert TON to nanoTON
     * @param ton
     */
    tonToNanoTon(ton: string): string;
}
