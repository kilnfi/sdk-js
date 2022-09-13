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
};

export type ApiCreatedStake = {
  id: string;
  tags: Map<string, string[]>;
  protocol: string;
  created_at: Date;
  updated_at: Date;
};

export type ApiCreatedStakes = {
  data: ApiCreatedStake[];
};

export type TaggedStake = {
  stakeAccount: string;
  balance: number;
};

export type PublicNonceAccountInfo = {
  nonce_account: string;
  nonce_account_authority: string;
};

export type PublicSignature = {
  pubkey: string;
  signature: string | null;
};