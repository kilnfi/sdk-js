import { Integrations } from "./integrations";

export type InternalNearConfig = {
  testnet?: boolean;
  integrations: Integrations | undefined;
};


export type NearStakeOptions = {
  validatorId: string;
};