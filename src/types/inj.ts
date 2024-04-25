import { TransactionResponse } from "fireblocks-sdk";

export type InjTx = {
  data: {
    eip712_typed_data: Eip712TypedData;
    pubkey: string;
    tx_body: string;
  };
};

export type InjSignedTx = {
  data: {
    signed_tx_serialized: string;
    fireblocks_tx: TransactionResponse;
  };
};

export type Eip712TypedData = {
  message: {
    msgs: {
      type: string;
      value: Record<string, unknown>;
    }[];
    fee: {
      amount: {
        amount: string;
        denom: string;
      }[];
      gas: string;
      feePayer?: string | undefined;
    };
    account_number: string;
    chain_id: string;
    sequence: string;
    timeout_height: string;
    memo: string;
  };
  domain: {
    name: string;
    version: string;
    chainId: string;
    salt: string;
    verifyingContract: string;
  };
  primaryType: string;
  types: {
    EIP712Domain: {
      name: string;
      type: string;
    }[];
    Tx: {
      name: string;
      type: string;
    }[];
    Fee: {
      name: string;
      type: string;
    }[];
    Coin: {
      name: string;
      type: string;
    }[];
    Msg: {
      name: string;
      type: string;
    }[];
  };
};
