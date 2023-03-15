import { SubmittableExtrinsic } from '@polkadot/api/promise/types';
import { GenericExtrinsic } from '@polkadot/types/extrinsic';

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
  from: string;
  submittableExtrinsic: SubmittableExtrinsic;
}

export type DotSignedTx = {
  from: string;
  submittableExtrinsic: SubmittableExtrinsic;
}

export type SubmittedDotTx = {
  blockHash: string;
  hash: string;
}

export type DotTxStatus = {
  status: 'success' | 'error',
  extrinsic: GenericExtrinsic,
  error: string | null;
}