import { IndexedTx, StdFee } from "@cosmjs/stargate";
import { EncodeObject } from "@cosmjs/proto-signing";

export type AtomTx = {
  address: string;
  messages: EncodeObject[];
  fee: StdFee;
  memo?: string;
};

export type AtomStakeOptions = {
  validatorAddress?: string;
};

export type AtomTxStatus = {
  status: 'success' | 'error',
  receipt: IndexedTx,
}