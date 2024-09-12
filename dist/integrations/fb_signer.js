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
exports.FbSigner = void 0;
const fireblocks_sdk_1 = require("fireblocks-sdk");
const ethers_1 = require("ethers");
class FbSigner {
    constructor(fireblocks, vaultId) {
        this.fireblocks = fireblocks;
        this.vaultId = vaultId;
    }
    /**
     * Wait for given transaction to be completed
     * @param fbTx fireblocks transaction
     * @private
     */
    waitForTxCompletion(fbTx) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let tx = fbTx;
                while (tx.status != fireblocks_sdk_1.TransactionStatus.COMPLETED) {
                    if (tx.status == fireblocks_sdk_1.TransactionStatus.BLOCKED ||
                        tx.status == fireblocks_sdk_1.TransactionStatus.FAILED ||
                        tx.status == fireblocks_sdk_1.TransactionStatus.CANCELLED) {
                        throw Error(`Fireblocks signer: the transaction has been ${tx.status}`);
                    }
                    else if (tx.status == fireblocks_sdk_1.TransactionStatus.REJECTED) {
                        throw Error(`Fireblocks signer: the transaction has been rejected, make sure that the TAP security policy is not blocking the transaction`);
                    }
                    tx = yield this.fireblocks.getTransactionById(fbTx.id);
                }
                return yield this.fireblocks.getTransactionById(fbTx.id);
            }
            catch (err) {
                throw new Error("Fireblocks signer (waitForTxCompletion): " + err);
            }
        });
    }
    /**
     * Sign a transaction with fireblocks using Fireblocks raw message signing feature
     * @param payloadToSign transaction data in hexadecimal
     * @param assetId fireblocks asset id
     * @param note optional fireblocks custom note
     */
    sign(payloadToSign, assetId, note) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const assetArgs = assetId
                    ? {
                        assetId,
                        source: {
                            type: fireblocks_sdk_1.PeerType.VAULT_ACCOUNT,
                            id: this.vaultId.toString(),
                        },
                    }
                    : {};
                const tx = Object.assign(Object.assign({}, assetArgs), { operation: fireblocks_sdk_1.TransactionOperation.RAW, note, extraParameters: payloadToSign });
                const fbTx = yield this.fireblocks.createTransaction(tx);
                return yield this.waitForTxCompletion(fbTx);
            }
            catch (err) {
                console.log(err);
                throw new Error("Fireblocks signer (signWithFB): " + err);
            }
        });
    }
    /**
     * Sign an EIP-712 Ethereum typed message with fireblocks
     * @param eip712message eip712message to sign
     * @param assetId fireblocks asset id
     * @param note optional fireblocks custom note
     */
    signTypedMessage(eip712message, assetId, note) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const tx = {
                    assetId: assetId,
                    operation: fireblocks_sdk_1.TransactionOperation.TYPED_MESSAGE,
                    source: {
                        type: fireblocks_sdk_1.PeerType.VAULT_ACCOUNT,
                        id: this.vaultId.toString(),
                    },
                    note,
                    extraParameters: {
                        rawMessageData: {
                            messages: [
                                {
                                    content: eip712message,
                                    type: "EIP712",
                                },
                            ],
                        },
                    },
                };
                const fbTx = yield this.fireblocks.createTransaction(tx);
                return yield this.waitForTxCompletion(fbTx);
            }
            catch (err) {
                console.log(err);
                throw new Error("Fireblocks signer (signWithFB): " + err);
            }
        });
    }
    /**
     * Sign and broadcast a transaction with fireblocks using Fireblocks contract call feature
     * @param payloadToSign transaction data in hexadecimal
     * @param assetId fireblocks asset id
     * @param note optional fireblocks custom note
     * @param tx Ethereum transaction
     * @param destinationId Fireblocks destination id, this corresponds to the Fireblocks whitelisted contract address id
     * @param sendAmount send the amount in tx to smart contract
     */
    signAndBroadcastWith(payloadToSign_1, assetId_1, tx_1, destinationId_1) {
        return __awaiter(this, arguments, void 0, function* (payloadToSign, assetId, tx, destinationId, sendAmount = true, note) {
            try {
                const txArgs = {
                    assetId: assetId,
                    operation: fireblocks_sdk_1.TransactionOperation.CONTRACT_CALL,
                    source: {
                        type: fireblocks_sdk_1.PeerType.VAULT_ACCOUNT,
                        id: this.vaultId.toString(),
                    },
                    destination: {
                        type: fireblocks_sdk_1.PeerType.EXTERNAL_WALLET,
                        id: destinationId,
                    },
                    amount: tx.data.amount_wei && sendAmount ? ethers_1.utils.formatEther(tx.data.amount_wei) : "0",
                    note,
                    extraParameters: payloadToSign,
                    gasLimit: tx.data.gas_limit,
                    priorityFee: ethers_1.utils.formatUnits(tx.data.max_priority_fee_per_gas_wei, "gwei"),
                    maxFee: ethers_1.utils.formatUnits(tx.data.max_fee_per_gas_wei, "gwei"),
                };
                const fbTx = yield this.fireblocks.createTransaction(txArgs);
                return yield this.waitForTxCompletion(fbTx);
            }
            catch (err) {
                throw new Error("Fireblocks signer (signAndBroadcastWithFB): " + err);
            }
        });
    }
}
exports.FbSigner = FbSigner;
