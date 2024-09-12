"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubstrateService = void 0;
const api_1 = require("../api");
const service_1 = require("./service");
/**
 * Staking docs: https://polkadot.js.org/docs/substrate/extrinsics#staking
 * Nomination pools docs: https://polkadot.js.org/docs/substrate/extrinsics#nominationpools
 */
class SubstrateService extends service_1.Service {
    constructor({ testnet }, token) {
        super({ testnet });
        this.token = token;
    }
    /**
     * Craft bonding transaction
     * @param accountId id of the kiln account to use for the stake transaction
     * @param stashAccount stash account address (your most secure cold wallet)
     * @param amount amount to bond in main unit (e.g. 1.2 DOT)
     * @param rewardDestination
     */
    craftBondTx(accountId, stashAccount, amount, rewardDestination) {
        return __awaiter(this, void 0, void 0, function* () {
            const amountPlanck = this.mainToPlanck(amount.toString());
            const { data } = yield api_1.api.post(`/v1/${this.token.toLowerCase()}/transaction/bond`, {
                account_id: accountId,
                stash_account: stashAccount,
                amount_planck: amountPlanck,
                reward_destination: rewardDestination,
            });
            return data;
        });
    }
    /**
     * Craft bonding extra token transaction (to be used if you already bonded tokens)
     * @param stashAccount stash account address
     * @param amount amount to bond extra in main unit (e.g. 1.2 DOT)
     */
    craftBondExtraTx(stashAccount, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const amountPlanck = this.mainToPlanck(amount.toString());
            const { data } = yield api_1.api.post(`/v1/${this.token.toLowerCase()}/transaction/bond-extra`, {
                stash_account: stashAccount,
                amount_planck: amountPlanck,
            });
            return data;
        });
    }
    /**
     * Craft rebond transaction (to be used to rebond unbonding token)
     * @param stashAccount stash account address
     * @param amount amount to rebond in main unit (e.g. 1.2 DOT)
     */
    craftRebondTx(stashAccount, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const amountPlanck = this.mainToPlanck(amount.toString());
            const { data } = yield api_1.api.post(`/v1/${this.token.toLowerCase()}/transaction/rebond`, {
                stash_account: stashAccount,
                amount_planck: amountPlanck,
            });
            return data;
        });
    }
    /**
     * Craft nominate transaction
     * @param stashAccount stash account address
     * @param validatorAddresses validator addresses to nominate to
     */
    craftNominateTx(stashAccount, validatorAddresses) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/${this.token.toLowerCase()}/transaction/nominate`, {
                stash_account: stashAccount,
                validator_addresses: validatorAddresses,
            });
            return data;
        });
    }
    /**
     * Craft unbonding transaction, there is an unbonding period before your tokens can be withdrawn
     * @param stashAccount stash account address
     * @param amount amount to unrebond in main unit (e.g. 1.2 DOT)
     */
    craftUnbondTx(stashAccount, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const amountPlanck = this.mainToPlanck(amount.toString());
            const { data } = yield api_1.api.post(`/v1/${this.token.toLowerCase()}/transaction/unbond`, {
                stash_account: stashAccount,
                amount_planck: amountPlanck,
            });
            return data;
        });
    }
    /**
     * Craft withdraw unbonded token transaction
     * @param stashAccount stash account address
     */
    craftWithdrawUnbondedTx(stashAccount) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/${this.token.toLowerCase()}/transaction/withdraw-unbonded`, {
                stash_account: stashAccount,
            });
            return data;
        });
    }
    /**
     * Craft chill transaction that chills the stash account,
     * meaning that given account will not nominate
     * any validator anymore, so you will stop earning rewards at the beginning
     * of the next era.
     * @param stashAccount stash account address
     */
    craftChillTx(stashAccount) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/${this.token.toLowerCase()}/transaction/chill`, {
                stash_account: stashAccount,
            });
            return data;
        });
    }
    /**
     * Craft set reward destination transaction that updates the destination rewards address for the given stash account
     * @param stashAccount stash account address
     * @param rewardsDestination:
     *  'Staked': rewards are paid into the stash account, increasing the amount at stake accordingly.
     *  'Stash': rewards are paid into the stash account, not increasing the amount at stake.
     *  'Controller': rewards are paid into the controller account
     *  Custom account address: rewards are paid into the custom account address
     */
    craftSetPayeeTx(stashAccount, rewardsDestination) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/${this.token.toLowerCase()}/transaction/set-payee`, {
                stash_account: stashAccount,
                reward_destination: rewardsDestination,
            });
            return data;
        });
    }
    /**
     * Craft join pool transaction
     * The amount to bond is transferred from the member to the pools account and immediately increases the pools bond.
     * @param accountId
     * @param memberAccount
     * @param amount
     * @param poolId
     */
    craftJoinPoolTx(accountId, memberAccount, amount, poolId) {
        return __awaiter(this, void 0, void 0, function* () {
            const amountPlanck = this.mainToPlanck(amount.toString());
            const { data } = yield api_1.api.post(`/v1/${this.token.toLowerCase()}/transaction/join-pool`, {
                account_id: accountId,
                member_account: memberAccount,
                amount_planck: amountPlanck,
                pool_id: poolId,
            });
            return data;
        });
    }
    /**
     * Craft a pool bond extra transaction
     * Bond extra more funds from origin into the pool to which they already belong.
     * Bonding extra funds implies an automatic payout of all pending rewards as well.
     * @param memberAccount
     * @param amount
     */
    craftBondExtraToPoolTx(memberAccount, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const amountPlanck = this.mainToPlanck(amount.toString());
            const { data } = yield api_1.api.post(`/v1/${this.token.toLowerCase()}/transaction/bond-extra-pool`, {
                member_account: memberAccount,
                amount_planck: amountPlanck,
            });
            return data;
        });
    }
    /**
     * Craft a pool bond extra transaction to bond available rewards into the pool to which they already belong.
     * @param memberAccount
     */
    craftBondRewardsToPoolTx(memberAccount) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/${this.token.toLowerCase()}/transaction/bond-rewards-pool`, {
                member_account: memberAccount,
            });
            return data;
        });
    }
    /**
     * Craft a pool claim payout transaction
     * A bonded member can use this to claim their payout based on the rewards that
     * the pool has accumulated since their last claimed payout (OR since joining
     * if this is their first time claiming rewards).
     * The payout will be transferred to the member's account.
     * The member will earn rewards pro rata based on the members stake vs the sum of the members in the pools stake. Rewards do not "expire".
     * @param memberAccount
     */
    craftClaimPayoutFromPoolTx(memberAccount) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/${this.token.toLowerCase()}/transaction/claim-payout-pool`, {
                member_account: memberAccount,
            });
            return data;
        });
    }
    /**
     * Craft a pool unbond transaction
     * Unbond amount funds from the pool.
     * It implicitly collects the rewards one last time, since not doing so would mean some rewards would be forfeited.
     * Warning: you cannot rebond during the unbonding period with a nomination pool. If you change your mind, you must wait for the unbonding period to end before you can join a nomination pool again.
     * @param memberAccount
     * @param amount
     */
    craftUnbondFromPoolTx(memberAccount, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const amountPlanck = this.mainToPlanck(amount.toString());
            const { data } = yield api_1.api.post(`/v1/${this.token.toLowerCase()}/transaction/unbond-pool`, {
                member_account: memberAccount,
                amount_planck: amountPlanck,
            });
            return data;
        });
    }
    /**
     * Craft a pool withdraw unbonded transaction
     * Withdraw unbonded funds from member_account.
     * @param memberAccount
     */
    craftWithdrawUnbondedFromPoolTx(memberAccount) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/${this.token.toLowerCase()}/transaction/withdraw-unbonded-pool`, {
                member_account: memberAccount,
            });
            return data;
        });
    }
    /**
     * Sign transaction with given integration
     * @param integration custody solution to sign with
     * @param tx raw transaction
     * @param note note to identify the transaction in your custody solution
     */
    sign(integration, tx, note) {
        return __awaiter(this, void 0, void 0, function* () {
            const payload = {
                rawMessageData: {
                    messages: [
                        {
                            content: tx.data.unsigned_tx_payload.substring(2),
                        },
                    ],
                },
            };
            const fbSigner = this.getFbSigner(integration);
            const fbNote = note ? note : `${this.token} tx from @kilnfi/sdk`;
            const fbTx = yield fbSigner.sign(payload, this.token, fbNote);
            const signature = `0x00${fbTx.signedMessages[0].signature.fullSig}`;
            const { data } = yield api_1.api.post(`/v1/${this.token.toLowerCase()}/transaction/prepare`, {
                unsigned_tx_serialized: tx.data.unsigned_tx_serialized,
                signature: signature,
            });
            data.data.fireblocks_tx = fbTx;
            return data;
        });
    }
    /**
     * Broadcast signed transaction
     * @param signedTx
     */
    broadcast(signedTx) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/${this.token.toLowerCase()}/transaction/broadcast`, {
                tx_serialized: signedTx.data.signed_tx_serialized,
            });
            return data;
        });
    }
    /**
     * Get transaction status
     * @param txHash transaction hash
     */
    getTxStatus(txHash) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/${this.token.toLowerCase()}/transaction/status?tx_hash=${txHash}`);
            return data;
        });
    }
    /**
     * Decode transaction
     * @param txSerialized transaction serialized
     */
    decodeTx(txSerialized) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/${this.token.toLowerCase()}/transaction/decode?tx_serialized=${txSerialized}`);
            return data;
        });
    }
}
exports.SubstrateService = SubstrateService;
