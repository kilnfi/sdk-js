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
exports.AdaService = void 0;
const service_1 = require("./service");
const api_1 = require("../api");
const viem_1 = require("viem");
class AdaService extends service_1.Service {
    constructor({ testnet }) {
        super({ testnet });
    }
    /**
     * Craft ada delegate transaction, all the wallet's balance will be delegated to the pool
     * @param accountId id of the kiln account to use for the stake transaction
     * @param walletAddress withdrawal creds /!\ losing it => losing the ability to withdraw
     * @param poolId pool id (bech32) to delegate to, eg. KILN0 - pool10rdglgh4pzvkf936p2m669qzarr9dusrhmmz9nultm3uvq4eh5k
     */
    craftStakeTx(accountId, walletAddress, poolId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/ada/transaction/stake`, {
                account_id: accountId,
                wallet: walletAddress,
                pool_id: poolId,
            });
            return data;
        });
    }
    /**
     * Craft ada withdraw rewards transaction
     * @param walletAddress wallet delegating that will receive the rewards
     * @param amountAda amount of rewards to withdraw in ADA, if not provided all rewards are withdrawn
     */
    craftWithdrawRewardsTx(walletAddress, amountAda) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/ada/transaction/withdraw-rewards`, {
                wallet: walletAddress,
                amount_lovelace: amountAda ? this.adaToLovelace(amountAda.toString()) : undefined,
            });
            return data;
        });
    }
    /**
     * Craft ada undelegate transaction
     * @param walletAddress wallet delegating that will receive the rewards
     */
    craftUnstakeTx(walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/ada/transaction/unstake`, {
                wallet: walletAddress,
            });
            return data;
        });
    }
    /**
     * Convert ADA to Lovelace
     * @param amountAda
     */
    adaToLovelace(amountAda) {
        return (0, viem_1.parseUnits)(amountAda, 6).toString();
    }
    /**
     * Sign transaction with given integration
     * @param integration custody solution to sign with
     * @param tx raw ada transaction
     * @param note note to identify the transaction in your custody solution
     */
    sign(integration, tx, note) {
        return __awaiter(this, void 0, void 0, function* () {
            const fbSigner = this.getFbSigner(integration);
            const payload = {
                rawMessageData: {
                    messages: [
                        {
                            content: tx.data.unsigned_tx_hash,
                        },
                        {
                            content: tx.data.unsigned_tx_hash,
                            bip44change: 2,
                        },
                    ],
                },
                inputsSelection: {
                    inputsToSpend: tx.data.inputs,
                },
            };
            const fbNote = note ? note : "ADA tx from @kilnfi/sdk";
            const fbTx = yield fbSigner.sign(payload, "ADA", fbNote);
            if (!fbTx.signedMessages) {
                throw new Error(`Could not sign the transaction.`);
            }
            const signedMessages = fbTx.signedMessages.map((message) => {
                return {
                    pubkey: message.publicKey,
                    signature: message.signature.fullSig,
                };
            });
            const { data } = yield api_1.api.post(`/v1/ada/transaction/prepare`, {
                unsigned_tx_serialized: tx.data.unsigned_tx_serialized,
                signed_messages: signedMessages,
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
            const { data } = yield api_1.api.post(`/v1/ada/transaction/broadcast`, {
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
            const { data } = yield api_1.api.get(`/v1/ada/transaction/status?tx_hash=${txHash}`);
            return data;
        });
    }
    /**
     * Decode transaction
     * @param txSerialized transaction serialized
     */
    decodeTx(txSerialized) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/ada/transaction/decode?tx_serialized=${txSerialized}`);
            return data;
        });
    }
    /**
     * Retrieve stakes of given kiln accounts
     * @param accountIds kiln account ids of which you wish to retrieve stakes
     * @returns {AdaStakes} Cardano Stakes
     */
    getStakesByAccounts(accountIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/ada/stakes?accounts=${accountIds.join(",")}`);
            return data;
        });
    }
    /**
     * Retrieve stakes of given stake accounts
     * @param stakeAddresses stake addresses of which you wish to retrieve stakes
     * @returns {AdaStakes} Cardano Stakes
     */
    getStakesByStakeAddresses(stakeAddresses) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/ada/stakes?stake_addresses=${stakeAddresses.join(",")}`);
            return data;
        });
    }
    /**
     * Retrieve stakes of given wallets
     * @param wallets wallet addresses of which you wish to retrieve stakes
     * @returns {AdaStakes} Cardano Stakes
     */
    getStakesByWallets(wallets) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/ada/stakes?wallets=${wallets.join(",")}`);
            return data;
        });
    }
    /**
     * Retrieve rewards for given accounts
     * @param accountIds kiln account ids of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {AdaRewards} Cardano rewards
     */
    getRewardsByAccounts(accountIds, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `/v1/ada/rewards?accounts=${accountIds.join(",")}${startDate ? `&start_date=${startDate}` : ""}${endDate ? `&end_date=${endDate}` : ""}`;
            const { data } = yield api_1.api.get(query);
            return data;
        });
    }
    /**
     * Retrieve rewards for given stake accounts
     * @param stakeAddresses stake addresses of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {AdaRewards} Cardano rewards
     */
    getRewardsByStakeAddresses(stakeAddresses, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `/v1/ada/rewards?stake_addresses=${stakeAddresses.join(",")}${startDate ? `&start_date=${startDate}` : ""}${endDate ? `&end_date=${endDate}` : ""}`;
            const { data } = yield api_1.api.get(query);
            return data;
        });
    }
    /**
     * Retrieve rewards for given stake accounts
     * @param wallets wallet addresses of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {AdaRewards} Cardano rewards
     */
    getRewardsByWallets(wallets, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `/v1/ada/rewards?wallets=${wallets.join(",")}${startDate ? `&start_date=${startDate}` : ""}${endDate ? `&end_date=${endDate}` : ""}`;
            const { data } = yield api_1.api.get(query);
            return data;
        });
    }
    /**
     * Retrieve ADA network stats
     */
    getNetworkStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/ada/network-stats`);
            return data;
        });
    }
}
exports.AdaService = AdaService;
