import { TransactionResponse } from "fireblocks-sdk";
import { TransactionSerializableLegacy, TransactionReceipt } from "viem";
export type PolTx = {
    data: {
        unsigned_tx_hash: string;
        unsigned_tx_serialized: string;
        to: string;
        contract_call_data: string;
        amount_wei?: string;
        nonce: number;
        gas_limit: number;
        max_priority_fee_per_gas_wei: string;
        max_fee_per_gas_wei: string;
        chain_id: number;
    };
};
export type PolTxHash = {
    data: {
        tx_hash: string;
    };
};
export type PolTxStatus = {
    data: {
        status: "success" | "error" | "pending_confirmation";
        receipt: TransactionReceipt | null;
    };
};
export type PolSignedTx = {
    data: {
        fireblocks_tx: TransactionResponse;
        signed_tx_serialized: string;
    };
};
export type PolDecodedTx = TransactionSerializableLegacy & {
    functionName?: string;
    args?: any[];
};
