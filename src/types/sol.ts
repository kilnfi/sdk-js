import { Transaction } from '@solana/web3.js';
import { Integrations } from "./integrations";

export type InternalSolanaConfig = {
  testnet?: boolean;
  integrations: Integrations | undefined;
  rpc: string | undefined;
};

export type SolanaTx = Transaction;

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

export type SolanaStakeOptions = {
  voteAccountAddress?: string;
  memo?: string;
}
