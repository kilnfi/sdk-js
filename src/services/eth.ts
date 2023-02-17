import Common, { Chain, Hardfork } from '@ethereumjs/common';
import { FeeMarketEIP1559Transaction } from "@ethereumjs/tx";
import api from '../api';
import {
  EthereumTx, EthKilnStats,
  EthNetworkStats,
  EthRewards,
  EthStakes,
  EthTxStatus,
  InternalEthereumConfig,
} from '../types/eth';
import {
  BroadcastError,
  GetTxStatusError,
  InvalidIntegration,
  InvalidSignature,
} from "../errors/integrations";
import { Service } from "./service";
import { utils } from "ethers";

export class EthService extends Service {
  constructor({ testnet, integrations }: InternalEthereumConfig) {
    super({ testnet, integrations });
  }

  /**
   * Spin up Ethereum validators and craft a staking transaction
   * @param accountId id of the kiln account to use for the stake transaction
   * @param walletAddress withdrawal creds /!\ losing it => losing the ability to withdraw
   * @param amountWei how many tokens to stake in WEI (must be a multiple of 32ETH, eg 32000000000000000000)
   */
  async craftStakeTx(
    accountId: string,
    walletAddress: string,
    amountWei: string,
  ): Promise<EthereumTx> {
    try {
      const { data } = await api.post<EthereumTx>(
        `/v1/eth/transaction/stake`,
        {
          account_id: accountId,
          wallet: walletAddress,
          amount_wei: amountWei,
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
  async sign(integration: string, tx: EthereumTx, note?: string): Promise<string> {
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

    const signatures = await this.fbSigner.signWithFB(payload, this.testnet ? 'ETH_TEST3' : 'ETH', note);
    const common = new Common({
      chain: this.testnet ? Chain.Goerli : Chain.Mainnet,
      hardfork: Hardfork.London,
    });
    const sigV: number = signatures?.signedMessages?.[0].signature.v ?? 0;
    const unsignedTx = FeeMarketEIP1559Transaction.fromSerializedTx(Buffer.from(tx.unsigned_tx_serialized, 'hex'));
    const signedTx = FeeMarketEIP1559Transaction.fromTxData({
      ...unsignedTx.toJSON(),
      r: `0x${signatures?.signedMessages?.[0].signature.r}`,
      s: `0x${signatures?.signedMessages?.[0].signature.s}`,
      v: sigV,
      gasPrice: undefined,
    }, { common });

    if (signedTx.verifySignature()) {
      return signedTx.serialize().toString('hex');
    } else {
      throw new InvalidSignature(`The transaction signatures could not be verified.`);
    }
  }


  /**
   * Broadcast transaction to the network
   * @param hexSerializedTx
   */
  async broadcast(hexSerializedTx: string): Promise<string | undefined> {
    try {
      const { data } = await api.post<string>(
        `/v1/eth/transaction/broadcast`,
        {
          serialized_tx: hexSerializedTx,
        });
      return data;
    } catch (err: any) {
      throw new BroadcastError(err);
    }
  }

  /**
   * Get transaction status
   * @param transactionHash: transaction hash
   */
  async getTxStatus(transactionHash: string): Promise<EthTxStatus> {
    try {
      const { data } = await api.get<EthTxStatus>(
        `/v1/eth/transaction/status?tx_hash=${transactionHash}`);
      return data;
    } catch (err: any) {
      throw new GetTxStatusError(err);
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
      }${endDate ? `&end_day=${endDate}` : ''}`;
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
   * Utility function to convert ETH to WEI
   * @param eth
   */
  ethToWei(eth: string): string {
    return utils.parseEther(eth).toString();
  }
}
