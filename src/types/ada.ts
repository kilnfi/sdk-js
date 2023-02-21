import { Integrations } from "./integrations";
import { Responses } from '@blockfrost/blockfrost-js';
import { Schemas } from "@blockfrost/blockfrost-js/lib/types/open-api";

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
  txReceipt: Schemas['tx_content']
}

export type TaggedStake = {
  stakeAddress: string;
  balance: number;
};

export type Epoch = {
  nb: number;
  begin_at: string;
};

export type AdaStake = {
  wallet_addresses: string[];
  stake_address: string;
  pool_id: string;
  balance: string;
  rewards: string;
  available_rewards: string;
  activation_epoch: Epoch;
  state: 'active' | 'activating' | 'inactive';
  net_apy: number;
};

export type AdaStakes = {
  data: AdaStake[];
};

export type AdaReward = {
  epoch: Epoch;
  rewards: string;
  net_apy: number;
};

export type AdaRewards = {
  data: AdaReward[];
};