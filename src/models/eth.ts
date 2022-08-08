export type InternalEthereumConfig = { testnet?: boolean };

export type EthStakes = {
  data: EthStake[]
}

export type EthStake = {
  pubkey: string;
  state: string;
  state_updated_at: number | null;
  balance: string | null;
  effective_balance: string | null;
  apy: number | null;
  deposit_tx_sender: string | null;
};

export type EthereumStakeTx = {
  from: string;
  to: string;
  data: string;
  value: string;
  chainId: string;
};

export type InternalBatchDeposit = {
  data: {
    pubkeys: string[];
    withdrawal_credentials: string[];
    signatures: string[];
    deposit_data_roots: string[];
  };
};

export type NetworkStats = {
  data: {
    apy: number;
    supply_staked_percent: number;
  };
};