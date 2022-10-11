import { Integrations } from "./integrations";
import { Responses } from '@blockfrost/blockfrost-js';
import { components } from "@blockfrost/blockfrost-js/lib/types/OpenApi";

export type InternalAdaConfig = {
  testnet?: boolean;
  integrations: Integrations | undefined;
};

export type UTXO = Responses['address_utxo_content'];

export type AdaStakeOptions = {
  poolId: string;
};

export type AdaTxStatus = {
  status: 'success' | 'pending_confirmation',
  txReceipt: components['schemas']['tx_content']
}