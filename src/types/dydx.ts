import { IndexedTx, StdFee } from "@cosmjs/stargate";
import { EncodeObject } from "@cosmjs/proto-signing";
import { TransactionResponse } from "fireblocks-sdk";

export type DydxTx = {
  data: {
    unsigned_tx_hash: string;
    unsigned_tx_serialized: string;
    tx_body: string;
    tx_auth_info: string;
    pubkey: string;
    message: EncodeObject;
    fee: StdFee;
  }
}

export type DydxSignedTx = {
  data: {
    fireblocks_tx: TransactionResponse;
    signed_tx_serialized: string;
  };
};

export type DydxTxHash = {
  data: {
    tx_hash: string;
  };
};

export type DydxTxStatus = {
  data: {
    status: 'success' | 'error',
    receipt: IndexedTx | null,
  }
}