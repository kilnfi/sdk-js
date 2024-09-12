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
exports.TonService = void 0;
const api_1 = require("../api");
const service_1 = require("./service");
const viem_1 = require("viem");
class TonService extends service_1.Service {
    constructor({ testnet }) {
        super({ testnet });
    }
    /**
     * Craft TON staking transaction to a single nomination pool
     * @param accountId id of the kiln account to use for the stake transaction
     * @param walletAddress sender of the transaction
     * @param poolAddress single nomination pool address
     * @param amountTon how much to stake in TON
     */
    craftStakeSingleNominationPoolTx(accountId, walletAddress, poolAddress, amountTon) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/ton/transaction/stake-single-nomination-pool`, {
                account_id: accountId,
                wallet: walletAddress,
                amount_nanoton: this.tonToNanoTon(amountTon.toString()),
                pool_address: poolAddress,
            });
            return data;
        });
    }
    /**
     * Craft TON staking transaction to a nomination pool
     * @param accountId id of the kiln account to use for the stake transaction
     * @param walletAddress sender of the transaction
     * @param poolAddress nomination pool address
     * @param amountTon how much to stake in TON
     */
    craftStakeNominationPoolTx(accountId, walletAddress, poolAddress, amountTon) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/ton/transaction/stake-nomination-pool`, {
                account_id: accountId,
                wallet: walletAddress,
                amount_nanoton: this.tonToNanoTon(amountTon.toString()),
                pool_address: poolAddress,
            });
            return data;
        });
    }
    /**
     * Craft TON unstake transaction from a single nomination pool
     * @param walletAddress sender of the transaction
     * @param poolAddress single nomination pool address
     * @param amountTon how much to stake in TON
     */
    craftUnstakeSingleNominationPoolTx(walletAddress, poolAddress, amountTon) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/ton/transaction/unstake-single-nomination-pool`, {
                wallet: walletAddress,
                amount_nanoton: amountTon ? this.tonToNanoTon(amountTon.toString()) : undefined,
                pool_address: poolAddress,
            });
            return data;
        });
    }
    /**
     * Craft TON unstake transaction from a nomination pool
     * @param walletAddress sender of the transaction
     * @param poolAddress nomination pool address
     */
    craftUnstakeNominationPoolTx(walletAddress, poolAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/ton/transaction/unstake-nomination-pool`, {
                wallet: walletAddress,
                pool_address: poolAddress,
            });
            return data;
        });
    }
    /**
     * Craft TON whitelist tx for vesting contract
     * @param walletAddress sender of the transaction
     * @param vestingContractAddress vesting contract address
     * @param addresses addresses to whitelist
     */
    craftWhitelistVestingContractTx(walletAddress, vestingContractAddress, addresses) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/ton/transaction/whitelist-vesting-contract`, {
                wallet: walletAddress,
                vesting_contract_address: vestingContractAddress,
                addresses: addresses,
            });
            return data;
        });
    }
    /**
     * Craft TON stake from a vesting contract tx
     * @param accountId id of the kiln account to use for the stake transaction
     * @param walletAddress sender of the transaction
     * @param vestingContractAddress vesting contract address
     * @param destinationAddress the destination to which the TON will be sent to
     * @param amountTon the amount of TON to send
     */
    craftStakeFromVestingContractTx(accountId, walletAddress, vestingContractAddress, destinationAddress, amountTon) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/ton/transaction/stake-from-vesting-contract`, {
                account_id: accountId,
                wallet: walletAddress,
                vesting_contract_address: vestingContractAddress,
                destination_address: destinationAddress,
                amount_nanoton: this.tonToNanoTon(amountTon.toString()),
            });
            return data;
        });
    }
    /**
     * Craft TON unstake from a vesting contract tx
     * @param walletAddress sender of the transaction
     * @param vestingContractAddress vesting contract address
     * @param poolAddress the pool address to unstake from
     * @param amountTon the amount of TON to unstake
     */
    craftUnstakeFromVestingContractTx(walletAddress, vestingContractAddress, poolAddress, amountTon) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/ton/transaction/unstake-from-vesting-contract`, {
                wallet: walletAddress,
                vesting_contract_address: vestingContractAddress,
                pool_address: poolAddress,
                amount_nanoton: this.tonToNanoTon(amountTon.toString()),
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
            const fbNote = note ? note : "TON tx from @kilnfi/sdk";
            const fbTx = yield fbSigner.sign(payload, this.testnet ? "TON_TEST" : "TON", fbNote);
            const signature = fbTx.signedMessages && fbTx.signedMessages.length > 0 ? fbTx.signedMessages[0].signature.fullSig : undefined;
            const { data } = yield api_1.api.post(`/v1/ton/transaction/prepare`, {
                unsigned_tx_serialized: tx.data.unsigned_tx_serialized,
                signature: signature,
                from: tx.data.from,
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
            const { data } = yield api_1.api.post(`/v1/ton/transaction/broadcast`, {
                tx_serialized: signedTx.data.signed_tx_serialized,
            });
            return data;
        });
    }
    /**
     * Get transaction status by message hash
     * @param msgHash transaction hash
     */
    getTxStatus(msgHash) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/ton/transaction/status?msg_hash=${msgHash}`);
            return data;
        });
    }
    /**
     * Convert TON to nanoTON
     * @param ton
     */
    tonToNanoTon(ton) {
        return (0, viem_1.parseUnits)(ton, 9).toString();
    }
}
exports.TonService = TonService;
