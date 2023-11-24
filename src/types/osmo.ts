import { IndexedTx, StdFee } from "@cosmjs/stargate";
import { EncodeObject } from "@cosmjs/proto-signing";
import { TransactionResponse } from "fireblocks-sdk";

export type OsmoTx = {
  data: {
    unsigned_tx_hash: string;
    unsigned_tx_serialized: string;
    tx_body: string;
    tx_auth_info: string;
    pubkey: string;
    message: EncodeObject;
    fee: StdFee;
  }
}

export type OsmoSignedTx = {
  data: {
    fireblocks_tx: TransactionResponse;
    signed_tx_serialized: string;
  };
};

export type OsmoTxHash = {
  data: {
    tx_hash: string;
  };
};

export type OsmoTxStatus = {
  data: {
    status: 'success' | 'error',
    receipt: IndexedTx | null,
  }
}

export type OsmoStake = {
  validator_address: string;
  delegator_address: string;
  delegated_at?: string;
  undelegated_at?: string;
  balance: string;
  rewards: string;
  available_rewards: string;
  net_apy: number;
  updated_at?: string;
};

export type OsmoStakes = {
  data: OsmoStake[];
};

export type OsmoReward = {
  date: string;
  rewards: string;
  balance: string;
  net_apy: number;
};

export type OsmoRewards = {
  data: OsmoReward[];
};