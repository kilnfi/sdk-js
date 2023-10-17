import { DecodedSigningPayload } from "@substrate/txwrapper-polkadot";

/**
 * 'Staked': Rewards are paid into the stash account, increasing the amount at stake accordingly.
 * 'Stash': Rewards are paid into the stash account, not increasing the amount at stake.
 * 'Controller': Rewards are paid into the controller account
 * Custom account address: Rewards are paid into the custom account address
 */
export type DotRewardDestination = 'Staked' | 'Stash' | 'Controller' | string;

export type DotTx = {
  data: {
    unsigned_tx_payload: string;
    unsigned_tx_serialized: string;
    unsigned_tx: DecodedSigningPayload;
  };
};

export type DotSignedTx = {
  data: {
    signed_tx_serialized: string;
  };
};

export type DotTxHash = {
  data: {
    tx_hash: string;
  }
};

export type DotTxStatus = {
  code: number;
  message: string;
  generated_at: string;
  data: {
    block_timestamp: number;
    block_num: number;
    extrinsic_index: string;
    call_module_function: string;
    call_module: string;
    account_id: string;
    signature: string;
    nonce: number;
    extrinsic_hash: string;
    success: boolean;
    params: any[];
    transfer: null;
    event: any[];
    event_count: number;
    fee: string;
    fee_used: string;
    error: any;
    finalized: true;
    lifetime: any;
    tip: string;
    account_display: {
      address: string;
    };
    block_hash: string;
    pending: boolean;
  };
};