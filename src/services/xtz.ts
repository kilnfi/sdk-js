import api from '../api';
import {
  BroadcastError,
  GetTxStatusError,
  InvalidIntegration,
} from "../errors/integrations";
import { Service } from "./service";
import { b58cdecode, b58cencode, buf2hex, prefix } from '@taquito/utils';
import {
  InternalTezosConfig,
  TezosTx,
  TxStatus,
  XtzNetworkStats,
  XtzRewards,
  XtzStakeOptions,
  XtzStakes,
} from "../types/xtz";

export class XtzService extends Service {
  constructor({ testnet, integrations }: InternalTezosConfig) {
    super({ testnet, integrations });
  }

  /**
   * Craft Tezos delegation transaction
   * @param accountId id of the kiln account to use for the stake transaction
   * @param walletAddress wallet address delegating
   * @param options
   */
  async craftStakeTx(
    accountId: string,
    walletAddress: string,
    options?: XtzStakeOptions,
  ): Promise<TezosTx> {
    const { data } = await api.post<TezosTx>(
      `/v1/xtz/transaction/stake`,
      {
        account_id: accountId,
        wallet: walletAddress,
        options: options,
      });
    return data;
  }

  /**
   * Craft Tezos undelegation transaction
   * @param walletAddress wallet address delegating
   */
  async craftUnStakeTx(
    walletAddress: string,
  ): Promise<TezosTx> {
    const { data } = await api.post<TezosTx>(
      `/v1/xtz/transaction/unstake`,
      {
        wallet: walletAddress,
      });
    return data;
  }

  /**
   * Sign transaction with given integration
   * @param integration
   * @param tx
   * @param note
   */
  async sign(integration: string, tx: TezosTx, note?: string): Promise<string | any> {
    if (!this.integrations?.find(int => int.name === integration)) {
      throw new InvalidIntegration(`Unknown integration, please provide an integration name that matches one of the integrations provided in the config.`);
    }

    if (!this.fbSigner) {
      throw new InvalidIntegration(`Could not retrieve fireblocks signer.`);
    }

    const payload = {
      rawMessageData: {
        messages: [
          {
            "content": tx.unsigned_tx_hashed,
          },
        ],
      },
    };

    const signedTx = await this.fbSigner.signWithFB(payload, this.testnet ? 'XTZ_TEST' : 'XTZ', note);
    const signature: string = signedTx.signedMessages![0].signature.fullSig;
    const prefixSig: any = b58cencode(signature, prefix.edsig);
    const sigDecoded: Uint8Array = b58cdecode(prefixSig, prefix.edsig);
    const sigToInject: string = buf2hex(Buffer.from(sigDecoded));
    return tx.unsigned_tx_hex + sigToInject;
  }


  /**
   * Broadcast transaction to the network
   * @param hexSerializedTx
   */
  async broadcast(hexSerializedTx: string): Promise<string | undefined> {
    try {
      const { data } = await api.post<string>(
        `/v1/xtz/transaction/broadcast`,
        {
          serialized_tx: hexSerializedTx,
        });
      return data;
    } catch (e: any) {
      throw new BroadcastError(e);
    }
  }

  /**
   * Get transaction status
   * @param blockNumber
   * @param transactionHash: transaction hash
   */
  async getTxStatus(blockNumber: number, transactionHash: string): Promise<TxStatus> {
    try {
      const { data } = await api.get<TxStatus>(
        `/v1/xtz/transaction/status?block_number=${blockNumber}&tx_hash=${transactionHash}`);
      return data;
    } catch (e: any) {
      throw new GetTxStatusError(e);
    }
  }

  /**
   * Retrieve stakes of given kiln accounts
   * @param accountIds: account ids of which you wish to retrieve rewards
   * @returns {XtzStakes} Tezos Stakes
   */
  async getStakesByAccounts(
    accountIds: string[],
  ): Promise<XtzStakes> {
    const { data } = await api.get<XtzStakes>(
      `/v1/xtz/stakes?accounts=${accountIds.join(',')}`);
    return data;
  }

  /**
   * Retrieve stakes of given wallet addresses
   * @param walletAddresses addresses of the wallets of which you wish to retrieve rewards
   * @returns {XtzStakes} Tezos Stakes
   */
  async getStakesByWallets(
    walletAddresses: string[],
  ): Promise<XtzStakes> {
    const { data } = await api.get<XtzStakes>(
      `/v1/xtz/stakes?wallets=${walletAddresses.join(',')}`,
    );
    return data;
  }

  /**
   * Retrieve rewards by day of given kiln accounts
   * @param accountIds: account ids of which you wish to retrieve rewards
   * @param startDate: optional date YYYY-MM-DD from which you wish to retrieve rewards
   * @param endDate: optional date YYYY-MM-DD until you wish to retrieve rewards
   * @returns {XtzRewards} Tezos rewards
   */
  async getRewardsByAccounts(
    accountIds: string[],
    startDate?: string,
    endDate?: string,
  ): Promise<XtzRewards> {
    const query = `/v1/xtz/rewards?accounts=${accountIds.join(',')}${
      startDate ? `&start_date=${startDate}` : ''
    }${endDate ? `&end_date=${endDate}` : ''}`;
    const { data } = await api.get<XtzRewards>(query);
    return data;
  }

  /**
   * Retrieve rewards by day of given wallet addresses
   * @param walletAddresses addresses of the wallets of which you wish to retrieve rewards
   * @param startDate: optional date YYYY-MM-DD from which you wish to retrieve rewards
   * @param endDate: optional date YYYY-MM-DD until you wish to retrieve rewards
   * @returns {XtzRewards} Tezos rewards
   */
  async getRewardsByWallets(
    walletAddresses: string[],
    startDate?: string,
    endDate?: string,
  ): Promise<XtzRewards> {
    const query = `/v1/xtz/rewards?wallets=${walletAddresses.join(',')}${
      startDate ? `&start_date=${startDate}` : ''
    }${endDate ? `&end_date=${endDate}` : ''}`;
    const { data } = await api.get<XtzRewards>(query);
    return data;
  }

  /**
   * Retrieve XTZ network stats
   */
  async getNetworkStats(): Promise<XtzNetworkStats> {
    const { data } = await api.get<XtzNetworkStats>(
      `/v1/xtz/network-stats`,
    );
    return data;
  }
}
