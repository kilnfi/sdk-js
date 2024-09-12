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
exports.InjService = void 0;
const service_1 = require("./service");
const api_1 = require("../api");
const viem_1 = require("viem");
class InjService extends service_1.Service {
    constructor({ testnet }) {
        super({ testnet });
    }
    /**
     * Convert INJ to inj
     * @param amount
     */
    injToAinj(amount) {
        return (0, viem_1.parseUnits)(amount, 18).toString();
    }
    /**
     * Craft inj staking transaction
     * @param accountId id of the kiln account to use for the stake transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to delegate to
     * @param amountInj how many tokens to stake in INJ
     * @param restakeRewards If enabled, the rewards will be automatically restaked
     * @param granteeAddress validator grantee address
     */
    craftStakeTx(accountId_1, pubkey_1, validatorAddress_1, amountInj_1) {
        return __awaiter(this, arguments, void 0, function* (accountId, pubkey, validatorAddress, amountInj, restakeRewards = false, granteeAddress) {
            const { data } = yield api_1.api.post(`/v1/inj/transaction/stake`, {
                account_id: accountId,
                pubkey: pubkey,
                validator: validatorAddress,
                amount_inj: this.injToAinj(amountInj.toString()),
                restake_rewards: restakeRewards,
                grantee_address: granteeAddress,
            });
            return data;
        });
    }
    /**
     * Craft inj withdraw rewards transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to which the delegation has been made
     */
    craftWithdrawRewardsTx(pubkey, validatorAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/inj/transaction/withdraw-rewards`, {
                pubkey: pubkey,
                validator: validatorAddress,
            });
            return data;
        });
    }
    /**
     * Craft inj restake rewards transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to which the delegation has been made
     * @param granteeAddress validator grantee address
     */
    craftRestakeRewardsTx(pubkey, validatorAddress, granteeAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/inj/transaction/restake-rewards`, {
                pubkey: pubkey,
                validator_address: validatorAddress,
                grantee_address: granteeAddress,
            });
            return data;
        });
    }
    /**
     * Craft inj unstaking transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to which the delegation has been made
     * @param amountInj how many tokens to undelegate in INJ
     */
    craftUnstakeTx(pubkey, validatorAddress, amountInj) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/inj/transaction/unstake`, {
                pubkey: pubkey,
                validator: validatorAddress,
                amount_inj: amountInj ? this.injToAinj(amountInj.toString()) : undefined,
            });
            return data;
        });
    }
    /**
     * Craft inj redelegate transaction
     * @param accountId id of the kiln account to use for the new stake
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorSourceAddress validator address of the current delegation
     * @param validatorDestinationAddress validator address to which the delegation will be moved
     * @param amountInj how many tokens to redelegate in INJ
     */
    craftRedelegateTx(accountId, pubkey, validatorSourceAddress, validatorDestinationAddress, amountInj) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/inj/transaction/redelegate`, {
                account_id: accountId,
                pubkey: pubkey,
                validator_source: validatorSourceAddress,
                validator_destination: validatorDestinationAddress,
                amount_inj: amountInj ? this.injToAinj(amountInj.toString()) : undefined,
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
            const fbNote = note ? note : "INJ tx from @kilnfi/sdk";
            const signer = this.getFbSigner(integration);
            const fbTx = yield signer.sign(payload, "INJ_INJ", fbNote);
            const signature = fbTx.signedMessages[0].signature.fullSig;
            const { data } = yield api_1.api.post(`/v1/inj/transaction/prepare`, {
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
            const { data } = yield api_1.api.post(`/v1/inj/transaction/broadcast`, {
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
            const { data } = yield api_1.api.get(`/v1/inj/transaction/status?tx_hash=${txHash}`);
            return data;
        });
    }
    /**
     * Decode transaction
     * @param txSerialized transaction serialized
     */
    decodeTx(txSerialized) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/inj/transaction/decode?tx_serialized=${txSerialized}`);
            return data;
        });
    }
}
exports.InjService = InjService;
