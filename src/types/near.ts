import { FinalExecutionOutcome } from "near-api-js/lib/providers";

export type NearTxStatus = {
  status: 'success' | 'error';
  receipt: FinalExecutionOutcome;
}