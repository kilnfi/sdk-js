import api from "../api";
import { Service } from "./service";
import { ServiceProps } from "../types/service";
import { Integration } from "../types/integrations";
import { parseUnits } from "viem";
import { TonSignedTx, TonTx, TonTxHash, TonTxStatus } from "../types/ton";

export class TonService extends Service {
  constructor({ testnet }: ServiceProps) {
    super({ testnet });
  }

  /**
   * Craft TON staking transaction to a single nomination pool
   * @param accountId id of the kiln account to use for the stake transaction
   * @param walletAddress sender of the transaction
   * @param poolAddress single nomination pool address
   * @param amountTon how much to stake in TON
   */
  async craftStakeSingleNominationPoolTx(
    accountId: string,
    walletAddress: string,
    poolAddress: string,
    amountTon: number,
  ): Promise<TonTx> {
    const { data } = await api.post<TonTx>(`/v1/ton/transaction/stake-single-nomination-pool`, {
      account_id: accountId,
      wallet: walletAddress,
      amount_nanoton: this.tonToNanoTon(amountTon.toString()),
      pool_address: poolAddress,
    });
    return data;
  }

  /**
   * Craft TON staking transaction to a nomination pool
   * @param accountId id of the kiln account to use for the stake transaction
   * @param walletAddress sender of the transaction
   * @param poolAddress nomination pool address
   * @param amountTon how much to stake in TON
   */
  async craftStakeNominationPoolTx(
    accountId: string,
    walletAddress: string,
    poolAddress: string,
    amountTon: number,
  ): Promise<TonTx> {
    const { data } = await api.post<TonTx>(`/v1/ton/transaction/stake-nomination-pool`, {
      account_id: accountId,
      wallet: walletAddress,
      amount_nanoton: this.tonToNanoTon(amountTon.toString()),
      pool_address: poolAddress,
    });
    return data;
  }

  /**
   * Craft TON unstake transaction from a single nomination pool
   * @param walletAddress sender of the transaction
   * @param poolAddress single nomination pool address
   * @param amountTon how much to stake in TON
   */
  async craftUnstakeSingleNominationPoolTx(
    walletAddress: string,
    poolAddress: string,
    amountTon?: number,
  ): Promise<TonTx> {
    const { data } = await api.post<TonTx>(`/v1/ton/transaction/unstake-single-nomination-pool`, {
      wallet: walletAddress,
      amount_nanoton: amountTon ? this.tonToNanoTon(amountTon.toString()) : undefined,
      pool_address: poolAddress,
    });
    return data;
  }

  /**
   * Craft TON unstake transaction from a nomination pool
   * @param walletAddress sender of the transaction
   * @param poolAddress nomination pool address
   */
  async craftUnstakeNominationPoolTx(walletAddress: string, poolAddress: string): Promise<TonTx> {
    const { data } = await api.post<TonTx>(`/v1/ton/transaction/unstake-nomination-pool`, {
      wallet: walletAddress,
      pool_address: poolAddress,
    });
    return data;
  }

  /**
   * Craft TON whitelist tx for vesting contract
   * @param walletAddress sender of the transaction
   * @param vestingContractAddress vesting contract address
   * @param addresses addresses to whitelist
   */
  async craftWhitelistVestingContractTx(
    walletAddress: string,
    vestingContractAddress: string,
    addresses: string[],
  ): Promise<TonTx> {
    const { data } = await api.post<TonTx>(`/v1/ton/transaction/whitelist-vesting-contract`, {
      wallet: walletAddress,
      vesting_contract_address: vestingContractAddress,
      addresses: addresses,
    });
    return data;
  }

  /**
   * Craft TON send from a vesting contract tx
   * @param accountId id of the kiln account to use for the stake transaction
   * @param walletAddress sender of the transaction
   * @param vestingContractAddress vesting contract address
   * @param destinationAddress the destination to which the TON will be sent to
   * @param amountTon the amount of TON to send
   */
  async craftSendFromVestingContractTx(
    accountId: string,
    walletAddress: string,
    vestingContractAddress: string,
    destinationAddress: string,
    amountTon: number,
  ): Promise<TonTx> {
    const { data } = await api.post<TonTx>(`/v1/ton/transaction/send-from-vesting-contract`, {
      account_id: accountId,
      wallet: walletAddress,
      vesting_contract_address: vestingContractAddress,
      destination_address: destinationAddress,
      amount_nanoton: this.tonToNanoTon(amountTon.toString()),
    });
    return data;
  }

  /**
   * Sign transaction with given integration
   * @param integration custody solution to sign with
   * @param tx raw transaction
   * @param note note to identify the transaction in your custody solution
   */
  async sign(integration: Integration, tx: TonTx, note?: string): Promise<TonSignedTx> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.data.unsigned_tx_hash,
          },
        ],
      },
    };

    const fbSigner = this.getFbSigner(integration);
    const fbNote = note ? note : "TON tx from @kilnfi/sdk";
    const fbTx = await fbSigner.sign(payload, this.testnet ? "TON_TEST" : "TON", fbNote);
    const signature =
      fbTx.signedMessages && fbTx.signedMessages.length > 0 ? fbTx.signedMessages[0].signature.fullSig : undefined;

    const { data } = await api.post<TonSignedTx>(`/v1/ton/transaction/prepare`, {
      unsigned_tx_serialized: tx.data.unsigned_tx_serialized,
      signature: signature,
      from: tx.data.from,
    });
    data.data.fireblocks_tx = fbTx;
    return data;
  }

  /**
   * Broadcast transaction to the network
   * @param signedTx serialized signed tx
   */
  async broadcast(signedTx: TonSignedTx): Promise<TonTxHash> {
    const { data } = await api.post<TonTxHash>(`/v1/ton/transaction/broadcast`, {
      tx_serialized: signedTx.data.signed_tx_serialized,
    });
    return data;
  }

  /**
   * Get transaction status by message hash
   * @param msgHash transaction hash
   */
  async getTxStatus(msgHash: string): Promise<TonTxStatus> {
    const { data } = await api.get<TonTxStatus>(`/v1/ton/transaction/status?msg_hash=${msgHash}`);
    return data;
  }

  /**
   * Convert TON to nanoTON
   * @param ton
   */
  tonToNanoTon(ton: string): string {
    return parseUnits(ton, 9).toString();
  }
}
