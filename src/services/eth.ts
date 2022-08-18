import Web3 from 'web3';
import Common, { Chain } from '@ethereumjs/common';
import { Transaction } from "@ethereumjs/tx";
import api from '../api';
import { InvalidStakeAmount, NotEnoughKeysProvided } from '../errors/eth';
import { ADDRESSES } from '../globals';
import {
  EthereumStakeOptions,
  EthereumTx,
  EthNetworkStats,
  EthStakes,
  InternalBatchDeposit,
  InternalEthereumConfig,
} from '../types/eth';
import {
  BroadcastError,
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
   * @param amount how many tokens to stake in ETH (must be a multiple of 32)
   * @param options it is possible to specify deposit keys
   */
  async craftStakeTx(
    accountId: string,
    walletAddress: string,
    amount: number,
    options?: EthereumStakeOptions,
  ): Promise<EthereumTx> {
    if (amount % 32 !== 0 || amount <= 0) {
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

      // Get keys from options
      if (options?.deposit_data && options?.deposit_data.length > 0) {
        const nbKeysNeeded = Math.floor(amount / 32);
        if (nbKeysNeeded > options.deposit_data.length) {
          throw new NotEnoughKeysProvided(`You must provide ${nbKeysNeeded} keys in order to stake ${amount} ETH. Number of keys provided: ${options.deposit_data.length}`);
        }
        pubkeys = options.deposit_data.map((v) => '0x' + v.pubkey);
        withdrawalsCredentials = options.deposit_data.map((v) => '0x' + v.withdrawalCredentials);
        signatures = options.deposit_data.map((v) => '0x' + v.signature);
        depositDataRoots = options.deposit_data.map((v) => '0x' + v.depositDataRoot);
      } else { // Generate keys from API
        const { data: keys } = await api.post<InternalBatchDeposit>(
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
      const gasPrice = await batchDepositFunction.estimateGas({
        from: walletAddress,
        value: this.web3.utils.toWei(amount.toString(), 'ether'),
      });
      const common = new Common({ chain: this.testnet ? Chain.Goerli : Chain.Mainnet });
      const nonce = await this.web3.eth.getTransactionCount(walletAddress);
      return Transaction.fromTxData({
        nonce: nonce,
        data: data,
        to: this.testnet ? ADDRESSES.eth.testnet.depositContract : ADDRESSES.eth.mainnet.depositContract,
        value: this.web3.utils.numberToHex(this.web3.utils.toWei(amount.toString(), 'ether')),
        gasPrice: this.web3.utils.numberToHex(gasPrice),
        gasLimit: this.web3.utils.numberToHex(100000),
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
    const payload = [
      {
        "content": message,
      },
    ];

    const signatures = await this.fbSigner.signWithFB(payload, this.testnet ? 'ETH_TEST3' : 'ETH', note);
    const common = new Common({ chain: this.testnet ? Chain.Goerli : Chain.Mainnet });
    const chainId = this.testnet ? 5 : 1;
    const sigV: number = signatures.signedMessages?.[0].signature.v ?? 0;
    const v: number = chainId * 2 + (35 + sigV);
    const signedTx = Transaction.fromTxData({
      ...transaction.toJSON(),
      r: `0x${signatures.signedMessages?.[0].signature.r}`,
      s: `0x${signatures.signedMessages?.[0].signature.s}`,
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
   * Retrieve stakes of a Kiln account
   * @param accountId id of the kiln account used to make the stake
   * @returns {EthStakes} Ethereum Stakes
   */
  async getAccountStakes(
    accountId: string,
  ): Promise<EthStakes> {
    const { data } = await api.get<EthStakes>(
      `/v1/eth/stakes`,
      {
        headers: {
          'x-kiln-account': accountId,
        },
      });
    return data;
  }

  /**
   * Retrieve stakes made with a wallet
   * @param walletAddress address of the wallet used to make the stake
   * @returns {EthStakes} Ethereum Stakes
   */
  async getWalletStakes(
    walletAddress: string,
  ): Promise<EthStakes> {
    const { data } = await api.get<EthStakes>(
      `/v1/eth/stakes?wallets=${walletAddress}`,
    );
    return data;
  }

  /**
   * Retrieve stake on a validator
   * @param validatorAddress address of the validator
   * @returns {EthStakes} Ethereum Stakes
   */
  async getValidatorStakes(validatorAddress: string): Promise<EthStakes> {
    const { data } = await api.get<EthStakes>(
      `/v1/eth/stakes?validators=${validatorAddress}`,
    );
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
