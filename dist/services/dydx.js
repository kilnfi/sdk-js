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
exports.DydxService = void 0;
const service_1 = require("./service");
const api_1 = require("../api");
const viem_1 = require("viem");
class DydxService extends service_1.Service {
    constructor({ testnet }) {
        super({ testnet });
    }
    /**
     * Convert DYDX to ADYDX
     * @param amountDydx
     */
    dydxToAdydx(amountDydx) {
        return (0, viem_1.parseUnits)(amountDydx, 18).toString();
    }
    usdcToUusdc(amountUsdc) {
        return (0, viem_1.parseUnits)(amountUsdc, 6).toString();
    }
    /**
     * Craft dydx staking transaction
     * @param accountId id of the kiln account to use for the stake transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to delegate to
     * @param amountDydx how many tokens to stake in DYDX
     */
    craftStakeTx(accountId, pubkey, validatorAddress, amountDydx) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/dydx/transaction/stake`, {
                account_id: accountId,
                pubkey: pubkey,
                validator: validatorAddress,
                amount_adydx: this.dydxToAdydx(amountDydx.toString()),
            });
            return data;
        });
    }
    /**
     * Craft dydx withdraw rewards transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to which the delegation has been made
     */
    craftWithdrawRewardsTx(pubkey, validatorAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/dydx/transaction/withdraw-rewards`, {
                pubkey: pubkey,
                validator: validatorAddress,
            });
            return data;
        });
    }
    /**
     * Craft dydx unstaking transaction
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorAddress validator address to which the delegation has been made
     * @param amountDydx how many tokens to undelegate in DYDX
     */
    craftUnstakeTx(pubkey, validatorAddress, amountDydx) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/dydx/transaction/unstake`, {
                pubkey: pubkey,
                validator: validatorAddress,
                amount_adydx: amountDydx ? this.dydxToAdydx(amountDydx.toString()) : undefined,
            });
            return data;
        });
    }
    /**
     * Craft dydx redelegate transaction
     * @param accountId id of the kiln account to use for the new stake
     * @param pubkey wallet pubkey, this is different from the wallet address
     * @param validatorSourceAddress validator address of the current delegation
     * @param validatorDestinationAddress validator address to which the delegation will be moved
     * @param amountDydx how many tokens to redelegate in DYDX
     */
    craftRedelegateTx(accountId, pubkey, validatorSourceAddress, validatorDestinationAddress, amountDydx) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/dydx/transaction/redelegate`, {
                account_id: accountId,
                pubkey: pubkey,
                validator_source: validatorSourceAddress,
                validator_destination: validatorDestinationAddress,
                amount_adydx: amountDydx ? this.dydxToAdydx(amountDydx.toString()) : undefined,
            });
            return data;
        });
    }
    /**
     * Transfer IBC USDC from your account to your NOBLE account
     * @param pubkey
     * @param amountUsdc
     */
    craftNobleIbcTransfer(pubkey, amountUsdc) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/dydx/transaction/noble-ibc-transfer`, {
                pubkey: pubkey,
                amount_uusdc: this.usdcToUusdc(amountUsdc.toString()),
            });
            return data;
        });
    }
    /**
     * Get balance of given address for given denom (ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5 for USDC on DYDX)
     * @param address
     * @param denom
     */
    getBalance(address, denom) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/dydx/balance`, {
                address,
                denom,
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
            const fbNote = note ? note : "DYDX tx from @kilnfi/sdk";
            const signer = this.getFbSigner(integration);
            const fbTx = yield signer.sign(payload, "DYDX_DYDX", fbNote);
            const signature = fbTx.signedMessages[0].signature.fullSig;
            const { data } = yield api_1.api.post(`/v1/dydx/transaction/prepare`, {
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
            const { data } = yield api_1.api.post(`/v1/dydx/transaction/broadcast`, {
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
            const { data } = yield api_1.api.get(`/v1/dydx/transaction/status?tx_hash=${txHash}`);
            return data;
        });
    }
    /**
     * Decode transaction
     * @param txSerialized transaction serialized
     */
    decodeTx(txSerialized) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/dydx/transaction/decode?tx_serialized=${txSerialized}`);
            return data;
        });
    }
}
exports.DydxService = DydxService;
