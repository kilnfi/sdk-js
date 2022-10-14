import { Integrations } from "./integrations";
import { SubmittableExtrinsic } from "@polkadot/api/promise/types";

export type InternalDotConfig = {
  testnet?: boolean;
  integrations: Integrations | undefined;
  rpc: string | undefined;
};


/**
 * controllerAccountAddress: address of controller account associated with the stash account (primary wallet), this can be the stash account if not specified although not recommended
 * rewardDestination:
 * 'Staked': Rewards are paid into the stash account, increasing the amount at stake accordingly.
 * 'Stash': Rewards are paid into the stash account, not increasing the amount at stake.
 * 'Controller': Rewards are paid into the controller account
 * Custom account address: Rewards are paid into the custom account address
 */
export type DotStakeOptions = {
  controllerAccountAddress?: string;
  rewardDestination?: 'Staked' | 'Stash' | 'Controller' | string;
};

export type DotTransaction = {
  from: string;
  submittableExtrinsic: SubmittableExtrinsic;
}