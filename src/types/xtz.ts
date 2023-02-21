import { OperationEntry } from '@taquito/rpc';
import { Integrations } from "./integrations";

export type InternalTezosConfig = {
  testnet?: boolean;
  integrations: Integrations | undefined;
};

export type XtzStakeOptions = {
  baker_address: string;
};

export type XtzTx = {
  unsigned_tx_hashed: string;
  unsigned_tx_hex: string;
};

export type XtzTxStatus = {
  status: string;
  txReceipt: OperationEntry;
};

export type XtzStake = {
  stake_address: string;
  baker_address: string;
  balance: number;
  rewards: number;
  gross_apy: number;
  state: string;
  delegated_at: string;
  delegated_block: string;
  delegated_cycle: number;
  activated_at: string;
  activated_cycle?: number;
  updated_at: string;
};

export type XtzStakes = {
  data: XtzStake[]
}

export type XtzReward = {
  date: string;
  rewards: number;
  active_balance: string;
  gross_apy: number;
};

export type XtzRewards = {
  data: XtzReward[]
}

export type XtzNetworkStats = {
  data: {
    nb_validators: number;
    network_gross_apy: number;
    supply_stake_percent: number;
    updated_at: string;
  }
}