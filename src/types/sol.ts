import { TransactionResponse } from "fireblocks-sdk";

export type SolTx = {
  data: {
    unsigned_tx_hash: string;
    unsigned_tx_serialized: string;
  }
};

export type SolSignedTx = {
  data: {
    fireblocks_tx: TransactionResponse;
    signed_tx_serialized: string;
  };
};

export type SolTxHash = {
  data: {
    tx_hash: string;
  }
};

type SolEpoch = {
  nb: number;
  begin_at: string;
};

export type SolStakeState = 'activating' | 'active' | 'deactivating' | 'inactive';

export type SolStake = {
  stake_account: string;
  withdraw_pubkey: string;
  balance: string;
  rewards: string;
  activation_epoch: SolEpoch | null;
  deactivation_epoch: SolEpoch | null;
  state: SolStakeState;
  net_apy: number;
  vote_account: string;
};

export type SolStakes = {
  data: SolStake[];
}

export type SolReward = {
  epoch: SolEpoch;
  rewards: number;
  net_apy: number;
};

export type SolRewards = {
  data: SolReward[];
}

export type SolNetworkStats = {
  data: {
    timestamp: string;
    nb_validators: number;
    apy: number;
    supply_staked_percent: number;
  };
};

export type SolTxStatus = {
  data: {
    status: 'success' | 'error';
    receipt: TransactionResponse | null;
  }
}