import { UnsignedTransaction } from "@substrate/txwrapper-polkadot";
import { Integration } from "../types/integrations";
import { ServiceProps } from "../types/service";
import { SubstrateRewardDestination, SubstrateSignedTx, SubstrateTx, SubstrateTxHash, SubstrateTxStatus } from "../types/substrate";
import { Service } from "./service";
import { AssetId } from "../integrations/fb_signer";
type SupportedTokens = ("DOT" | "KSM") & AssetId;
/**
 * Staking docs: https://polkadot.js.org/docs/substrate/extrinsics#staking
 * Nomination pools docs: https://polkadot.js.org/docs/substrate/extrinsics#nominationpools
 */
export declare abstract class SubstrateService extends Service {
    private token;
    constructor({ testnet }: ServiceProps, token: SupportedTokens);
    /**
     * Convert main token to planck
     * @param amount amount in main token
     */
    abstract mainToPlanck(amount: string): string;
    /**
     * Craft bonding transaction
     * @param accountId id of the kiln account to use for the stake transaction
     * @param stashAccount stash account address (your most secure cold wallet)
     * @param amount amount to bond in main unit (e.g. 1.2 DOT)
     * @param rewardDestination
     */
    craftBondTx(accountId: string, stashAccount: string, amount: number, rewardDestination: SubstrateRewardDestination): Promise<SubstrateTx>;
    /**
     * Craft bonding extra token transaction (to be used if you already bonded tokens)
     * @param stashAccount stash account address
     * @param amount amount to bond extra in main unit (e.g. 1.2 DOT)
     */
    craftBondExtraTx(stashAccount: string, amount: number): Promise<SubstrateTx>;
    /**
     * Craft rebond transaction (to be used to rebond unbonding token)
     * @param stashAccount stash account address
     * @param amount amount to rebond in main unit (e.g. 1.2 DOT)
     */
    craftRebondTx(stashAccount: string, amount: number): Promise<SubstrateTx>;
    /**
     * Craft nominate transaction
     * @param stashAccount stash account address
     * @param validatorAddresses validator addresses to nominate to
     */
    craftNominateTx(stashAccount: string, validatorAddresses: string[]): Promise<SubstrateTx>;
    /**
     * Craft unbonding transaction, there is an unbonding period before your tokens can be withdrawn
     * @param stashAccount stash account address
     * @param amount amount to unrebond in main unit (e.g. 1.2 DOT)
     */
    craftUnbondTx(stashAccount: string, amount: number): Promise<SubstrateTx>;
    /**
     * Craft withdraw unbonded token transaction
     * @param stashAccount stash account address
     */
    craftWithdrawUnbondedTx(stashAccount: string): Promise<SubstrateTx>;
    /**
     * Craft chill transaction that chills the stash account,
     * meaning that given account will not nominate
     * any validator anymore, so you will stop earning rewards at the beginning
     * of the next era.
     * @param stashAccount stash account address
     */
    craftChillTx(stashAccount: string): Promise<SubstrateTx>;
    /**
     * Craft set reward destination transaction that updates the destination rewards address for the given stash account
     * @param stashAccount stash account address
     * @param rewardsDestination:
     *  'Staked': rewards are paid into the stash account, increasing the amount at stake accordingly.
     *  'Stash': rewards are paid into the stash account, not increasing the amount at stake.
     *  'Controller': rewards are paid into the controller account
     *  Custom account address: rewards are paid into the custom account address
     */
    craftSetPayeeTx(stashAccount: string, rewardsDestination: SubstrateRewardDestination): Promise<SubstrateTx>;
    /**
     * Craft join pool transaction
     * The amount to bond is transferred from the member to the pools account and immediately increases the pools bond.
     * @param accountId
     * @param memberAccount
     * @param amount
     * @param poolId
     */
    craftJoinPoolTx(accountId: string, memberAccount: string, amount: number, poolId: string): Promise<SubstrateTx>;
    /**
     * Craft a pool bond extra transaction
     * Bond extra more funds from origin into the pool to which they already belong.
     * Bonding extra funds implies an automatic payout of all pending rewards as well.
     * @param memberAccount
     * @param amount
     */
    craftBondExtraToPoolTx(memberAccount: string, amount: number): Promise<SubstrateTx>;
    /**
     * Craft a pool bond extra transaction to bond available rewards into the pool to which they already belong.
     * @param memberAccount
     */
    craftBondRewardsToPoolTx(memberAccount: string): Promise<SubstrateTx>;
    /**
     * Craft a pool claim payout transaction
     * A bonded member can use this to claim their payout based on the rewards that
     * the pool has accumulated since their last claimed payout (OR since joining
     * if this is their first time claiming rewards).
     * The payout will be transferred to the member's account.
     * The member will earn rewards pro rata based on the members stake vs the sum of the members in the pools stake. Rewards do not "expire".
     * @param memberAccount
     */
    craftClaimPayoutFromPoolTx(memberAccount: string): Promise<SubstrateTx>;
    /**
     * Craft a pool unbond transaction
     * Unbond amount funds from the pool.
     * It implicitly collects the rewards one last time, since not doing so would mean some rewards would be forfeited.
     * Warning: you cannot rebond during the unbonding period with a nomination pool. If you change your mind, you must wait for the unbonding period to end before you can join a nomination pool again.
     * @param memberAccount
     * @param amount
     */
    craftUnbondFromPoolTx(memberAccount: string, amount: number): Promise<SubstrateTx>;
    /**
     * Craft a pool withdraw unbonded transaction
     * Withdraw unbonded funds from member_account.
     * @param memberAccount
     */
    craftWithdrawUnbondedFromPoolTx(memberAccount: string): Promise<SubstrateTx>;
    /**
     * Sign transaction with given integration
     * @param integration custody solution to sign with
     * @param tx raw transaction
     * @param note note to identify the transaction in your custody solution
     */
    sign(integration: Integration, tx: SubstrateTx, note?: string): Promise<SubstrateSignedTx>;
    /**
     * Broadcast signed transaction
     * @param signedTx
     */
    broadcast(signedTx: SubstrateSignedTx): Promise<SubstrateTxHash>;
    /**
     * Get transaction status
     * @param txHash transaction hash
     */
    getTxStatus(txHash: string): Promise<SubstrateTxStatus>;
    /**
     * Decode transaction
     * @param txSerialized transaction serialized
     */
    decodeTx(txSerialized: string): Promise<UnsignedTransaction>;
}
export {};
