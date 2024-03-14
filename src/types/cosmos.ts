import { Coin, IndexedTx, StdFee } from "@cosmjs/stargate";
import { EncodeObject } from "@cosmjs/proto-signing";
import { TransactionResponse } from "fireblocks-sdk";

export type CosmosTx = {
  data: {
    unsigned_tx_hash: string;
    unsigned_tx_serialized: string;
    tx_body: string;
    tx_auth_info: string;
    pubkey: string;
    message: EncodeObject;
    fee: StdFee;
  }
}

export type CosmosSignedTx = {
  data: {
    fireblocks_tx: TransactionResponse;
    signed_tx_serialized: string;
  };
};

export type CosmosTxHash = {
  data: {
    tx_hash: string;
  };
};

export type CosmosTxStatus = {
  data: {
    status: 'success' | 'error',
    receipt: IndexedTx | null,
  }
}

export type Balance = {
  data: Coin;
}