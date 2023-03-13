import { TransactionReceipt } from 'web3-core';

export type MaticStakeTxOptions = {
  validator_share_proxy_address: string;
}

export type MaticTx = {
  data: {
    unsigned_tx_hash: string;
    unsigned_tx_serialized: string;
  }
};

export type MaticTxHash = {
  data: {
    tx_hash: string;
  }
};

export type MaticTxStatus = {
  data: {
    status: 'success' | 'error' | 'pending_confirmation';
    receipt: TransactionReceipt | null;
  }
}
export type MaticSignedTx = {
  data: {
    signed_tx_serialized: string;
  };
};