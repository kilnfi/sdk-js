import { TransactionResponse } from "fireblocks-sdk";
export type TonTx = {
    data: {
        unsigned_tx_hash: string;
        unsigned_tx_serialized: string;
        from: string;
    };
};
export type TonSignedTx = {
    data: {
        fireblocks_tx: TransactionResponse;
        signed_tx_serialized: string;
    };
};
export type TonTxHash = {
    data: {
        tx_hash: string;
    };
};
export type TonTxStatus = {
    data: {
        status: "success" | "error";
        receipt: TransactionResponse | null;
    };
};
