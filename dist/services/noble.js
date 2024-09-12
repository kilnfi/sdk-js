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
exports.NobleService = void 0;
const service_1 = require("./service");
const api_1 = require("../api");
const viem_1 = require("viem");
class NobleService extends service_1.Service {
    constructor({ testnet }) {
        super({ testnet });
    }
    usdcToUusdc(amountUsdc) {
        return (0, viem_1.parseUnits)(amountUsdc, 6).toString();
    }
    /**
     * Get balance of given address for given denom (uusdc on NOBLE)
     * @param address
     * @param denom
     */
    getBalance(address, denom) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/noble/balance`, {
                address,
                denom,
            });
            return data;
        });
    }
    /**
     * Burn noble USDC to it can be minted on Ethereum
     * @param pubkey
     * @param recipient
     * @param amountUsdc
     */
    craftBurnUsdc(pubkey, recipient, amountUsdc) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/noble/transaction/burn-usdc`, {
                pubkey: pubkey,
                recipient: recipient,
                amount_uusdc: this.usdcToUusdc(amountUsdc.toString()),
            });
            return data;
        });
    }
    /**
     * Transfer IBC USDC from your account to an OSMO account
     * @param pubkey
     * @param recipient
     * @param amountUsdc
     */
    craftOsmoIbcTransfer(pubkey, recipient, amountUsdc) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post(`/v1/noble/transaction/osmo-ibc-transfer`, {
                pubkey,
                recipient,
                amount_uusdc: this.usdcToUusdc(amountUsdc.toString()),
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
            const fbNote = note ? note : "NOBLE tx from @kilnfi/sdk";
            const signer = this.getFbSigner(integration);
            // NOBLE chain is not supported by Fireblocks, so we use DYDX_DYDX
            const fbTx = yield signer.sign(payload, "DYDX_DYDX", fbNote);
            const signature = fbTx.signedMessages[0].signature.fullSig;
            const { data } = yield api_1.api.post(`/v1/noble/transaction/prepare`, {
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
            const { data } = yield api_1.api.post(`/v1/noble/transaction/broadcast`, {
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
            const { data } = yield api_1.api.get(`/v1/noble/transaction/status?tx_hash=${txHash}`);
            return data;
        });
    }
    /**
     * Decode transaction
     * @param txSerialized transaction serialized
     */
    decodeTx(txSerialized) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/noble/transaction/decode?tx_serialized=${txSerialized}`);
            return data;
        });
    }
}
exports.NobleService = NobleService;
