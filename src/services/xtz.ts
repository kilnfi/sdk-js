import api from '../api';
import { Service } from './service';
import {
  XtzNetworkStats,
  XtzRewards,
  XtzSignedTx,
  XtzStakes,
  XtzTx,
  XtzTxHash,
  XtzTxStatus,
} from '../types/xtz';
import { ServiceProps } from '../types/service';
import { Integration } from '../types/integrations';

export class XtzService extends Service {
  constructor({ testnet }: ServiceProps) {
    super({ testnet });
  }

  /**
   * Craft Tezos delegation transaction
   * @param accountId id of the kiln account to use for the stake transaction
   * @param walletAddress wallet address delegating
   * @param bakerAddress baker address that you wish to delegate to
   */
  async craftStakeTx(
    accountId: string,
    walletAddress: string,
    bakerAddress: string,
  ): Promise<XtzTx> {
    try {
      const { data } = await api.post<XtzTx>(
        `/v1/xtz/transaction/stake`,
        {
          account_id: accountId,
          wallet: walletAddress,
          options: {
            baker_address: bakerAddress,
          },
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft Tezos undelegation transaction
   * @param walletAddress wallet address delegating
   */
  async craftUnStakeTx(
    walletAddress: string,
  ): Promise<XtzTx> {
    try {
      const { data } = await api.post<XtzTx>(
        `/v1/xtz/transaction/unstake`,
        {
          wallet: walletAddress,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Sign transaction with given integration
   * @param integration
   * @param tx
   * @param note
   */
  async sign(integration: Integration, tx: XtzTx, note?: string): Promise<XtzSignedTx> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            'content': tx.data.unsigned_tx_hash,
          },
        ],
      },
    };

    const fbSigner = this.getFbSigner(integration);
    const fbNote = note ? note : 'XTZ tx from @kilnfi/sdk';
    const signedTx = await fbSigner.signWithFB(payload, this.testnet ? 'XTZ_TEST' : 'XTZ', fbNote);
    const signature: string = signedTx.signedMessages![0].signature.fullSig;
    const { data } = await api.post<XtzSignedTx>(
      `/v1/xtz/transaction/prepare`,
      {
        unsigned_tx_serialized: tx.data.unsigned_tx_serialized,
        signature: signature,
      });
    return data;
  }


  /**
   * Broadcast transaction to the network
   * @param signedTx: serialized signed tx
   */
  async broadcast(signedTx: XtzSignedTx): Promise<XtzTxHash> {
    try {
      const { data } = await api.post<XtzTxHash>(
        `/v1/xtz/transaction/broadcast`,
        {
          tx_serialized: signedTx.data.signed_tx_serialized,
        });
      return data;
    } catch (e: any) {
      throw new Error(e);
    }
  }

  /**
   * Get transaction status
   * @param blockNumber
   * @param txHash: transaction hash
   */
  async getTxStatus(blockNumber: number, txHash: string): Promise<XtzTxStatus> {
    try {
      const { data } = await api.get<XtzTxStatus>(
        `/v1/xtz/transaction/status?block_number=${blockNumber}&tx_hash=${txHash}`);
      return data;
    } catch (e: any) {
      throw new Error(e);
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
    try {
      const { data } = await api.get<XtzStakes>(
        `/v1/xtz/stakes?accounts=${accountIds.join(',')}`);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Retrieve stakes of given wallet addresses
   * @param walletAddresses addresses of the wallets of which you wish to retrieve rewards
   * @returns {XtzStakes} Tezos Stakes
   */
  async getStakesByWallets(
    walletAddresses: string[],
  ): Promise<XtzStakes> {
    try {
      const { data } = await api.get<XtzStakes>(
        `/v1/xtz/stakes?wallets=${walletAddresses.join(',')}`,
      );
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
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
    try {
      const query = `/v1/xtz/rewards?accounts=${accountIds.join(',')}${
        startDate ? `&start_date=${startDate}` : ''
      }${endDate ? `&end_date=${endDate}` : ''}`;
      const { data } = await api.get<XtzRewards>(query);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
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
    try {
      const query = `/v1/xtz/rewards?wallets=${walletAddresses.join(',')}${
        startDate ? `&start_date=${startDate}` : ''
      }${endDate ? `&end_date=${endDate}` : ''}`;
      const { data } = await api.get<XtzRewards>(query);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Retrieve XTZ network stats
   */
  async getNetworkStats(): Promise<XtzNetworkStats> {
    try {
      const { data } = await api.get<XtzNetworkStats>(
        `/v1/xtz/network-stats`,
      );
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Convert XTZ to mutez
   * @param xtz
   */
  xtzToMutez(xtz: string): string {
    return (Number(xtz) * 10 ** 6).toString();
  }
}
