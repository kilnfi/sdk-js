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
exports.ZetaService = void 0;
const service_1 = require("./service");
const api_1 = require("../api");
const fireblocks_sdk_1 = require("fireblocks-sdk");
const viem_1 = require("viem");
class ZetaService extends service_1.Service {
    constructor({ testnet }) {
        super({ testnet });
    }
    /**
     * Convert ZETA to aZETA
     * @param amountZeta
     */
    zetaToAZeta(amountZeta) {
        return (0, viem_1.parseUnits)(amountZeta, 18).toString();
    }
    /**
     * Craft a Zetachain staking transaction
     * @param accountId id of the kiln account to use for the stake transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to delegate to
     * @param amountZeta how many tokens to stake in ZETA
     * @param restakeRewards If enabled, the rewards will be automatically restaked
     * @param granteeAddress validator grantee address
     */
    craftStakeTx(accountId_1, pubkey_1, validatorAddress_1, amountZeta_1) {
        return __awaiter(this, arguments, void 0, function* (accountId, pubkey, validatorAddress, amountZeta, restakeRewards = false, granteeAddress) {
            const { data } = yield api_1.api.post(`/v1/zeta/transaction/stake`, {
                account_id: accountId,
                pubkey: pubkey,
                validator: validatorAddress,
                amount_azeta: this.zetaToAZeta(amountZeta.toString()),
                restake_rewards: restakeRewards,
                grantee_address: granteeAddress,
            });
            return data;
        });
    }
    /**
     * Craft a Zetachain withdraw rewards transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to which the delegation has been made
     */
    craftWithdrawRewardsTx(pubkey, validatorAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/zeta/transaction/withdraw-rewards`, {
                pubkey: pubkey,
                validator: validatorAddress,
            });
            return data;
        });
    }
    /**
     * Craft a Zetachain restake rewards transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to which the delegation has been made
     * @param granteeAddress validator grantee address
     */
    craftRestakeRewardsTx(pubkey, validatorAddress, granteeAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/zeta/transaction/restake-rewards`, {
                pubkey: pubkey,
                validator_address: validatorAddress,
                grantee_address: granteeAddress,
            });
            return data;
        });
    }
    /**
     * Craft a Zetachain unstaking transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to which the delegation has been made
     * @param amountZeta how many tokens to undelegate in ZETA
     */
    craftUnstakeTx(pubkey, validatorAddress, amountZeta) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/zeta/transaction/unstake`, {
                pubkey: pubkey,
                validator: validatorAddress,
                amount_azeta: amountZeta ? this.zetaToAZeta(amountZeta.toString()) : undefined,
            });
            return data;
        });
    }
    /**
     * Craft a Zetachain redelegate transaction
     * @param accountId id of the kiln account to use for the new stake
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorSourceAddress validator address of the current delegation
     * @param validatorDestinationAddress validator address to which the delegation will be moved
     * @param amountZeta how many tokens to redelegate in ZETA
     */
    craftRedelegateTx(accountId, pubkey, validatorSourceAddress, validatorDestinationAddress, amountZeta) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/zeta/transaction/redelegate`, {
                account_id: accountId,
                pubkey: pubkey,
                validator_source: validatorSourceAddress,
                validator_destination: validatorDestinationAddress,
                amount_azeta: amountZeta ? this.zetaToAZeta(amountZeta.toString()) : undefined,
            });
            return data;
        });
    }
    /**
     * Craft zeta send transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param to recipient address
     * @param amountZeta how many tokens to send in ZETA
     */
    craftSendTx(pubkey, to, amountZeta) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/zeta/transaction/send`, {
                pubkey: pubkey,
                amount_azeta: this.zetaToAZeta(amountZeta.toString()),
                to: to,
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
            const fbNote = note ? note : "ZETA tx from @kilnfi/sdk";
            const signer = this.getFbSigner(integration);
            const payload = {
                rawMessageData: {
                    messages: [
                        {
                            content: tx.data.unsigned_tx_hash,
                            derivationPath: [44, 118, integration.vaultId, 0, 0],
                            preHash: {
                                content: tx.data.unsigned_tx_serialized,
                                hashAlgorithm: "SHA256",
                            },
                        },
                    ],
                    algorithm: fireblocks_sdk_1.SigningAlgorithm.MPC_ECDSA_SECP256K1,
                },
            };
            const fbTx = yield signer.sign(payload, undefined, fbNote);
            const signature = fbTx.signedMessages[0].signature.fullSig;
            const { data } = yield api_1.api.post(`/v1/zeta/transaction/prepare`, {
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
            const { data } = yield api_1.api.post(`/v1/zeta/transaction/broadcast`, {
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
            const { data } = yield api_1.api.get(`/v1/zeta/transaction/status?tx_hash=${txHash}`);
            return data;
        });
    }
    /**
     * Decode transaction
     * @param txSerialized transaction serialized
     */
    decodeTx(txSerialized) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/zeta/transaction/decode?tx_serialized=${txSerialized}`);
            return data;
        });
    }
}
exports.ZetaService = ZetaService;
