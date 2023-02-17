import { Integrations } from "./integrations";
import { SubmittableExtrinsic } from "@polkadot/api/promise/types";
import { GenericExtrinsic } from "@polkadot/types/extrinsic";

export type InternalDotConfig = {
  testnet?: boolean;
  integrations: Integrations | undefined;
};

/**
 * 'Staked': Rewards are paid into the stash account, increasing the amount at stake accordingly.
 * 'Stash': Rewards are paid into the stash account, not increasing the amount at stake.
 * 'Controller': Rewards are paid into the controller account
 * Custom account address: Rewards are paid into the custom account address
 */
export type RewardDestination = 'Staked' | 'Stash' | 'Controller' | string;

export type DotStakeOptions = {
  controllerAccount?: string;
  rewardDestination?: RewardDestination;
};

export type DotTransaction = {
  from: string;
  submittableExtrinsic: SubmittableExtrinsic;
}

export type SubmittedDotTransaction = {
  blockHash: string;
  hash: string;
}

export type DotTransactionStatus = {
  status: 'success' | 'error',
  extrinsic: GenericExtrinsic,
  error: string | null;
}