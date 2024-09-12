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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NearService = void 0;
const near_api_js_1 = require("near-api-js");
const bn_js_1 = __importDefault(require("bn.js"));
const viem_1 = require("viem");
const service_1 = require("./service");
const utils_1 = require("near-api-js/lib/utils");
const api_1 = require("../api");
class NearService extends service_1.Service {
    constructor({ testnet }) {
        super({ testnet });
    }
    getConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            const officialRpc = `https://rpc.${this.testnet ? "testnet" : "mainnet"}.near.org`;
            const connectionConfig = {
                networkId: this.testnet ? "testnet" : "mainnet",
                nodeUrl: officialRpc,
            };
            return yield (0, near_api_js_1.connect)(connectionConfig);
        });
    }
    /**
     * Convert NEAR to YOCTO
     * @param amountNear
     */
    nearToYocto(amountNear) {
        var _a;
        return (_a = near_api_js_1.utils.format.parseNearAmount(amountNear)) !== null && _a !== void 0 ? _a : "0";
    }
    /**
     * Craft near stake transaction
     * @param accountId id of the kiln account to use for the stake transaction
     * @param walletId near wallet id
     * @param stakePoolId stake pool id
     * @param amountNear amount to stake in NEAR
     */
    craftStakeTx(accountId, walletId, stakePoolId, amountNear) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield this.getConnection();
            const account = yield connection.account(walletId);
            const accessKeys = yield account.getAccessKeys();
            const fullAccessKey = accessKeys.find((key) => key.access_key.permission === "FullAccess");
            if (!fullAccessKey) {
                throw new Error("Could not find access key");
            }
            const walletPubKey = utils_1.PublicKey.from(fullAccessKey.public_key);
            const nonce = new bn_js_1.default(1).add(fullAccessKey.access_key.nonce);
            // Max gas fee to use in NEAR (300 Tgas)
            const maxGasAmount = "0.0000000003";
            const parsedGasAmount = near_api_js_1.utils.format.parseNearAmount(maxGasAmount);
            if (!parsedGasAmount) {
                throw new Error("Could not parse gas amount");
            }
            const bnAmount = new bn_js_1.default(this.nearToYocto(amountNear.toString()));
            const bnMaxGasFees = new bn_js_1.default(parsedGasAmount);
            const actions = [near_api_js_1.transactions.functionCall("deposit_and_stake", {}, bnMaxGasFees, bnAmount)];
            const accessKey = yield connection.connection.provider.query(`access_key/${walletId}/${walletPubKey.toString()}`, "");
            const blockHash = near_api_js_1.utils.serialize.base_decode(accessKey.block_hash);
            const tx = near_api_js_1.transactions.createTransaction(walletId, walletPubKey, stakePoolId, nonce, actions, blockHash);
            // tag near stake
            const stake = {
                stakeAccount: `${stakePoolId}_${walletId}`,
                account: walletId,
            };
            yield api_1.api.post(`/v1/near/stakes`, {
                account_id: accountId,
                stakes: [stake],
            });
            return {
                data: {
                    tx,
                },
            };
        });
    }
    /**
     * Craft near unstake transaction, unstaking takes 2-3 epochs (~48 hours) and needs to be done before a staked amount can be withdrawn
     * @param walletId near wallet id
     * @param stakePoolId stake pool id
     * @param amountNear amount to unstake in NEAR
     */
    craftUnstakeTx(walletId, stakePoolId, amountNear) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield this.getConnection();
            const account = yield connection.account(walletId);
            const accessKeys = yield account.getAccessKeys();
            const fullAccessKey = accessKeys.find((key) => key.access_key.permission === "FullAccess");
            if (!fullAccessKey) {
                throw new Error("Could not find access key");
            }
            const walletPubKey = utils_1.PublicKey.from(fullAccessKey.public_key);
            const nonce = new bn_js_1.default(1).add(fullAccessKey.access_key.nonce);
            let params = {};
            if (amountNear) {
                params = {
                    amount: this.nearToYocto(amountNear.toString()),
                };
            }
            // Max gas fee to use in NEAR (300 Tgas)
            const maxGasAmount = "0.0000000003";
            const parsedGasAmount = near_api_js_1.utils.format.parseNearAmount(maxGasAmount);
            if (!parsedGasAmount) {
                throw new Error("Could not parse gas amount");
            }
            const bnAmount = new bn_js_1.default("0");
            const bnMaxGasFees = new bn_js_1.default(parsedGasAmount);
            const actions = [near_api_js_1.transactions.functionCall(amountNear ? "unstake" : "unstake_all", params, bnMaxGasFees, bnAmount)];
            const accessKey = yield connection.connection.provider.query(`access_key/${walletId}/${walletPubKey.toString()}`, "");
            const blockHash = near_api_js_1.utils.serialize.base_decode(accessKey.block_hash);
            const tx = near_api_js_1.transactions.createTransaction(walletId, walletPubKey, stakePoolId, nonce, actions, blockHash);
            return {
                data: {
                    tx,
                },
            };
        });
    }
    /**
     * Craft near withdraw transaction, withdrawing funds from a pool can only be done after previously unstaking funds
     * @param walletId near wallet id
     * @param stakePoolId stake pool id
     * @param amountNear amount to withdraw in NEAR
     */
    craftWithdrawTx(walletId, stakePoolId, amountNear) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield this.getConnection();
            const account = yield connection.account(walletId);
            const accessKeys = yield account.getAccessKeys();
            const fullAccessKey = accessKeys.find((key) => key.access_key.permission === "FullAccess");
            if (!fullAccessKey) {
                throw new Error("Could not find access key");
            }
            const walletPubKey = utils_1.PublicKey.from(fullAccessKey.public_key);
            const nonce = new bn_js_1.default(1).add(fullAccessKey.access_key.nonce);
            let params = {};
            if (amountNear) {
                params = {
                    amount: this.nearToYocto(amountNear.toString()),
                };
            }
            // Max gas fee to use in NEAR (300 Tgas)
            const maxGasAmount = "0.0000000003";
            const parsedGasAmount = near_api_js_1.utils.format.parseNearAmount(maxGasAmount);
            if (!parsedGasAmount) {
                throw new Error("Could not parse gas amount");
            }
            const bnAmount = new bn_js_1.default("0");
            const bnMaxGasFees = new bn_js_1.default(parsedGasAmount);
            const actions = [
                near_api_js_1.transactions.functionCall(amountNear ? "withdraw" : "withdraw_all", params, bnMaxGasFees, bnAmount),
            ];
            const accessKey = yield connection.connection.provider.query(`access_key/${walletId}/${walletPubKey.toString()}`, "");
            const blockHash = near_api_js_1.utils.serialize.base_decode(accessKey.block_hash);
            const tx = near_api_js_1.transactions.createTransaction(walletId, walletPubKey, stakePoolId, nonce, actions, blockHash);
            return {
                data: {
                    tx,
                },
            };
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
            const serializedTx = near_api_js_1.utils.serialize.serialize(near_api_js_1.transactions.SCHEMA, tx.data.tx);
            const serializedTxArray = new Uint8Array((0, viem_1.sha256)(serializedTx, "bytes"));
            const serializedTxHash = Buffer.from(serializedTxArray).toString("hex");
            const payload = {
                rawMessageData: {
                    messages: [
                        {
                            content: serializedTxHash,
                        },
                    ],
                },
            };
            const fbSigner = this.getFbSigner(integration);
            const fbNote = note ? note : "NEAR tx from @kilnfi/sdk";
            const fbTx = yield fbSigner.sign(payload, this.testnet ? "NEAR_TEST" : "NEAR", fbNote);
            const signature = fbTx.signedMessages[0];
            const signedTx = new near_api_js_1.transactions.SignedTransaction({
                transaction: tx.data.tx,
                signature: new near_api_js_1.transactions.Signature({
                    keyType: tx.data.tx.publicKey.keyType,
                    data: Uint8Array.from(Buffer.from(signature.signature.fullSig, "hex")),
                }),
            });
            return {
                data: {
                    fireblocks_tx: fbTx,
                    tx: signedTx,
                },
            };
        });
    }
    /**
     * Broadcast a signed near transaction to the network
     * @param signedTx
     */
    broadcast(signedTx) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield this.getConnection();
            const res = yield connection.connection.provider.sendTransaction(signedTx.data.tx);
            return {
                data: {
                    tx_hash: res.transaction.hash,
                },
            };
        });
    }
    /**
     * Get transaction status
     * @param transactionHash transaction hash
     * @param poolId pool id
     */
    getTxStatus(transactionHash, poolId) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield this.getConnection();
            const receipt = yield connection.connection.provider.txStatusReceipts(transactionHash, poolId);
            const status = Object.keys(receipt.status).includes("SuccessValue") ? "success" : "error";
            return {
                data: {
                    status: status,
                    receipt: receipt,
                },
            };
        });
    }
    /**
     * Decode transaction
     * @param txSerialized transaction serialized
     */
    decodeTx(txSerialized) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/near/transaction/decode?tx_serialized=${txSerialized}`);
            return data;
        });
    }
    /**
     * Retrieve stakes of given kiln accounts
     * @param accountIds kiln account ids of which you wish to retrieve stakes
     * @returns {NearStakes} Near Stakes
     */
    getStakesByAccounts(accountIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/near/stakes?accounts=${accountIds.join(",")}`);
            return data;
        });
    }
    /**
     * Retrieve stakes of given stake accounts
     * @param stakeAccounts list of stake accounts {poolId_walletId}
     * @returns {NearStakes} Near Stakes
     */
    getStakesByStakeAccounts(stakeAccounts) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/near/stakes?stake_accounts=${stakeAccounts.join(",")}`);
            return data;
        });
    }
    /**
     * Retrieve stakes of given wallets
     * @param wallets wallet addresses of which you wish to retrieve stakes
     * @returns {NearStakes} Near Stakes
     */
    getStakesByWallets(wallets) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/near/stakes?wallets=${wallets.join(",")}`);
            return data;
        });
    }
    /**
     * Retrieve rewards history of given kiln accounts
     * @param accountIds kiln account ids of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {NearStakes} Near Stakes
     */
    getRewardsByAccounts(accountIds, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/near/rewards?accounts=${accountIds.join(",")}${startDate ? `&start_date=${startDate}` : ""}${endDate ? `&end_date=${endDate}` : ""}`);
            return data;
        });
    }
    /**
     * Retrieve rewards history of given stake accounts
     * @param stakeAccounts list of stake accounts {poolId_walletId}
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {NearRewards} Near Rewards
     */
    getRewardsByStakeAccounts(stakeAccounts, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/near/rewards?stake_accounts=${stakeAccounts.join(",")}${startDate ? `&start_date=${startDate}` : ""}${endDate ? `&end_date=${endDate}` : ""}`);
            return data;
        });
    }
    /**
     * Retrieve rewards history of given wallets
     * @param wallets wallet addresses of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {NearRewards} Near Rewards
     */
    getRewardsByWallets(wallets, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/near/rewards?wallets=${wallets.join(",")}${startDate ? `&start_date=${startDate}` : ""}${endDate ? `&end_date=${endDate}` : ""}`);
            return data;
        });
    }
    /**
     * Retrieve NEAR network stats
     */
    getNetworkStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/near/network-stats`);
            return data;
        });
    }
}
exports.NearService = NearService;
