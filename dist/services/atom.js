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
exports.AtomService = void 0;
const service_1 = require("./service");
const api_1 = require("../api");
const viem_1 = require("viem");
class AtomService extends service_1.Service {
    constructor({ testnet }) {
        super({ testnet });
    }
    /**
     * Convert ATOM to UATOM
     * @param amountAtom
     */
    atomToUatom(amountAtom) {
        return (0, viem_1.parseUnits)(amountAtom, 6).toString();
    }
    /**
     * Craft atom staking transaction
     * @param accountId id of the kiln account to use for the stake transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to delegate to
     * @param amountAtom how many tokens to stake in ATOM
     * @param restakeRewards If enabled, the rewards will be automatically restaked
     * @param granteeAddress validator grantee address
     */
    craftStakeTx(accountId_1, pubkey_1, validatorAddress_1, amountAtom_1) {
        return __awaiter(this, arguments, void 0, function* (accountId, pubkey, validatorAddress, amountAtom, restakeRewards = false, granteeAddress) {
            const { data } = yield api_1.api.post(`/v1/atom/transaction/stake`, {
                account_id: accountId,
                pubkey: pubkey,
                validator: validatorAddress,
                amount_uatom: this.atomToUatom(amountAtom.toString()),
                restake_rewards: restakeRewards,
                grantee_address: granteeAddress,
            });
            return data;
        });
    }
    /**
     * Craft atom withdraw rewards transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to which the delegation has been made
     */
    craftWithdrawRewardsTx(pubkey, validatorAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/atom/transaction/withdraw-rewards`, {
                pubkey: pubkey,
                validator: validatorAddress,
            });
            return data;
        });
    }
    /**
     * Craft atom restake rewards transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to which the delegation has been made
     * @param granteeAddress validator grantee address
     */
    craftRestakeRewardsTx(pubkey, validatorAddress, granteeAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/atom/transaction/restake-rewards`, {
                pubkey: pubkey,
                validator_address: validatorAddress,
                grantee_address: granteeAddress,
            });
            return data;
        });
    }
    /**
     * Craft atom unstaking transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to which the delegation has been made
     * @param amountAtom how many tokens to undelegate in ATOM
     */
    craftUnstakeTx(pubkey, validatorAddress, amountAtom) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/atom/transaction/unstake`, {
                pubkey: pubkey,
                validator: validatorAddress,
                amount_uatom: amountAtom ? this.atomToUatom(amountAtom.toString()) : undefined,
            });
            return data;
        });
    }
    /**
     * Craft atom redelegate transaction
     * @param accountId id of the kiln account to use for the new stake
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorSourceAddress validator address of the current delegation
     * @param validatorDestinationAddress validator address to which the delegation will be moved
     * @param amountAtom how many tokens to redelegate in ATOM
     */
    craftRedelegateTx(accountId, pubkey, validatorSourceAddress, validatorDestinationAddress, amountAtom) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/atom/transaction/redelegate`, {
                account_id: accountId,
                pubkey: pubkey,
                validator_source: validatorSourceAddress,
                validator_destination: validatorDestinationAddress,
                amount_uatom: amountAtom ? this.atomToUatom(amountAtom.toString()) : undefined,
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
                            content: tx.data.unsigned_tx_hash,
                            preHash: {
                                content: tx.data.unsigned_tx_serialized,
                                hashAlgorithm: "SHA256",
                            },
                        },
                    ],
                },
            };
            const fbNote = note ? note : "ATOM tx from @kilnfi/sdk";
            const signer = this.getFbSigner(integration);
            const fbTx = yield signer.sign(payload, this.testnet ? "ATOM_COS_TEST" : "ATOM_COS", fbNote);
            const signature = fbTx.signedMessages[0].signature.fullSig;
            const { data } = yield api_1.api.post(`/v1/atom/transaction/prepare`, {
                pubkey: tx.data.pubkey,
                tx_body: tx.data.tx_body,
                tx_auth_info: tx.data.tx_auth_info,
                signature: signature,
            });
            data.data.fireblocks_tx = fbTx;
            return data;
        });
    }
    /**
     * Broadcast transaction to the network
     * @param signedTx
     */
    broadcast(signedTx) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/atom/transaction/broadcast`, {
                tx_serialized: signedTx.data.signed_tx_serialized,
            });
            return data;
        });
    }
    /**
     * Get transaction status
     * @param txHash
     */
    getTxStatus(txHash) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/atom/transaction/status?tx_hash=${txHash}`);
            return data;
        });
    }
    /**
     * Decode transaction
     * @param txSerialized transaction serialized
     */
    decodeTx(txSerialized) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/atom/transaction/decode?tx_serialized=${txSerialized}`);
            return data;
        });
    }
    /**
     * Retrieve stakes of given kiln accounts
     * @param accountIds kiln account ids of which you wish to retrieve stakes
     * @returns {AtomStakes} Atom Stakes
     */
    getStakesByAccounts(accountIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/atom/stakes?accounts=${accountIds.join(",")}`);
            return data;
        });
    }
    /**
     * Retrieve stakes of given stake accounts
     * @param delegators delegator addresses of which you wish to retrieve stakes
     * @param validators validator addresses of which you wish to retrieve stakes
     * @returns {AtomStakes} Atom Stakes
     */
    getStakesByDelegatorsAndValidators(delegators, validators) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/atom/stakes?delegators=${delegators.join(",")}&validators=${validators.join(",")}`);
            return data;
        });
    }
    /**
     * Retrieve rewards for given accounts
     * @param accountIds kiln account ids of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {AtomRewards} Atom rewards
     */
    getRewardsByAccounts(accountIds, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `/v1/atom/rewards?accounts=${accountIds.join(",")}${startDate ? `&start_date=${startDate}` : ""}${endDate ? `&end_date=${endDate}` : ""}`;
            const { data } = yield api_1.api.get(query);
            return data;
        });
    }
    /**
     * Retrieve rewards for given stake accounts
     * @param delegators delegator addresses of which you wish to retrieve rewards
     * @param validators validator addresses of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {AtomRewards} Atom rewards
     */
    getRewardsByDelegatorsAndValidators(delegators, validators, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `/v1/atom/rewards?delegators=${delegators.join(",")}&validators=${validators.join(",")}${startDate ? `&start_date=${startDate}` : ""}${endDate ? `&end_date=${endDate}` : ""}`;
            const { data } = yield api_1.api.get(query);
            return data;
        });
    }
}
exports.AtomService = AtomService;
