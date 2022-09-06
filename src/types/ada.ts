import { Integrations } from "./integrations";
import { Responses } from '@blockfrost/blockfrost-js';
import * as CardanoWasm from "@emurgo/cardano-serialization-lib-nodejs";

export type InternalAdaConfig = {
  testnet?: boolean;
  integrations: Integrations | undefined;
};

export type UTXO = Responses['address_utxo_content'];

export interface AdaAssetAmount {
  unit: string;
  quantity: string;
}


export type AdaTx = {
  txHash: string;
  txBody: CardanoWasm.TransactionBody;
};

export type AdaStakeOptions = {
  poolId: string;
};