import { IndexedTx, StdFee } from "@cosmjs/stargate";
import { EncodeObject } from "@cosmjs/proto-signing";

export type AtomTx = {
  address: string;
  messages: EncodeObject[];
  fee: StdFee;
  memo?: string;
};

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
    receipt: IndexedTx,
  }
}