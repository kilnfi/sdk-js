import { FinalExecutionOutcome } from "near-api-js/lib/providers";
import { SignedTransaction, Transaction } from 'near-api-js/lib/transaction';

export type NearTx = {
  data: {
    tx: Transaction
  }
}

export type NearSignedTx = {
  data: {
    tx: SignedTransaction
  }
}

export type NearTxHash = {
  data: {
    tx_hash: string;
  }
}

export type NearTxStatus = {
  data: {
    status: 'success' | 'error';
    receipt: FinalExecutionOutcome;
  }
}