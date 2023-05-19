import { IndexedTx, StdFee } from "@cosmjs/stargate";
import { EncodeObject } from "@cosmjs/proto-signing";

export type AtomTx = {
  data: {
    unsigned_tx_hash: string;
    tx_body: string;
    tx_auth_info: string;
    pubkey: string;
    message: EncodeObject;
    fee: StdFee;
  }
}

export type AtomSignedTx = {
  data: {
    signed_tx_serialized: string;
  };
};

export type AtomTxHash = {
  data: {
    tx_hash: string;
  };
};

export type AtomTxStatus = {
  data: {
    status: 'success' | 'error',
    receipt: IndexedTx | null,
  }
}