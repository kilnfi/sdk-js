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
exports.XtzService = void 0;
const api_1 = require("../api");
const service_1 = require("./service");
const viem_1 = require("viem");
class XtzService extends service_1.Service {
    constructor({ testnet }) {
        super({ testnet });
    }
    /**
     * Craft Tezos delegation transaction
     * @param accountId id of the kiln account to use for the stake transaction
     * @param walletAddress wallet address delegating
     * @param bakerAddress baker address that you wish to delegate to
     */
    craftStakeTx(accountId, walletAddress, bakerAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/xtz/transaction/stake`, {
                account_id: accountId,
                wallet: walletAddress,
                baker_address: bakerAddress,
            });
            return data;
        });
    }
    /**
     * Craft Tezos undelegation transaction
     * @param walletAddress wallet address delegating
     */
    craftUnStakeTx(walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/xtz/transaction/unstake`, {
                wallet: walletAddress,
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
                        },
                    ],
                },
            };
            const fbSigner = this.getFbSigner(integration);
            const fbNote = note ? note : "XTZ tx from @kilnfi/sdk";
            const fbTx = yield fbSigner.sign(payload, this.testnet ? "XTZ_TEST" : "XTZ", fbNote);
            const signature = fbTx.signedMessages[0].signature.fullSig;
            const { data } = yield api_1.api.post(`/v1/xtz/transaction/prepare`, {
                unsigned_tx_serialized: tx.data.unsigned_tx_serialized,
                signature: signature,
            });
            data.data.fireblocks_tx = fbTx;
            return data;
        });
    }
    /**
     * Broadcast transaction to the network
     * @param signedTx serialized signed tx
     */
    broadcast(signedTx) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/xtz/transaction/broadcast`, {
                tx_serialized: signedTx.data.signed_tx_serialized,
            });
            return data;
        });
    }
    /**
     * Get transaction status
     * @param blockNumber
     * @param txHash transaction hash
     */
    getTxStatus(blockNumber, txHash) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/xtz/transaction/status?block_number=${blockNumber}&tx_hash=${txHash}`);
            return data;
        });
    }
    /**
     * Decode transaction
     * @param txSerialized transaction serialized
     */
    decodeTx(txSerialized) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/xtz/transaction/decode?tx_serialized=${txSerialized}`);
            return data;
        });
    }
    /**
     * Retrieve stakes of given kiln accounts
     * @param accountIds account ids of which you wish to retrieve rewards
     * @returns {XtzStakes} Tezos Stakes
     */
    getStakesByAccounts(accountIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/xtz/stakes?accounts=${accountIds.join(",")}`);
            return data;
        });
    }
    /**
     * Retrieve stakes of given wallet addresses
     * @param walletAddresses addresses of the wallets of which you wish to retrieve rewards
     * @returns {XtzStakes} Tezos Stakes
     */
    getStakesByWallets(walletAddresses) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/xtz/stakes?wallets=${walletAddresses.join(",")}`);
            return data;
        });
    }
    /**
     * Retrieve rewards by day of given kiln accounts
     * @param accountIds account ids of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {XtzRewards} Tezos rewards
     */
    getRewardsByAccounts(accountIds, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `/v1/xtz/rewards?accounts=${accountIds.join(",")}${startDate ? `&start_date=${startDate}` : ""}${endDate ? `&end_date=${endDate}` : ""}`;
            const { data } = yield api_1.api.get(query);
            return data;
        });
    }
    /**
     * Retrieve rewards by day of given wallet addresses
     * @param walletAddresses addresses of the wallets of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {XtzRewards} Tezos rewards
     */
    getRewardsByWallets(walletAddresses, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `/v1/xtz/rewards?wallets=${walletAddresses.join(",")}${startDate ? `&start_date=${startDate}` : ""}${endDate ? `&end_date=${endDate}` : ""}`;
            const { data } = yield api_1.api.get(query);
            return data;
        });
    }
    /**
     * Retrieve XTZ network stats
     */
    getNetworkStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/xtz/network-stats`);
            return data;
        });
    }
    /**
     * Convert XTZ to mutez
     * @param xtz
     */
    xtzToMutez(xtz) {
        return (0, viem_1.parseUnits)(xtz, 6).toString();
    }
}
exports.XtzService = XtzService;
