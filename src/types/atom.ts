import { Integrations } from "./integrations";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";

export type InternalAtomConfig = {
  testnet?: boolean;
  integrations: Integrations | undefined;
  rpc: string | undefined;
};

export type AtomTx = TxRaw;