import { FinalExecutionOutcome } from "near-api-js/lib/providers";

export type NearStakeOptions = {
  stakePoolId: string;
};

export type NearTxStatus = {
  status: 'success' | 'error';
  txReceipt: FinalExecutionOutcome;
}