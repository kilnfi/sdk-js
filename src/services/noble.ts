import { Service } from "./service";

import { ServiceProps } from "../types/service";
import { Integration } from "../types/integrations";
import api from "../api";
import { DecodedTxRaw } from "@cosmjs/proto-signing";
import { Balance, CosmosSignedTx, CosmosTx, CosmosTxHash, CosmosTxStatus } from "../types/cosmos";
import { parseUnits } from "viem";

export class NobleService extends Service {
  constructor({ testnet }: ServiceProps) {
    super({ testnet });
  }

  usdcToUusdc(amountUsdc: string): string {
    return parseUnits(amountUsdc, 6).toString();
  }

  /**
   * Get balance of given address for given denom (uusdc on NOBLE)
   * @param address
   * @param denom
   */
  async getBalance(address: string, denom: string): Promise<Balance> {
    const { data } = await api.post<Balance>(`/v1/noble/balance`, {
      address,
      denom,
    });
    return data;
  }

  /**
   * Burn noble USDC to it can be minted on Ethereum
   * @param pubkey
   * @param recipient
   * @param amountUsdc
   */
  async craftBurnUsdc(pubkey: string, recipient: string, amountUsdc: number): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/noble/transaction/burn-usdc`, {
      pubkey: pubkey,
      recipient: recipient,
      amount_uusdc: this.usdcToUusdc(amountUsdc.toString()),
    });
    return data;
  }

  /**
   * Transfer IBC USDC from your account to an OSMO account
   * @param pubkey
   * @param recipient
   * @param amountUsdc
   */
  async craftOsmoIbcTransfer(pubkey: string, recipient: string, amountUsdc: number): Promise<CosmosTx> {
    const { data } = await api.post<CosmosTx>(`/v1/noble/transaction/osmo-ibc-transfer`, {
      pubkey,
      recipient,
      amount_uusdc: this.usdcToUusdc(amountUsdc.toString()),
    });
    return data;
  }

  /**
   * Sign transaction with given integration
   * @param integration custody solution to sign with
   * @param tx raw transaction
   * @param note note to identify the transaction in your custody solution
   */
  async sign(integration: Integration, tx: CosmosTx, note?: string): Promise<CosmosSignedTx> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.data.unsigned_tx_hash,
            preHash: {
              content: tx.data.unsigned_tx_serialized,
              hashAlgorithm: "SHA256",
            },
          },
        ],
      },
    };
    const fbNote = note ? note : "NOBLE tx from @kilnfi/sdk";
    const signer = this.getFbSigner(integration);
    // NOBLE chain is not supported by Fireblocks, so we use DYDX_DYDX
    const fbTx = await signer.sign(payload, "DYDX_DYDX", fbNote);
    const signature: string = fbTx.signedMessages![0].signature.fullSig;
    const { data } = await api.post<CosmosSignedTx>(`/v1/noble/transaction/prepare`, {
      pubkey: tx.data.pubkey,
      tx_body: tx.data.tx_body,
      tx_auth_info: tx.data.tx_auth_info,
      signature: signature,
    });
    data.data.fireblocks_tx = fbTx;
    return data;
  }

  /**
   * Broadcast transaction to the network
   * @param signedTx
   */
  async broadcast(signedTx: CosmosSignedTx): Promise<CosmosTxHash> {
    const { data } = await api.post<CosmosTxHash>(`/v1/noble/transaction/broadcast`, {
      tx_serialized: signedTx.data.signed_tx_serialized,
    });
    return data;
  }

  /**
   * Get transaction status
   * @param txHash
   */
  async getTxStatus(txHash: string): Promise<CosmosTxStatus> {
    const { data } = await api.get<CosmosTxStatus>(`/v1/noble/transaction/status?tx_hash=${txHash}`);
    return data;
  }

  /**
   * Decode transaction
   * @param txSerialized transaction serialized
   */
  async decodeTx(txSerialized: string): Promise<DecodedTxRaw> {
    const { data } = await api.get<DecodedTxRaw>(`/v1/noble/transaction/decode?tx_serialized=${txSerialized}`);
    return data;
  }
}
