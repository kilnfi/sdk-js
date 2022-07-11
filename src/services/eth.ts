import api from '../api';
import { EthStake } from '../models/eth';

export class EthService {
  constructor() {}

  /**
   * Retrieve stakes of a Kiln account
   * @param accountId id of the kiln account used to make the stake
   * @param start for paging - beginning index of the page
   * @param end for paging - end index of the page
   * @returns {EthStake} Ethereum Stake
   */
  async getAccountStakes(
    accountId: string,
    start: number,
    end: number
  ): Promise<EthStake> {
    const { data } = await api.get<EthStake>(
      `/v1/eth/stakes?account=${accountId}&start=${start}?end=${end}`
    );
    return data;
  }

  /**
   * Retrieve stakes made with a wallet
   * @param walletAddress address of the wallet used to make the stake
   * @param start for paging - beginning index of the page
   * @param end for paging - end index of the page
   * @returns {EthStake[]} Ethereum Stakes
   */
  async getWalletStakes(
    walletAddress: string,
    start: number,
    end: number
  ): Promise<EthStake> {
    const { data } = await api.get<EthStake>(
      `/v1/eth/stakes?wallets=${walletAddress}&start=${start}&end=${end}`
    );
    return data;
  }

  /**
   * Retrieve stake on a validator
   * @param validatorAddress address of the validator
   * @returns {EthStake} Ethereum Stake
   */
  async getStake(validatorAddress: string): Promise<EthStake> {
    const { data } = await api.get<EthStake>(
      `/v1/eth/stakes/${validatorAddress}`
    );
    return data;
  }
}
