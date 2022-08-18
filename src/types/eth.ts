import { Integrations } from "./integrations";
import { Transaction } from "@ethereumjs/tx";

export type InternalEthereumConfig = {
  testnet?: boolean;
  integrations: Integrations | undefined;
  rpc: string | undefined;
};

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

export type EthereumTx = Transaction;

export type InternalBatchDeposit = {
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