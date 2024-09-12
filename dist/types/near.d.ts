import { FinalExecutionOutcome } from "near-api-js/lib/providers";
import { SignedTransaction, Transaction } from "near-api-js/lib/transaction";
import { TransactionResponse } from "fireblocks-sdk";
export type NearTx = {
    data: {
        tx: Transaction;
    };
};
export type NearSignedTx = {
    data: {
        fireblocks_tx: TransactionResponse;
        tx: SignedTransaction;
    };
};
export type NearTxHash = {
    data: {
        tx_hash: string;
    };
};
export type NearTxStatus = {
    data: {
        status: "success" | "error";
        receipt: FinalExecutionOutcome;
    };
};
export type NearStake = {
    stake_account: string;
    account: string;
    validator: string;
    balance: string;
    rewards: string;
    delegated_at: string;
    delegated_epoch: number;
    delegated_block: number;
    activated_at?: string;
    activated_epoch?: number;
    net_apy: number;
    updated_at: string;
};
export type NearStakes = {
    data: NearStake[];
};
export type NearReward = {
    epoch?: number;
    epoch_ts?: string;
    date?: string;
    rewards: string;
};
export type NearRewards = {
    data: NearReward[];
};
export type NearNetworkStats = {
    data: {
        updated_at: string;
        nb_validators: number;
        network_gross_apy: number;
        supply_staked_percent: number;
    };
};
