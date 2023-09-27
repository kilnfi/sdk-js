import { GenericExtrinsic } from "@polkadot/types/extrinsic";
import { DecodedSignedTx, DecodedSigningPayload } from "@substrate/txwrapper-polkadot";

/**
 * 'Staked': Rewards are paid into the stash account, increasing the amount at stake accordingly.
 * 'Stash': Rewards are paid into the stash account, not increasing the amount at stake.
 * 'Controller': Rewards are paid into the controller account
 * Custom account address: Rewards are paid into the custom account address
 */
export type DotRewardDestination = 'Staked' | 'Stash' | 'Controller' | string;

export type DotStakeOptions = {
  controllerAccount?: string;
  rewardDestination?: DotRewardDestination;
};

export type DotTx = {
  data: {
    unsigned_tx_payload: string;
    unsigned_tx_serialized: string;
    unsigned_tx: DecodedSignedTx | DecodedSigningPayload;
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
}

export type DotTxStatus = {
  data: {
    status: 'success' | 'error',
    extrinsic: GenericExtrinsic,
    error: string | null;
  }
}