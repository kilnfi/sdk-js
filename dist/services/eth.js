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
exports.EthService = void 0;
const api_1 = require("../api");
const service_1 = require("./service");
const ethers_1 = require("ethers");
class EthService extends service_1.Service {
    constructor({ testnet }) {
        super({ testnet });
    }
    /**
     * Spin up Ethereum validators and craft a staking transaction
     * @param accountId id of the kiln account to use for the stake transaction
     * @param walletAddress withdrawal creds /!\ losing it => losing the ability to withdraw
     * @param amountEth how many tokens to stake in ETH (must be a multiple of 32)
     */
    craftStakeTx(accountId, walletAddress, amountEth) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/eth/transaction/stake`, {
                account_id: accountId,
                wallet: walletAddress,
                amount_wei: this.ethToWei(amountEth.toString()),
            });
            return data;
        });
    }
    /**
     * Request the exit of validators
     * @param walletAddress wallet address used to send the tx
     * @param validatorAddresses list of validator addresses to exit
     */
    craftExitRequestTx(walletAddress, validatorAddresses) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/eth/transaction/exit-request`, {
                wallet: walletAddress,
                validators: validatorAddresses,
            });
            return data;
        });
    }
    /**
     * Sign transaction with given integration
     * @param integration custody solution to sign with
     * @param tx ETH transaction
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
            const assetId = this.testnet ? "ETH_TEST6" : "ETH";
            const fbNote = note ? note : "ETH tx from @kilnfi/sdk";
            const fbTx = yield fbSigner.sign(payload, assetId, fbNote);
            const { data } = yield api_1.api.post(`/v1/eth/transaction/prepare`, {
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
     * Sign transaction with given integration using Fireblocks contract call feature
     * @param integration custody solution to sign with
     * @param tx ETH transaction
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
            const assetId = this.testnet ? "ETH_TEST6" : "ETH";
            const fbNote = note ? note : "ETH tx from @kilnfi/sdk";
            return yield fbSigner.signAndBroadcastWith(payload, assetId, tx, integration.fireblocksDestinationId, true, fbNote);
        });
    }
    /**
     * Broadcast transaction to the network
     * @param signedTx
     */
    broadcast(signedTx) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/eth/transaction/broadcast`, {
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
            const { data } = yield api_1.api.get(`/v1/eth/transaction/status?tx_hash=${txHash}`);
            return data;
        });
    }
    /**
     * Decode transaction
     * @param txSerialized transaction serialized
     */
    decodeTx(txSerialized) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/eth/transaction/decode?tx_serialized=${txSerialized}`);
            return data;
        });
    }
    /**
     * Retrieve stakes of given kiln accounts
     * @param accountIds account ids of which you wish to retrieve rewards
     * @returns {EthStakes} Ethereum Stakes
     */
    getStakesByAccounts(accountIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/eth/stakes?accounts=${accountIds.join(",")}`);
            return data;
        });
    }
    /**
     * Retrieve stakes of given wallet addresses
     * @param walletAddresses addresses of the wallets of which you wish to retrieve rewards
     * @returns {EthStakes} Ethereum Stakes
     */
    getStakesByWallets(walletAddresses) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/eth/stakes?wallets=${walletAddresses.join(",")}`);
            return data;
        });
    }
    /**
     * Retrieve stakes on given validator addresses
     * @param validatorAddresses validator addresses of which you wish to retrieve rewards
     * @returns {EthStakes} Ethereum Stakes
     */
    getStakesByValidators(validatorAddresses) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/eth/stakes?validators=${validatorAddresses.join(",")}`);
            return data;
        });
    }
    /**
     * Retrieve rewards by day of given kiln accounts
     * @param accountIds account ids of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {EthRewards} Ethereum rewards
     */
    getRewardsByAccounts(accountIds, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `/v1/eth/rewards?accounts=${accountIds.join(",")}${startDate ? `&start_date=${startDate}` : ""}${endDate ? `&end_date=${endDate}` : ""}`;
            const { data } = yield api_1.api.get(query);
            return data;
        });
    }
    /**
     * Retrieve rewards by day of given wallet addresses
     * @param walletAddresses addresses of the wallets of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {EthRewards} Ethereum rewards
     */
    getRewardsByWallets(walletAddresses, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `/v1/eth/rewards?wallets=${walletAddresses.join(",")}${startDate ? `&start_date=${startDate}` : ""}${endDate ? `&end_date=${endDate}` : ""}`;
            const { data } = yield api_1.api.get(query);
            return data;
        });
    }
    /**
     * Retrieve rewards by day on given validator addresses
     * @param validatorAddresses validator addresses of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {EthRewards} Ethereum rewards
     */
    getRewardsByValidators(validatorAddresses, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `/v1/eth/rewards?validators=${validatorAddresses.join(",")}${startDate ? `&start_date=${startDate}` : ""}${endDate ? `&end_date=${endDate}` : ""}`;
            const { data } = yield api_1.api.get(query);
            return data;
        });
    }
    /**
     * Retrieve ETH network stats
     */
    getNetworkStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/eth/network-stats`);
            return data;
        });
    }
    /**
     * Retrieve ETH kiln stats
     */
    getKilnStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/eth/kiln-stats`);
            return data;
        });
    }
    /**
     * Convert ETH to WEI
     * @param eth
     */
    ethToWei(eth) {
        return ethers_1.utils.parseEther(eth).toString();
    }
}
exports.EthService = EthService;
