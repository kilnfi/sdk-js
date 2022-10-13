import { Integrations } from "./integrations";
import { FinalExecutionOutcome } from "near-api-js/lib/providers";

export type InternalNearConfig = {
  testnet?: boolean;
  integrations: Integrations | undefined;
  rpc: string | undefined;
};


export type NearStakeOptions = {
  stakePoolId: string;
};

export type NearTxStatus = {
  status: 'success' | 'error';
  txReceipt: FinalExecutionOutcome;
}