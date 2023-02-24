import { Integrations } from './integrations';
import { TransactionReceipt } from 'web3-core';

export type InternalEthereumConfig = {
  testnet?: boolean;
  integrations: Integrations | undefined;
};

export type EthStakes = {
  data: EthStake[]
}

export type EthStakeState =
    | 'unknown'
    | 'not_staked'
    | 'deposit_in_progress'
    | 'pending_initialized'
    | 'pending'
    | 'pending_queued'
    | 'active'
    | 'active_ongoing'
    | 'active_exiting'
    | 'active_slashed'
    | 'exited'
    | 'exited_slashed'
    | 'exited_unslashed'
    | 'withdrawal_possible'
    | 'withdrawal_done'
    | 'withdrawal';

export type EthStake = {
  validator_address: string;
  state: EthStakeState;
  activated_at?: string;
  delegated_epoch?: number;
  delegated_block?: number;
  effective_balance?: string;
  balance?: string;
  consensus_rewards?: string;
  execution_rewards?: string;
  rewards?: string;
  gross_apy?: number;
  deposit_tx_sender?: string;
  execution_fee_recipient?: string;
  withdrawal_credentials?: string;
  updated_at: string;
};

export type EthRewards = {
  data: EthReward[]
}

export type EthReward = {
  date: string;
  consensus_rewards: string;
  execution_rewards: string;
  rewards: string;
  stake_balance: string;
  gross_apy: number;
  el_apy: number;
  cl_apy: number;
};


export type EthTx = {
  data: {
    unsigned_tx_hash: string;
    unsigned_tx_serialized: string;
  }
};

export type EthTxHash = {
  data: {
    tx_hash: string;
  }
};

export type EthNetworkStats = {
  data: {
    network_gross_apy: number;
    supply_staked_percent: number;
  };
};

export type EthKilnStats = {
  data: {
    gross_apy: {
      last_1d: number;
      last_7d: number;
      last_30d: number;
    };
  };
};

export type EthTxStatus = {
  data: {
    status: 'success' | 'error' | 'pending_confirmation';
    txReceipt: TransactionReceipt | null;
  }
}
export type EthSignedTx = {
  data: {
    signed_tx_serialized: string;
  };
};