import { IndexedTx, StdFee } from "@cosmjs/stargate";
import { EncodeObject } from "@cosmjs/proto-signing";

export type AtomTx = {
  data: {
    unsigned_tx_hash: string;
    tx_body: string;
    tx_auth_info: string;
    pubkey: string;
    message: EncodeObject;
    fee: StdFee;
  }
}

export type AtomSignedTx = {
  data: {
    signed_tx_serialized: string;
  };
};

export type AtomTxHash = {
  data: {
    tx_hash: string;
  };
};

export type AtomTxStatus = {
  data: {
    status: 'success' | 'error',
    receipt: IndexedTx | null,
  }
}

export type AtomStake = {
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

export type AtomStakes = {
  data: AtomStake[];
};

export type AtomReward = {
  date: string;
  rewards: string;
  balance: string;
  net_apy: number;
};

export type AtomRewards = {
  data: AtomReward[];
};