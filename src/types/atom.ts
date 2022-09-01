import { Integrations } from "./integrations";
import { StdFee } from "@cosmjs/stargate";
import { EncodeObject } from "@cosmjs/proto-signing";

export type InternalAtomConfig = {
  testnet?: boolean;
  integrations: Integrations | undefined;
  rpc: string | undefined;
};


export type AtomTx = {
  address: string;
  messages: EncodeObject[];
  fee: StdFee;
  memo?: string;
};

export type AtomStakeOptions = {
  validatorAddress?: string;
};