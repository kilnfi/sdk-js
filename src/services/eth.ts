import Web3 from 'web3';
import Common, { Chain } from '@ethereumjs/common';
import { Transaction } from "@ethereumjs/tx";
import api from '../api';
import { InvalidStakeAmount, NotEnoughKeysProvided } from '../errors/eth';
import { ADDRESSES } from '../globals';
import {
  EthereumStakeOptions,
  EthereumTx,
  EthNetworkStats, EthRewards,
  EthStakes, EthTxStatus,
  InternalEthereumConfig,
  ValidationKeyDepositData,
} from '../types/eth';
import {
  BroadcastError, GetTxStatusError,
  InvalidIntegration,
  InvalidSignature,
} from "../errors/integrations";
import { Service } from "./service";

export class EthService extends Service {
  private web3: Web3;

  constructor({ testnet, integrations, rpc }: InternalEthereumConfig) {
    super({ testnet, integrations });
    const kilnRpc = testnet === true ? 'https://goerli.infura.io/v3/7c4e6c4152334af0b465e04fba62c5ec' : 'https://mainnet.infura.io/v3/7c4e6c4152334af0b465e04fba62c5ec';
    this.web3 = new Web3(new Web3.providers.HttpProvider(rpc ? rpc : kilnRpc));
  }

  /**
   * Spin Up Ethereum validators and craft staking transaction
   * @param accountId id of the kiln account to use for the stake transaction
   * @param walletAddress withdrawal creds /!\ losing it => losing the ability to withdraw
   * @param amountEth how many tokens to stake in ETH (must be a multiple of 32)
   * @param options it is possible to specify deposit keys
   */
  async craftStakeTx(
    accountId: string,
    walletAddress: string,
    amountEth: number,
    options?: EthereumStakeOptions,
  ): Promise<EthereumTx> {
    if (amountEth % 32 !== 0 || amountEth <= 0) {
      throw new InvalidStakeAmount(
        'Ethereum stake must be a multiple of 32 ETH',
      );
    }

    try {
      // Construct batch deposit parameters
      let pubkeys: string[] = [];
      let withdrawalsCredentials: string[] = [];
      let signatures: string[] = [];
      let depositDataRoots: string[] = [];
      const nbKeysNeeded = Math.floor(amountEth / 32);

      // Get keys from options
      if (options?.deposit_data && options?.deposit_data.length > 0) {
        if (nbKeysNeeded > options.deposit_data.length) {
          throw new NotEnoughKeysProvided(`You must provide ${nbKeysNeeded} keys in order to stake ${amountEth} ETH. Number of keys provided: ${options.deposit_data.length}`);
        }
        pubkeys = options.deposit_data.map((v) => '0x' + v.pubkey);
        withdrawalsCredentials = options.deposit_data.map((v) => '0x' + v.withdrawalCredentials);
        signatures = options.deposit_data.map((v) => '0x' + v.signature);
        depositDataRoots = options.deposit_data.map((v) => '0x' + v.depositDataRoot);
      } else { // Generate keys from API
        const { data: keys } = await api.post<ValidationKeyDepositData>(
          '/v1/eth/keys',
          {
            withdrawal_address: walletAddress,
            number: nbKeysNeeded,
            format: 'batch_deposit',
            account_id: accountId,
          },
        );

        pubkeys = keys.data.pubkeys.map((v) => '0x' + v);
        withdrawalsCredentials = keys.data.withdrawal_credentials.map((v) => '0x' + v);
        signatures = keys.data.signatures.map((v) => '0x' + v);
        depositDataRoots = keys.data.deposit_data_roots.map((v) => '0x' + v);
      }

      const batchDepositContract = new this.web3.eth.Contract(
        JSON.parse(ADDRESSES.eth.abi),
        this.testnet ? ADDRESSES.eth.testnet.depositContract : ADDRESSES.eth.mainnet.depositContract,
      );

      const batchDepositFunction = batchDepositContract.methods
        .batchDeposit(
          pubkeys,
          withdrawalsCredentials,
          signatures,
          depositDataRoots,
        );

      const data = batchDepositFunction.encodeABI();
      const gasWei = 100000 + nbKeysNeeded * 80000;
      const common = new Common({ chain: this.testnet ? Chain.Goerli : Chain.Mainnet });
      const nonce = await this.web3.eth.getTransactionCount(walletAddress);
      return Transaction.fromTxData({
        nonce: nonce,
        data: data,
        to: walletAddress,
        value: this.web3.utils.numberToHex(0),
        gasPrice: this.web3.utils.numberToHex(gasWei),
        gasLimit: this.web3.utils.numberToHex(gasWei),
      }, { common });
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Sign transaction with given integration
   * @param integration
   * @param transaction
   * @param note
   */
  async sign(integration: string, transaction: EthereumTx, note?: string): Promise<EthereumTx> {
    if (!this.integrations?.find(int => int.name === integration)) {
      throw new InvalidIntegration(`Unknown integration, please provide an integration name that matches one of the integrations provided in the config.`);
    }

    if (!this.fbSigner) {
      throw new InvalidIntegration(`Could not retrieve fireblocks signer.`);
    }

    const message = transaction.getMessageToSign(true).toString('hex');
    const payload = {
      rawMessageData: {
        messages: [
          {
            "content": message,
          },
        ]
      }
    };

    const signatures = await this.fbSigner.signWithFB(payload, this.testnet ? 'ETH_TEST3' : 'ETH', note);
    const common = new Common({ chain: this.testnet ? Chain.Goerli : Chain.Mainnet });
    const chainId = this.testnet ? 5 : 1;
    const sigV: number = signatures?.signedMessages?.[0].signature.v ?? 0;
    const v: number = chainId * 2 + (35 + sigV);
    const signedTx = Transaction.fromTxData({
      ...transaction.toJSON(),
      r: `0x${signatures?.signedMessages?.[0].signature.r}`,
      s: `0x${signatures?.signedMessages?.[0].signature.s}`,
      v: v,
    }, { common });

    if (signedTx.verifySignature()) {
      return signedTx;
    } else {
      throw new InvalidSignature(`The transaction signatures could not be verified.`);
    }
  }


  /**
   * Broadcast transaction to the network
   * @param transaction
   */
  async broadcast(transaction: EthereumTx): Promise<string | undefined> {
    try {
      const serializedTx = transaction.serialize();
      const receipt = await this.web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'));
      return receipt.transactionHash;
    } catch (e: any) {
      throw new BroadcastError(e);
    }
  }

  /**
   * Get transaction status
   * @param transactionHash: transaction hash
   */
  async getTxStatus(transactionHash: string): Promise<EthTxStatus> {
    try {
      const receipt = await this.web3.eth.getTransactionReceipt(transactionHash);
      const status = receipt ? receipt.status ? 'success' : 'error' : 'pending_confirmation';
      return {
        status: status,
        txReceipt: receipt,
      };
    } catch (e: any) {
      throw new GetTxStatusError(e);
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
    const { data } = await api.get<EthStakes>(
      `/v1/eth/stakes?accounts=${accountIds.join(',')}`);
    return data;
  }

  /**
   * Retrieve stakes of given wallets
   * @param walletAddresses addresses of the wallets of which you wish to retrieve rewards
   * @returns {EthStakes} Ethereum Stakes
   */
  async getStakesByWallets(
    walletAddresses: string[],
  ): Promise<EthStakes> {
    const { data } = await api.get<EthStakes>(
      `/v1/eth/stakes?wallets=${walletAddresses.join(',')}`,
    );
    return data;
  }

  /**
   * Retrieve stake on given validator addresses
   * @param validatorAddresses validator addresses of which you wish to retrieve rewards
   * @returns {EthStakes} Ethereum Stakes
   */
  async getStakesByValidators(validatorAddresses: string[]): Promise<EthStakes> {
    const { data } = await api.get<EthStakes>(
      `/v1/eth/stakes?validators=${validatorAddresses.join(',')}`,
    );
    return data;
  }

  /**
   * Retrieve rewards of given kiln accounts
   * @param accountIds: account ids of which you wish to retrieve rewards
   * @param startDay: optional date YYYY-MM-DD from which you wish to retrieve rewards
   * @param endDay: optional date YYYY-MM-DD until you wish to retrieve rewards
   * @returns {EthRewards} Ethereum rewards
   */
  async getRewardsByAccounts(
    accountIds: string[],
    startDay?: string,
    endDay?: string,
  ): Promise<EthRewards> {
    const query = `/v1/eth/rewards?accounts=${accountIds.join(',')}${
      startDay ? `&start_day=${startDay}` : ''
    }${endDay ? `&end_day=${endDay}` : ''}`;
    const { data } = await api.get<EthRewards>(query);
    return data;
  }

  /**
   * Retrieve stakes of given wallets
   * @param walletAddresses addresses of the wallets of which you wish to retrieve rewards
   * @param startDay: optional date YYYY-MM-DD from which you wish to retrieve rewards
   * @param endDay: optional date YYYY-MM-DD until you wish to retrieve rewards
   * @returns {EthRewards} Ethereum rewards
   */
  async getRewardsByWallets(
    walletAddresses: string[],
    startDay?: string,
    endDay?: string,
  ): Promise<EthRewards> {
    const query = `/v1/eth/rewards?wallets=${walletAddresses.join(',')}${
      startDay ? `&start_day=${startDay}` : ''
    }${endDay ? `&end_day=${endDay}` : ''}`;
    const { data } = await api.get<EthRewards>(query);
    return data;
  }

  /**
   * Retrieve stake on given validator addresses
   * @param validatorAddresses validator addresses of which you wish to retrieve rewards
   * @param startDay: optional date YYYY-MM-DD from which you wish to retrieve rewards
   * @param endDay: optional date YYYY-MM-DD until you wish to retrieve rewards
   * @returns {EthRewards} Ethereum rewards
   */
  async getRewardsByValidators(
    validatorAddresses: string[],
    startDay?: string,
    endDay?: string,
  ): Promise<EthRewards> {
    const query = `/v1/eth/rewards?validators=${validatorAddresses.join(',')}${
      startDay ? `&start_day=${startDay}` : ''
    }${endDay ? `&end_day=${endDay}` : ''}`;
    const { data } = await api.get<EthRewards>(query);
    return data;
  }

  /**
   * Retrieve ETH network stats
   */
  async getNetworkStats(): Promise<EthNetworkStats> {
    const { data } = await api.get<EthNetworkStats>(
      `/v1/eth/network-stats`,
    );
    return data;
  }
}
