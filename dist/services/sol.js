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
exports.SolService = void 0;
const api_1 = require("../api");
const service_1 = require("./service");
const viem_1 = require("viem");
class SolService extends service_1.Service {
    constructor({ testnet }) {
        super({ testnet });
    }
    /**
     * Craft Solana staking transaction
     * @param accountId id of the kiln account to use for the stake transaction
     * @param walletAddress used to create the stake account and retrieve rewards in the future
     * @param voteAccountAddress vote account address of the validator that you wish to delegate to
     * @param amountSol how much to stake in SOL (min 0.01 SOL)
     * @param memo custom memo message to include in the transaction
     */
    craftStakeTx(accountId, walletAddress, voteAccountAddress, amountSol, memo) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/sol/transaction/stake`, {
                account_id: accountId,
                wallet: walletAddress,
                amount_lamports: this.solToLamports(amountSol.toString()),
                vote_account_address: voteAccountAddress,
                memo,
            });
            return data;
        });
    }
    /**
     * Craft Solana desactivate stake account transaction
     * @param stakeAccountAddress stake account address to deactivate
     * @param walletAddress wallet that has authority over the stake account
     */
    craftDeactivateStakeTx(stakeAccountAddress, walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/sol/transaction/deactivate-stake`, {
                stake_account: stakeAccountAddress,
                wallet: walletAddress,
            });
            return data;
        });
    }
    /**
     * Craft Solana withdraw stake transaction
     * @param stakeAccountAddress stake account address to deactivate
     * @param walletAddress wallet that has authority over the stake account
     * @param amountSol: amount to withdraw in SOL, if not specified the whole balance will be withdrawn
     */
    craftWithdrawStakeTx(stakeAccountAddress, walletAddress, amountSol) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/sol/transaction/withdraw-stake`, {
                stake_account: stakeAccountAddress,
                wallet: walletAddress,
                amount_lamports: amountSol ? this.solToLamports(amountSol.toString()) : undefined,
            });
            return data;
        });
    }
    /**
     * Craft merge stake accounts transaction, merging stake accounts can only be done on these conditions
     * https://docs.solana.com/staking/stake-accounts#merging-stake-accounts
     * @param stakeAccountSourceAddress source stake account to merge into the destination stake account
     * @param stakeAccountDestinationAddress stake account to merge the source stake account into
     * @param walletAddress that has authority over the 2 stake accounts to merge
     */
    craftMergeStakesTx(stakeAccountSourceAddress, stakeAccountDestinationAddress, walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/sol/transaction/merge-stakes`, {
                stake_account_source: stakeAccountSourceAddress,
                stake_account_destination: stakeAccountDestinationAddress,
                wallet: walletAddress,
            });
            return data;
        });
    }
    /**
     * Craft split stake account transaction
     * @param accountId kiln account id to associate the new stake account with
     * @param stakeAccountAddress stake account to split
     * @param walletAddress that has authority over the stake account to split
     * @param amountSol amount in SOL to put in the new stake account
     */
    craftSplitStakeTx(accountId, stakeAccountAddress, walletAddress, amountSol) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/sol/transaction/split-stake`, {
                account_id: accountId,
                stake_account: stakeAccountAddress,
                wallet: walletAddress,
                amount_lamports: this.solToLamports(amountSol.toString()),
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
            var _a;
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
            const fbNote = note ? note : "SOL tx from @kilnfi/sdk";
            const fbTx = yield fbSigner.sign(payload, this.testnet ? "SOL_TEST" : "SOL", fbNote);
            const signatures = [];
            (_a = fbTx.signedMessages) === null || _a === void 0 ? void 0 : _a.forEach((signedMessage) => {
                if (signedMessage.derivationPath[3] == 0) {
                    signatures.push(signedMessage.signature.fullSig);
                }
            });
            const { data } = yield api_1.api.post(`/v1/sol/transaction/prepare`, {
                unsigned_tx_serialized: tx.data.unsigned_tx_serialized,
                signatures: signatures,
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
            const { data } = yield api_1.api.post(`/v1/sol/transaction/broadcast`, {
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
            const { data } = yield api_1.api.get(`/v1/sol/transaction/status?tx_hash=${txHash}`);
            return data;
        });
    }
    /**
     * Decode transaction
     * @param txSerialized transaction serialized
     */
    decodeTx(txSerialized) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/sol/transaction/decode?tx_serialized=${txSerialized}`);
            return data;
        });
    }
    /**
     * Retrieve stakes of given kiln accounts
     * @param accountIds kiln account ids of which you wish to retrieve stakes
     * @returns {SolStakes} Solana Stakes
     */
    getStakesByAccounts(accountIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/sol/stakes?accounts=${accountIds.join(",")}`);
            return data;
        });
    }
    /**
     * Retrieve stakes of given stake accounts
     * @param stakeAccounts stake account addresses of which you wish to retrieve stakes
     * @returns {SolStakes} Solana Stakes
     */
    getStakesByStakeAccounts(stakeAccounts) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/sol/stakes?stake_accounts=${stakeAccounts.join(",")}`);
            return data;
        });
    }
    /**
     * Retrieve stakes of given wallets
     * @param wallets wallet addresses of which you wish to retrieve stakes
     * @returns {SolStakes} Solana Stakes
     */
    getStakesByWallets(wallets) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/sol/stakes?wallets=${wallets.join(",")}`);
            return data;
        });
    }
    /**
     * Retrieve rewards for given accounts
     * @param accountIds kiln account ids of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {SolRewards} Solana rewards
     */
    getRewardsByAccounts(accountIds, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `/v1/sol/rewards?accounts=${accountIds.join(",")}${startDate ? `&start_date=${startDate}` : ""}${endDate ? `&end_date=${endDate}` : ""}`;
            const { data } = yield api_1.api.get(query);
            return data;
        });
    }
    /**
     * Retrieve rewards for given stake accounts
     * @param stakeAccounts stake account addresses of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {SolRewards} Solana rewards
     */
    getRewardsByStakeAccounts(stakeAccounts, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `/v1/sol/rewards?stake_accounts=${stakeAccounts.join(",")}${startDate ? `&start_date=${startDate}` : ""}${endDate ? `&end_date=${endDate}` : ""}`;
            const { data } = yield api_1.api.get(query);
            return data;
        });
    }
    /**
     * Retrieve rewards for given stake accounts
     * @param wallets wallet addresses of which you wish to retrieve rewards
     * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
     * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
     * @returns {SolRewards} Solana rewards
     */
    getRewardsByWallets(wallets, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `/v1/sol/rewards?wallets=${wallets.join(",")}${startDate ? `&start_date=${startDate}` : ""}${endDate ? `&end_date=${endDate}` : ""}`;
            const { data } = yield api_1.api.get(query);
            return data;
        });
    }
    /**
     * Retrieve SOL network stats
     */
    getNetworkStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/sol/network-stats`);
            return data;
        });
    }
    /**
     * Convert SOL to Lamports
     * @param sol
     */
    solToLamports(sol) {
        return (0, viem_1.parseUnits)(sol, 9).toString();
    }
}
exports.SolService = SolService;
