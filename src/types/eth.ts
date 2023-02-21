import { Integrations } from './integrations';
import { FeeMarketEIP1559Transaction } from '@ethereumjs/tx';
import { TransactionReceipt } from 'web3-core';

export type InternalEthereumConfig = {
  testnet?: boolean;
  integrations: Integrations | undefined;
  rpc: string | undefined;
};

export type EthStakes = {
  data: EthStake[]
}

export type StakeState =
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
  state: StakeState;
  activated_at: string | null;
  effective_balance: string | null;
  balance: string | null;
  consensus_rewards: string | null;
  execution_rewards: string | null;
  gross_apy: number | null;
  deposit_tx_sender: string | null;
  fee_recipient: string | null;
  withdrawal_credentials: string | null;
};

export type EthRewards = {
  data: EthReward[]
}

export type EthReward = {
  time: string;
  consensus_rewards: string;
  execution_rewards: string;
  gross_apy: number;
  el_apy: number;
  cl_apy: number;
};

export type EthereumTx = FeeMarketEIP1559Transaction;

export type ValidationKeyDepositData = {
  data: {
    pubkeys: string[];
    withdrawal_credentials: string[];
    signatures: string[];
    deposit_data_roots: string[];
  };
};

export type EthNetworkStats = {
  data: {
    apy: number;
    supply_staked_percent: number;
  };
};

export type EthereumStakeOptions = {
  deposit_data: {
    pubkey: string;
    withdrawalCredentials: string;
    signature: string;
    depositDataRoot: string;
  }[];
}

export type EthTxStatus = {
  status: 'success' | 'error' | 'pending_confirmation';
  txReceipt: TransactionReceipt | null;
}