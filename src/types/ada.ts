import { Integrations } from "./integrations";
import { Responses } from '@blockfrost/blockfrost-js';
import { components } from '@blockfrost/openapi';

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

export type TaggedStake = {
  stakeAddress: string;
  balance: number;
};

export type AdaEpoch = {
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
  activation_epoch: AdaEpoch;
  state: 'active' | 'activating' | 'inactive';
  net_apy: number;
};

export type AdaStakes = {
  data: AdaStake[];
};

export type AdaReward = {
  epoch: AdaEpoch;
  rewards: string;
  net_apy: number;
};

export type AdaRewards = {
  data: AdaReward[];
};