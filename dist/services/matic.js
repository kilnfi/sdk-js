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
exports.MaticService = void 0;
const api_1 = require("../api");
const service_1 = require("./service");
const ethers_1 = require("ethers");
class MaticService extends service_1.Service {
    constructor({ testnet }) {
        super({ testnet });
    }
    /**
     * @deprecated Please use POL functions instead
     * Craft an approve transaction to the MATIC token contract allowing the contract given to spend the amount given
     * If no amount is provided, an infinite amount will be approved
     * @param walletAddress wallet address signing the transaction
     * @param contractAddressToApprove contract address that you allow to spend the token
     * @param amountMatic how many tokens to approve the spending, if not specified an infinite amount will be approved
     */
    craftApproveTx(walletAddress, contractAddressToApprove, amountMatic) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/matic/transaction/approve`, {
                wallet: walletAddress,
                contract: contractAddressToApprove,
                amount_wei: amountMatic ? this.maticToWei(amountMatic === null || amountMatic === void 0 ? void 0 : amountMatic.toString()) : undefined,
            });
            return data;
        });
    }
    /**
     * @deprecated Please use POL functions instead
     * Craft a buyVoucher transaction to a ValidatorShare proxy contract
     * It also links the stake to the account id given
     * @param accountId id of the kiln account to use for the stake transaction
     * @param walletAddress withdrawal creds /!\ losing it => losing the ability to withdraw
     * @param validatorShareProxyAddress ValidatorShare proxy contract address of the validator
     * @param amountMatic how many tokens to stake in MATIC
     */
    craftBuyVoucherTx(accountId, walletAddress, validatorShareProxyAddress, amountMatic) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/matic/transaction/buy-voucher`, {
                account_id: accountId,
                wallet: walletAddress,
                amount_wei: this.maticToWei(amountMatic.toString()),
                validator_share_proxy_address: validatorShareProxyAddress,
            });
            return data;
        });
    }
    /**
     * @deprecated Please use POL functions instead
     * Craft a sellVoucher transaction to a ValidatorShare proxy contract
     * Note there that your tokens will be unbonding and locked for 21 days after this transaction
     * @param walletAddress address delegating
     * @param validatorShareProxyAddress ValidatorShare proxy contract address of the validator
     * @param amountMatic how many tokens to unbond in MATIC
     */
    craftSellVoucherTx(walletAddress, validatorShareProxyAddress, amountMatic) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/matic/transaction/sell-voucher`, {
                wallet: walletAddress,
                amount_wei: this.maticToWei(amountMatic.toString()),
                validator_share_proxy_address: validatorShareProxyAddress,
            });
            return data;
        });
    }
    /**
     * @deprecated Please use POL functions instead
     * Craft an unstakeClaimTokens transaction to a ValidatorShare proxy contract
     * Note that your tokens must be unbonded before you can claim them
     * @param walletAddress address delegating
     * @param validatorShareProxyAddress ValidatorShare proxy contract address of the validator
     */
    craftUnstakeClaimTokensTx(walletAddress, validatorShareProxyAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/matic/transaction/unstake-claim-tokens`, {
                wallet: walletAddress,
                validator_share_proxy_address: validatorShareProxyAddress,
            });
            return data;
        });
    }
    /**
     * @deprecated Please use POL functions instead
     * Craft an withdrawRewards transaction to a ValidatorShare proxy contract
     * All rewards earned are transferred to the delegator's wallet
     * @param walletAddress address delegating
     * @param validatorShareProxyAddress ValidatorShare proxy contract address of the validator
     */
    craftWithdrawRewardsTx(walletAddress, validatorShareProxyAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/matic/transaction/withdraw-rewards`, {
                wallet: walletAddress,
                validator_share_proxy_address: validatorShareProxyAddress,
            });
            return data;
        });
    }
    /**
     * @deprecated Please use POL functions instead
     * Craft an withdrawRewards transaction to a ValidatorShare proxy contract
     * All rewards earned are then re-delegated
     * @param walletAddress address delegating
     * @param validatorShareProxyAddress ValidatorShare proxy contract address of the validator
     */
    craftRestakeRewardsTx(walletAddress, validatorShareProxyAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/matic/transaction/restake-rewards`, {
                wallet: walletAddress,
                validator_share_proxy_address: validatorShareProxyAddress,
            });
            return data;
        });
    }
    /**
     * @deprecated Please use POL functions instead
     * Sign transaction with given integration
     * @param integration custody solution to sign with
     * @param tx raw transaction
     * @param note note to identify the transaction in your custody solution
     */
    sign(integration, tx, note) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const payload = {
                rawMessageData: {
                    messages: [
                        {
                            content: tx.data.unsigned_tx_hash,
                            preHash: {
                                content: tx.data.unsigned_tx_serialized,
                                hashAlgorithm: "KECCAK256",
                            },
                        },
                    ],
                },
            };
            const fbSigner = this.getFbSigner(integration);
            const fbNote = note ? note : "MATIC tx from @kilnfi/sdk";
            const fbTx = yield fbSigner.sign(payload, this.testnet ? "ETH_TEST5" : "ETH", fbNote);
            const { data } = yield api_1.api.post(`/v1/matic/transaction/prepare`, {
                unsigned_tx_serialized: tx.data.unsigned_tx_serialized,
                r: `0x${(_a = fbTx === null || fbTx === void 0 ? void 0 : fbTx.signedMessages) === null || _a === void 0 ? void 0 : _a[0].signature.r}`,
                s: `0x${(_b = fbTx === null || fbTx === void 0 ? void 0 : fbTx.signedMessages) === null || _b === void 0 ? void 0 : _b[0].signature.s}`,
                v: (_d = (_c = fbTx === null || fbTx === void 0 ? void 0 : fbTx.signedMessages) === null || _c === void 0 ? void 0 : _c[0].signature.v) !== null && _d !== void 0 ? _d : 0,
            });
            data.data.fireblocks_tx = fbTx;
            return data;
        });
    }
    /**
     * @deprecated Please use POL functions instead
     * Sign transaction with given integration
     * @param integration custody solution to sign with
     * @param tx raw transaction
     * @param note note to identify the transaction in your custody solution
     */
    signAndBroadcast(integration, tx, note) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!integration.fireblocksDestinationId) {
                throw new Error("Fireblocks destination id is missing in integration");
            }
            const payload = {
                contractCallData: tx.data.contract_call_data,
            };
            const fbSigner = this.getFbSigner(integration);
            const fbNote = note ? note : "MATIC tx from @kilnfi/sdk";
            const assetId = this.testnet ? "ETH_TEST5" : "ETH";
            return yield fbSigner.signAndBroadcastWith(payload, assetId, tx, integration.fireblocksDestinationId, false, fbNote);
        });
    }
    /**
     * @deprecated Please use POL functions instead
     * Broadcast transaction to the network
     * @param signedTx
     */
    broadcast(signedTx) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/matic/transaction/broadcast`, {
                tx_serialized: signedTx.data.signed_tx_serialized,
            });
            return data;
        });
    }
    /**
     * @deprecated Please use POL functions instead
     * Get transaction status
     * @param txHash transaction hash
     */
    getTxStatus(txHash) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/matic/transaction/status?tx_hash=${txHash}`);
            return data;
        });
    }
    /**
     * @deprecated Please use POL functions instead
     * Decode transaction
     * @param txSerialized transaction serialized
     */
    decodeTx(txSerialized) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/matic/transaction/decode?tx_serialized=${txSerialized}`);
            return data;
        });
    }
    /**
     * @deprecated Please use POL functions instead
     * Convert MATIC to WEI
     * @param matic
     */
    maticToWei(matic) {
        return ethers_1.utils.parseEther(matic).toString();
    }
}
exports.MaticService = MaticService;
