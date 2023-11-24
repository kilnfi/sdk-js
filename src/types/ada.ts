import { Responses } from '@blockfrost/blockfrost-js';
import {
  TransactionInputsJSON,
} from '@emurgo/cardano-serialization-lib-nodejs';
import { TransactionResponse } from "fireblocks-sdk";

export type AdaTxStatus = {
  data: {
    status: 'success' | 'pending_confirmation';
    receipt: Responses['tx_content'];
  };
};

export type AdaEpoch = {
  nb: number;
  begin_at: string;
};

export type AdaStake = {
  wallet_addresses: string[];
  stake_address: string;
  pool_id: string;
  balance: string;
  rewards: string;
  available_rewards: string;
  activation_epoch: AdaEpoch;
  state: 'active' | 'activating' | 'inactive';
  net_apy: number;
};

export type AdaStakes = {
  data: AdaStake[];
};

export type AdaReward = {
  epoch: AdaEpoch;
  rewards: string;
  net_apy: number;
};

export type AdaRewards = {
  data: AdaReward[];
};

export type AdaSignedTx = {
  data: {
    fireblocks_tx: TransactionResponse;
    signed_tx_serialized: string;
  };
};

export type AdaTxHash = {
  data: {
    tx_hash: string;
  };
};

export type AdaSignedMessage = {
  pubkey: string;
  signature: string;
}

export type AdaTx = {
  data: {
    unsigned_tx_hash: string;
    unsigned_tx_serialized: string;
    inputs: TransactionInputsJSON;
  };
};

export type AdaNetworkStats = {
  data: {
    updated_at: string;
    network_gross_apy: number;
    supply_staked_percent: number;
  };
};