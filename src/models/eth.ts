export type InternalEthereumConfig = { testnet?: boolean };

export type EthStake = {
  balance: number;
  rewards: number;
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
    // eslint-disable-next-line camelcase
    withdrawal_credentials: string[];
    signatures: string[];
    // eslint-disable-next-line camelcase
    deposit_data_roots: string[];
  };
};
