import { OperationEntry } from '@taquito/rpc';

export type XtzStakeOptions = {
  baker_address: string;
};

export type XtzTx = {
  data: {
    unsigned_tx_hash: string;
    unsigned_tx_serialized: string;
  }
};

export type XtzSignedTx = {
  data: {
    signed_tx_serialized: string;
  }
};

export type XtzTxHash = {
  data: {
    tx_hash: string;
  }
};

export type XtzTxStatus = {
  data: {
    status: string;
    receipt: OperationEntry;
  }
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