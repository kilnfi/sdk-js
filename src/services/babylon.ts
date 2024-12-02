import { Service } from "./service";
import type { BitcoinTx, BitcoinSignedTx, BitcoinTxHash } from "../types/bitcoin";
import api from "../api";
import { Psbt } from "bitcoinjs-lib";
import type { ServiceProps } from "../types/service";
import type { Integration } from "../types/integrations";
import { FireblocksSigner as FireblocksPsbtSigner } from "@fireblocks/psbt-sdk";

export class BabylonService extends Service {
  constructor({ testnet }: ServiceProps) {
    super({ testnet });
  }

  /**
	 * Craft a babylon stake transaction
	 */
  async craftStakeTx(accountId: string, publicKey: string, amountSatoshi: number, timeLock: number, feeRate: number): Promise<BitcoinTx> {
    const { data } = await api.post<BitcoinTx>('/v1/babylon/transaction/stake', {
      account_id: accountId,
      public_key: publicKey,
      amount_satoshi: amountSatoshi,
      time_lock: timeLock,
      fee_rate: feeRate,
    });
    return data;
  }

  /**
	 * Sign transaction with given integration
	 * @param integration custody solution to sign with
	 * @param tx raw babylon transaction
	 * @param note note to identify the transaction in your custody solution
	 */
  async sign(integration: Integration, tx: BitcoinTx, note?: string): Promise<BitcoinSignedTx> {
    const fbSigner = await FireblocksPsbtSigner.create({
      fireblocks: {
        basePath: "https://api.fireblocks.io/v1",
        apiKey: integration.fireblocksApiKey,
        secretKey: integration.fireblocksSecretKey,
      },
      assetId: this.testnet ? "BTC_TEST" : "BTC",
      vaultId: integration.vaultId.toString(),
      addressIndex: 0,
      note: note ?? "BTC tx from @kilnfi/sdk",
    });

    const psbt = Psbt.fromHex(tx.data.unsigned_tx_serialized);

    await psbt.signAllInputsAsync(fbSigner);

    psbt.finalizeAllInputs();
    const signedTransaction = psbt.extractTransaction().toHex();

    return { data: { signed_tx_serialized: signedTransaction } };
  }

  /**
   * Broadcast transaction to the network
   * @param signedTx the transaction to broadcast
   */
  async broadcast(signedTx: BitcoinSignedTx): Promise<BitcoinTxHash> {
    const { data } = await api.post<BitcoinTxHash>('/v1/babylon/transaction/broadcast', {
      tx_serialized: signedTx.data.signed_tx_serialized,
    });
    return data;
  }
}
