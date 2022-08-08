import { Transaction } from '@solana/web3.js';

export type InternalSolanaConfig = {
  testnet?: boolean;
};

export type SolanaStakeTx = Transaction;

export type SolStake = {
  stake_account: string;
  withdraw_pubkey: string;
  balance: number;
  rewards: number;
  apy: number;
};

export type SolStakes = {
  data: SolStake[];
}

export type SolNetworkStats = {
  data: {
    timestamp: string;
    nb_validators: number;
    apy: number;
    supply_staked_percent: number;
  };
};
