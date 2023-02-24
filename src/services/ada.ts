import { Service } from './service';
import {
  AdaRewards,
  AdaSignedMessage,
  AdaSignedTx,
  AdaStakeOptions,
  AdaStakes,
  AdaTx,
  AdaTxHash,
  AdaTxStatus,
  InternalAdaConfig,
} from '../types/ada';
import api from '../api';

export class AdaService extends Service {
  constructor({ testnet, integrations }: InternalAdaConfig) {
    super({ testnet, integrations });
  }

  /**
   * Craft ada delegate transaction, all the wallet's balance will be delegated to the pool
   * @param accountId id of the kiln account to use for the stake transaction
   * @param walletAddress withdrawal creds /!\ losing it => losing the ability to withdraw
   * @param options
   */
  async craftStakeTx(
    accountId: string,
    walletAddress: string,
    options?: AdaStakeOptions,
  ): Promise<AdaTx> {
    try {
      const { data } = await api.post<AdaTx>(
        `/v1/ada/transaction/stake`,
        {
          account_id: accountId,
          wallet: walletAddress,
          options: options,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft ada withdraw rewards transaction
   * @param walletAddress wallet delegating that will receive the rewards
   * @param amountLovelace amount of rewards to withdraw in lovelace, if not provided all rewards are withdrawn
   */
  async craftWithdrawRewardsTx(
    walletAddress: string,
    amountLovelace?: string,
  ): Promise<AdaTx> {
    try {
      const { data } = await api.post<AdaTx>(
        `/v1/ada/transaction/withdraw-rewards`,
        {
          wallet: walletAddress,
          amount_lovelace: amountLovelace,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft ada undelegate transaction
   * @param walletAddress wallet delegating that will receive the rewards
   */
  async craftUnstakeTx(
    walletAddress: string,
  ): Promise<AdaTx> {
    try {
      const { data } = await api.post<AdaTx>(
        `/v1/ada/transaction/unstake`,
        {
          wallet: walletAddress,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  adaToLovelace(amountAda: string): string {
    return (parseFloat(amountAda) * 1000000).toFixed();
  }

  /**
   * Sign transaction with given integration
   * @param integration
   * @param tx
   */
  async sign(integration: string, tx: AdaTx): Promise<AdaSignedTx> {
    try {
      const currentIntegration = this.integrations?.find(int => int.name === integration);
      if (!currentIntegration) {
        throw new Error(`Unknown integration, please provide an integration name that matches one of the integrations provided in the config.`);
      }

      // We only support fireblocks integration for now
      if (currentIntegration.provider !== 'fireblocks') {
        throw new Error(`Unsupported integration provider: ${currentIntegration.provider}`);
      }

      if (!this.fbSigner) {
        throw new Error(`Could not retrieve fireblocks signer.`);
      }

      const payload = {
        rawMessageData: {
          messages: [
            {
              'content': tx.data.unsigned_tx_hash,
            },
            {
              'content': tx.data.unsigned_tx_hash,
              'bip44change': 2,
            },
          ],
        },
        inputsSelection: {
          inputsToSpend: tx.data.inputs,
        },
      };

      const fbTx = await this.fbSigner.signWithFB(payload, this.testnet ? 'ADA_TEST' : 'ADA');

      if (!fbTx.signedMessages) {
        throw new Error(`Could not sign the transaction.`);
      }

      const signedMessages: AdaSignedMessage[] = fbTx.signedMessages.map((message) => {
        return {
          pubkey: message.publicKey,
          signature: message.signature.fullSig,
        };
      });

      const { data } = await api.post<AdaSignedTx>(
        `/v1/ada/transaction/prepare`,
        {
          unsigned_tx_serialized: tx.data.unsigned_tx_serialized,
          signed_messages: signedMessages,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Broadcast transaction to the network
   * @param signedTx
   */
  async broadcast(signedTx: AdaSignedTx): Promise<AdaTxHash> {
    try {
      const { data } = await api.post<AdaTxHash>(
        `/v1/ada/transaction/broadcast`,
        {
          tx_serialized: signedTx.data.signed_tx_serialized,
        });
      return data;
    } catch (error: any) {
      throw new Error(error);
    }
  }

  /**
   * Get transaction status
   * @param txHash: transaction hash
   */
  async getTxStatus(txHash: string): Promise<AdaTxStatus> {
    try {
      const { data } = await api.get<AdaTxStatus>(
        `/v1/ada/transaction/status?tx_hash=${txHash}`);
      return data;
    } catch (error: any) {
      throw new Error(error);
    }
  }

  /**
   * Retrieve stakes of given kiln accounts
   * @param accountIds: kiln account ids of which you wish to retrieve stakes
   * @returns {AdaStakes} Cardano Stakes
   */
  async getStakesByAccounts(
    accountIds: string[],
  ): Promise<AdaStakes> {
    try {
      const { data } = await api.get<AdaStakes>(
        `/v1/ada/stakes?accounts=${accountIds.join(',')}`);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Retrieve stakes of given stake accounts
   * @param stakeAddresses: stake addresses of which you wish to retrieve stakes
   * @returns {AdaStakes} Cardano Stakes
   */
  async getStakesByStakeAddresses(
    stakeAddresses: string[],
  ): Promise<AdaStakes> {
    try {
      const { data } = await api.get<AdaStakes>(
        `/v1/ada/stakes?stake_addresses=${stakeAddresses.join(',')}`);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Retrieve stakes of given wallets
   * @param wallets: wallet addresses of which you wish to retrieve stakes
   * @returns {AdaStakes} Cardano Stakes
   */
  async getStakesByWallets(
    wallets: string[],
  ): Promise<AdaStakes> {
    try {
      const { data } = await api.get<AdaStakes>(
        `/v1/ada/stakes?wallets=${wallets.join(',')}`);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Retrieve rewards for given accounts
   * @param accountIds kiln account ids of which you wish to retrieve rewards
   * @param startDate: optional date YYYY-MM-DD from which you wish to retrieve rewards
   * @param endDate: optional date YYYY-MM-DD until you wish to retrieve rewards
   * @returns {AdaRewards} Cardano rewards
   */
  async getRewardsByAccounts(
    accountIds: string[],
    startDate?: string,
    endDate?: string,
  ): Promise<AdaRewards> {
    try {
      const query = `/v1/ada/rewards?accounts=${accountIds.join(',')}${
        startDate ? `&start_date=${startDate}` : ''
      }${endDate ? `&end_day=${endDate}` : ''}`;
      const { data } = await api.get<AdaRewards>(query);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Retrieve rewards for given stake accounts
   * @param stakeAddresses stake addresses of which you wish to retrieve rewards
   * @param startDate: optional date YYYY-MM-DD from which you wish to retrieve rewards
   * @param endDate: optional date YYYY-MM-DD until you wish to retrieve rewards
   * @returns {AdaRewards} Cardano rewards
   */
  async getRewardsByStakeAddresses(
    stakeAddresses: string[],
    startDate?: string,
    endDate?: string,
  ): Promise<AdaRewards> {
    try {
      const query = `/v1/ada/rewards?stake_addresses=${stakeAddresses.join(',')}${
        startDate ? `&start_date=${startDate}` : ''
      }${endDate ? `&end_day=${endDate}` : ''}`;
      const { data } = await api.get<AdaRewards>(query);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Retrieve rewards for given stake accounts
   * @param wallets wallet addresses of which you wish to retrieve rewards
   * @param startDate: optional date YYYY-MM-DD from which you wish to retrieve rewards
   * @param endDate: optional date YYYY-MM-DD until you wish to retrieve rewards
   * @returns {AdaRewards} Cardano rewards
   */
  async getRewardsByWallets(
    wallets: string[],
    startDate?: string,
    endDate?: string,
  ): Promise<AdaRewards> {
    try {
      const query = `/v1/ada/rewards?wallets=${wallets.join(',')}${
        startDate ? `&start_date=${startDate}` : ''
      }${endDate ? `&end_day=${endDate}` : ''}`;
      const { data } = await api.get<AdaRewards>(query);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }
}
