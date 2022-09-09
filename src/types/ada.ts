import { Integrations } from "./integrations";
import { Responses } from '@blockfrost/blockfrost-js';

export type InternalAdaConfig = {
  testnet?: boolean;
  integrations: Integrations | undefined;
};

export type UTXO = Responses['address_utxo_content'];

export type AdaStakeOptions = {
  poolId: string;
};