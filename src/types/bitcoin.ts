export type BitcoinTx = {
  data: {
    unsigned_tx_serialized: string;
  };
};

export type BitcoinSignedTx = {
  data: {
    signed_tx_serialized: string;
  };
};

export type BitcoinTxHash = {
  data: {
    tx_id: string;
  };
};
