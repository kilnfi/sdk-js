import api from '../api';
import {
  EthKilnStats,
  EthNetworkStats,
  EthRewards,
  EthSignedTx,
  EthStakes,
  EthTx,
  EthTxHash,
  EthTxStatus,
} from '../types/eth';
import { Service } from './service';
import { utils } from 'ethers';
import { ServiceProps } from '../types/service';
import { Integration } from '../types/integrations';
import { TransactionResponse } from 'fireblocks-sdk';

export class EthService extends Service {
  constructor({ testnet }: ServiceProps) {
    super({ testnet });
  }

  /**
   * Spin up Ethereum validators and craft a staking transaction
   * @param accountId id of the kiln account to use for the stake transaction
   * @param walletAddress withdrawal creds /!\ losing it => losing the ability to withdraw
   * @param amountEth how many tokens to stake in ETH (must be a multiple of 32)
   */
  async craftStakeTx(
    accountId: string,
    walletAddress: string,
    amountEth: number,
  ): Promise<EthTx> {
    try {
      const { data } = await api.post<EthTx>(
        `/v1/eth/transaction/stake`,
        {
          account_id: accountId,
          wallet: walletAddress,
          amount_wei: this.ethToWei(amountEth.toString()),
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Request the exit of validators
   * @param walletAddress wallet address used to send the tx
   * @param validatorAddresses list of validator addresses to exit
   */
  async craftExitRequestTx(
    walletAddress: string,
    validatorAddresses: string[],
  ): Promise<EthTx> {
    try {
      const { data } = await api.post<EthTx>(
        `/v1/eth/transaction/exit-request`,
        {
          wallet: walletAddress,
          validators: validatorAddresses,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Sign transaction with given integration
   * @param integration custody solution to sign with
   * @param tx ETH transaction
   * @param note note to identify the transaction in your custody solution
   */
  async sign(integration: Integration, tx: EthTx, note?: string): Promise<EthSignedTx> {
    try {
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
      const assetId = this.testnet ? 'ETH_TEST6' : 'ETH';
      const fbNote = note ? note : 'ETH tx from @kilnfi/sdk';
      const fbTx = await fbSigner.signWithFB(
        payload,
        assetId,
        fbNote,
      );
      const { data } = await api.post<EthSignedTx>(
        `/v1/eth/transaction/prepare`,
        {
          unsigned_tx_serialized: tx.data.unsigned_tx_serialized,
          r: `0x${fbTx?.signedMessages?.[0].signature.r}`,
          s: `0x${fbTx?.signedMessages?.[0].signature.s}`,
          v: fbTx?.signedMessages?.[0].signature.v ?? 0,
        });
      data.data.fireblocks_tx = fbTx;
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Sign transaction with given integration using Fireblocks contract call feature
   * @param integration custody solution to sign with
   * @param tx ETH transaction
   * @param note note to identify the transaction in your custody solution
   */
  async signAndBroadcast(integration: Integration, tx: EthTx,  note?: string): Promise<TransactionResponse> {
    if(!integration.fireblocksDestinationId) {
      throw new Error('Fireblocks destination id is missing in integration');
    }
    try {
      const payload = {
        contractCallData: tx.data.contract_call_data,
      };

      const fbSigner = this.getFbSigner(integration);
      const assetId = this.testnet ? 'ETH_TEST6' : 'ETH';
      const fbNote = note ? note : 'ETH tx from @kilnfi/sdk';
      return  await fbSigner.signAndBroadcastWithFB(
        payload,
        assetId,
        tx,
        integration.fireblocksDestinationId,
        true,
        fbNote,
      );
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Broadcast transaction to the network
   * @param signedTx
   */
  async broadcast(signedTx: EthSignedTx): Promise<EthTxHash> {
    try {
      const { data } = await api.post<EthTxHash>(
        `/v1/eth/transaction/broadcast`,
        {
          tx_serialized: signedTx.data.signed_tx_serialized,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Get transaction status
   * @param txHash: transaction hash
   */
  async getTxStatus(txHash: string): Promise<EthTxStatus> {
    try {
      const { data } = await api.get<EthTxStatus>(
        `/v1/eth/transaction/status?tx_hash=${txHash}`);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Retrieve stakes of given kiln accounts
   * @param accountIds: account ids of which you wish to retrieve rewards
   * @returns {EthStakes} Ethereum Stakes
   */
  async getStakesByAccounts(
    accountIds: string[],
  ): Promise<EthStakes> {
    try {
      const { data } = await api.get<EthStakes>(
        `/v1/eth/stakes?accounts=${accountIds.join(',')}`);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Retrieve stakes of given wallet addresses
   * @param walletAddresses addresses of the wallets of which you wish to retrieve rewards
   * @returns {EthStakes} Ethereum Stakes
   */
  async getStakesByWallets(
    walletAddresses: string[],
  ): Promise<EthStakes> {
    try {
      const { data } = await api.get<EthStakes>(
        `/v1/eth/stakes?wallets=${walletAddresses.join(',')}`,
      );
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Retrieve stakes on given validator addresses
   * @param validatorAddresses validator addresses of which you wish to retrieve rewards
   * @returns {EthStakes} Ethereum Stakes
   */
  async getStakesByValidators(validatorAddresses: string[]): Promise<EthStakes> {
    try {
      const { data } = await api.get<EthStakes>(
        `/v1/eth/stakes?validators=${validatorAddresses.join(',')}`,
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
   * @returns {EthRewards} Ethereum rewards
   */
  async getRewardsByAccounts(
    accountIds: string[],
    startDate?: string,
    endDate?: string,
  ): Promise<EthRewards> {
    try {
      const query = `/v1/eth/rewards?accounts=${accountIds.join(',')}${
        startDate ? `&start_date=${startDate}` : ''
      }${endDate ? `&end_date=${endDate}` : ''}`;
      const { data } = await api.get<EthRewards>(query);
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
   * @returns {EthRewards} Ethereum rewards
   */
  async getRewardsByWallets(
    walletAddresses: string[],
    startDate?: string,
    endDate?: string,
  ): Promise<EthRewards> {
    try {
      const query = `/v1/eth/rewards?wallets=${walletAddresses.join(',')}${
        startDate ? `&start_date=${startDate}` : ''
      }${endDate ? `&end_date=${endDate}` : ''}`;
      const { data } = await api.get<EthRewards>(query);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Retrieve rewards by day on given validator addresses
   * @param validatorAddresses validator addresses of which you wish to retrieve rewards
   * @param startDate: optional date YYYY-MM-DD from which you wish to retrieve rewards
   * @param endDate: optional date YYYY-MM-DD until you wish to retrieve rewards
   * @returns {EthRewards} Ethereum rewards
   */
  async getRewardsByValidators(
    validatorAddresses: string[],
    startDate?: string,
    endDate?: string,
  ): Promise<EthRewards> {
    try {
      const query = `/v1/eth/rewards?validators=${validatorAddresses.join(',')}${
        startDate ? `&start_date=${startDate}` : ''
      }${endDate ? `&end_date=${endDate}` : ''}`;
      const { data } = await api.get<EthRewards>(query);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Retrieve ETH network stats
   */
  async getNetworkStats(): Promise<EthNetworkStats> {
    try {
      const { data } = await api.get<EthNetworkStats>(
        `/v1/eth/network-stats`,
      );
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Retrieve ETH kiln stats
   */
  async getKilnStats(): Promise<EthKilnStats> {
    try {
      const { data } = await api.get<EthKilnStats>(
        `/v1/eth/kiln-stats`,
      );
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Convert ETH to WEI
   * @param eth
   */
  ethToWei(eth: string): string {
    return utils.parseEther(eth).toString();
  }
}
