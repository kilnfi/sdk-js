import Web3 from 'web3';
import api from '../api';
import { InvalidStakeAmount } from '../errors/eth';
import {
  BATCH_DEPOSIT_CONTRACT_ABI,
  BATCH_DEPOSIT_CONTRACT_ADDRESS,
} from '../globals';
import {
  EthereumStakeTx,
  EthStake,
  InternalBatchDeposit,
  InternalEthereumConfig,
} from '../models/eth';

export class EthService {
  private web3: Web3;
  private testnet: boolean;

  constructor({ testnet }: InternalEthereumConfig) {
    this.web3 = new Web3();
    this.testnet = testnet === true;
  }

  /**
   * Spin Up Ethereum validators and craft staking transaction
   * @param accountId id of the kiln account to use for the stake transaction
   * @param walletAddress withdrawal creds /!\ losing it => losing the ability to withdraw
   * @param amount how many tokens to stake in ETH (must be a multiple of 32)
   */
  async craftStakeTx(
    accountId: string,
    walletAddress: string,
    amount: number,
  ): Promise<EthereumStakeTx> {
    if (amount % 32 !== 0 || amount <= 0) {
      throw new InvalidStakeAmount(
        'Ethereum stake must be a multiple of 32 ETH',
      );
    }

    try {
      // create validation keys via api
      const { data } = await api.post<InternalBatchDeposit>(
        '/v1/eth/keys?format=batch_deposit',
        {
          withdrawalAddress: walletAddress,
        },
        {
          headers: {
            "X-Kiln-Account": accountId,
          },
        },
      );

      // setup tx variables
      const batchDeposit = new this.web3.eth.Contract(
        JSON.parse(BATCH_DEPOSIT_CONTRACT_ABI),
        BATCH_DEPOSIT_CONTRACT_ADDRESS,
      );
      const {
        pubkeys,
        // eslint-disable-next-line camelcase
        withdrawal_credentials,
        signatures,
        // eslint-disable-next-line camelcase
        deposit_data_roots,
      } = data.data;

      // craft staking transaction, using the batch deposit contracts
      return {
        from: walletAddress,
        to: BATCH_DEPOSIT_CONTRACT_ADDRESS,
        data: batchDeposit.methods
          .batchDeposit(
            pubkeys.map((v) => '0x' + v),
            withdrawal_credentials.map((v) => '0x' + v),
            signatures.map((v) => '0x' + v),
            deposit_data_roots.map((v) => '0x' + v),
          )
          .encodeABI(),
        value: amount.toString(),
        chainId: this.testnet ? '0x5' : '0x1',
      };
    } catch (err: any) {
      throw new Error(err);
    }
  }

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
    end: number,
  ): Promise<EthStake> {
    const { data } = await api.get<EthStake>(
      `/v1/eth/stakes?account=${accountId}&start=${start}?end=${end}`,
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
    end: number,
  ): Promise<EthStake> {
    const { data } = await api.get<EthStake>(
      `/v1/eth/stakes?wallets=${walletAddress}&start=${start}&end=${end}`,
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
      `/v1/eth/stakes/${validatorAddress}`,
    );
    return data;
  }
}
