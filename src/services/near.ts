import { connect, Near, transactions, utils } from 'near-api-js';
import BN from 'bn.js';
import { sha256 } from 'js-sha256';
import { Service } from './service';
import {
  NearNetworkStats,
  NearRewards,
  NearSignedTx,
  NearStakes,
  NearTx,
  NearTxHash,
  NearTxStatus,
} from '../types/near';
import { PublicKey } from 'near-api-js/lib/utils';
import { ServiceProps } from '../types/service';
import { Integration } from '../types/integrations';
import api from '../api';

export class NearService extends Service {

  constructor({ testnet }: ServiceProps) {
    super({ testnet });
  }

  private async getConnection(): Promise<Near> {
    const officialRpc = `https://rpc.${this.testnet ? 'testnet' : 'mainnet'}.near.org`;
    const connectionConfig = {
      networkId: this.testnet ? 'testnet' : 'mainnet',
      nodeUrl: officialRpc,
    };
    return await connect(connectionConfig);
  }

  /**
   * Convert NEAR to YOCTO
   * @param amountNear
   */
  nearToYocto(amountNear: string): string {
    return utils.format.parseNearAmount(amountNear) ?? '0';
  }

  /**
   * Craft near stake transaction
   * @param accountId id of the kiln account to use for the stake transaction
   * @param walletId near wallet id
   * @param stakePoolId stake pool id
   * @param amountNear amount to stake in NEAR
   */
  async craftStakeTx(
    accountId: string,
    walletId: string,
    stakePoolId: string,
    amountNear: number,
  ): Promise<NearTx> {

    const connection = await this.getConnection();
    const account = await connection.account(walletId);
    const accessKeys = await account.getAccessKeys();
    const fullAccessKey = accessKeys.find(key => key.access_key.permission === 'FullAccess');
    if (!fullAccessKey) {
      throw new Error('Could not find access key');
    }
    const walletPubKey = PublicKey.from(fullAccessKey.public_key);
    const nonce = new BN(1).add(fullAccessKey.access_key.nonce);

    // Max gas fee to use in NEAR (300 Tgas)
    const maxGasAmount = '0.0000000003';
    const parsedGasAmount = utils.format.parseNearAmount(maxGasAmount);
    if (!parsedGasAmount) {
      throw new Error('Could not parse gas amount');
    }
    const bnAmount = new BN(this.nearToYocto(amountNear.toString()));
    const bnMaxGasFees = new BN(parsedGasAmount);
    const actions = [transactions.functionCall('deposit_and_stake', {}, bnMaxGasFees, bnAmount)];
    const accessKey = await connection.connection.provider.query(
      `access_key/${walletId}/${walletPubKey.toString()}`,
      '',
    );
    const blockHash = utils.serialize.base_decode(accessKey.block_hash);
    const tx = transactions.createTransaction(
      walletId,
      walletPubKey,
      stakePoolId,
      nonce,
      actions,
      blockHash,
    );

    // tag near stake
    const stake = {
      stakeAccount: `${stakePoolId}_${walletId}`,
      account: walletId,
    };
    await api.post(`/v1/near/stakes`, {
      account_id: accountId,
      stakes: [stake],
    });

    return {
      data: {
        tx,
      },
    };
  }

  /**
   * Craft near unstake transaction, unstaking takes 2-3 epochs (~48 hours) and needs to be done before a staked amount can be withdrawn
   * @param walletId near wallet id
   * @param stakePoolId stake pool id
   * @param amountNear amount to unstake in NEAR
   */
  async craftUnstakeTx(
    walletId: string,
    stakePoolId: string,
    amountNear?: number,
  ): Promise<NearTx> {
    const connection = await this.getConnection();
    const account = await connection.account(walletId);
    const accessKeys = await account.getAccessKeys();
    const fullAccessKey = accessKeys.find(key => key.access_key.permission === 'FullAccess');
    if (!fullAccessKey) {
      throw new Error('Could not find access key');
    }
    const walletPubKey = PublicKey.from(fullAccessKey.public_key);
    const nonce = new BN(1).add(fullAccessKey.access_key.nonce);
    let params = {};
    if (amountNear) {
      params = {
        amount: this.nearToYocto(amountNear.toString()),
      };
    }
    // Max gas fee to use in NEAR (300 Tgas)
    const maxGasAmount = '0.0000000003';
    const parsedGasAmount = utils.format.parseNearAmount(maxGasAmount);
    if (!parsedGasAmount) {
      throw new Error('Could not parse gas amount');
    }
    const bnAmount = new BN('0');
    const bnMaxGasFees = new BN(parsedGasAmount);
    const actions = [transactions.functionCall(amountNear ? 'unstake' : 'unstake_all', params, bnMaxGasFees, bnAmount)];
    const accessKey = await connection.connection.provider.query(
      `access_key/${walletId}/${walletPubKey.toString()}`,
      '',
    );
    const blockHash = utils.serialize.base_decode(accessKey.block_hash);
    const tx = transactions.createTransaction(
      walletId,
      walletPubKey,
      stakePoolId,
      nonce,
      actions,
      blockHash,
    );

    return {
      data: {
        tx,
      },
    };
  }

  /**
   * Craft near withdraw transaction, withdrawing funds from a pool can only be done after previously unstaking funds
   * @param walletId near wallet id
   * @param stakePoolId stake pool id
   * @param amountNear amount to withdraw in NEAR
   */
  async craftWithdrawTx(
    walletId: string,
    stakePoolId: string,
    amountNear?: number,
  ): Promise<NearTx> {
    const connection = await this.getConnection();
    const account = await connection.account(walletId);
    const accessKeys = await account.getAccessKeys();
    const fullAccessKey = accessKeys.find(key => key.access_key.permission === 'FullAccess');
    if (!fullAccessKey) {
      throw new Error('Could not find access key');
    }
    const walletPubKey = PublicKey.from(fullAccessKey.public_key);
    const nonce = new BN(1).add(fullAccessKey.access_key.nonce);
    let params = {};
    if (amountNear) {
      params = {
        amount: this.nearToYocto(amountNear.toString()),
      };
    }
    // Max gas fee to use in NEAR (300 Tgas)
    const maxGasAmount = '0.0000000003';
    const parsedGasAmount = utils.format.parseNearAmount(maxGasAmount);
    if (!parsedGasAmount) {
      throw new Error('Could not parse gas amount');
    }
    const bnAmount = new BN('0');
    const bnMaxGasFees = new BN(parsedGasAmount);
    const actions = [transactions.functionCall(amountNear ? 'withdraw' : 'withdraw_all', params, bnMaxGasFees, bnAmount)];
    const accessKey = await connection.connection.provider.query(
      `access_key/${walletId}/${walletPubKey.toString()}`,
      '',
    );
    const blockHash = utils.serialize.base_decode(accessKey.block_hash);
    const tx = transactions.createTransaction(
      walletId,
      walletPubKey,
      stakePoolId,
      nonce,
      actions,
      blockHash,
    );

    return {
      data: {
        tx,
      },
    };
  }

  /**
   * Sign transaction with given integration
   * @param integration custody solution to sign with
   * @param tx raw transaction
   * @param note note to identify the transaction in your custody solution
   */
  async sign(integration: Integration, tx: NearTx, note?: string): Promise<NearSignedTx> {
    const serializedTx = utils.serialize.serialize(
      transactions.SCHEMA,
      tx.data.tx,
    );
    const serializedTxArray = new Uint8Array(sha256.array(serializedTx));
    const serializedTxHash = Buffer.from(serializedTxArray).toString('hex');
    const payload = {
      rawMessageData: {
        messages: [
          {
            'content': serializedTxHash,
          },
        ],
      },
    };

    const fbSigner = this.getFbSigner(integration);
    const fbNote = note ? note : 'NEAR tx from @kilnfi/sdk';
    const fbTx = await fbSigner.signWithFB(payload, this.testnet ? 'NEAR_TEST' : 'NEAR', fbNote);
    const signature = fbTx.signedMessages![0];

    const signedTx = new transactions.SignedTransaction({
      transaction: tx.data.tx,
      signature: new transactions.Signature({
        keyType: tx.data.tx.publicKey.keyType,
        data: Uint8Array.from(Buffer.from(signature.signature.fullSig, 'hex')),
      }),
    });

    return {
      data: {
        fireblocks_tx: fbTx,
        tx: signedTx,
      },
    };
  }

  /**
   * Broadcast a signed near transaction to the network
   * @param signedTx
   */
  async broadcast(signedTx: NearSignedTx): Promise<NearTxHash> {
    try {
      const connection = await this.getConnection();
      const res = await connection.connection.provider.sendTransaction(signedTx.data.tx);
      return {
        data: {
          tx_hash: res.transaction.hash,
        },
      };
    } catch (e: any) {
      throw new Error(e);
    }
  }

  /**
   * Get transaction status
   * @param transactionHash transaction hash
   * @param poolId pool id
   */
  async getTxStatus(transactionHash: string, poolId: string): Promise<NearTxStatus> {
    try {
      const connection = await this.getConnection();
      const receipt = await connection.connection.provider.txStatusReceipts(transactionHash, poolId);
      const status = Object.keys(receipt.status).includes('SuccessValue') ? 'success' : 'error';
      return {
        data: {
          status: status,
          receipt: receipt,
        },
      };
    } catch (e: any) {
      throw new Error(e);
    }
  }

  /**
   * Decode transaction
   * @param txSerialized transaction serialized
   */
  async decodeTx(txSerialized: string): Promise<transactions.Transaction> {
    try {
      const { data } = await api.get<transactions.Transaction>(
        `/v1/near/transaction/decode?tx_serialized=${txSerialized}`);
      return data;
    } catch (error: any) {
      throw new Error(error);
    }
  }

  /**
   * Retrieve stakes of given kiln accounts
   * @param accountIds kiln account ids of which you wish to retrieve stakes
   * @returns {NearStakes} Near Stakes
   */
  async getStakesByAccounts(
    accountIds: string[],
  ): Promise<NearStakes> {
    try {
      const { data } = await api.get<NearStakes>(
        `/v1/near/stakes?accounts=${accountIds.join(',')}`);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Retrieve stakes of given stake accounts
   * @param stakeAccounts list of stake accounts {poolId_walletId}
   * @returns {NearStakes} Near Stakes
   */
  async getStakesByStakeAccounts(
    stakeAccounts: string[],
  ): Promise<NearStakes> {
    try {
      const { data } = await api.get<NearStakes>(
        `/v1/near/stakes?stake_accounts=${stakeAccounts.join(',')}`);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Retrieve stakes of given wallets
   * @param wallets wallet addresses of which you wish to retrieve stakes
   * @returns {NearStakes} Near Stakes
   */
  async getStakesByWallets(
    wallets: string[],
  ): Promise<NearStakes> {
    try {
      const { data } = await api.get<NearStakes>(
        `/v1/near/stakes?wallets=${wallets.join(',')}`);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Retrieve rewards history of given kiln accounts
   * @param accountIds kiln account ids of which you wish to retrieve rewards
   * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
   * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
   * @returns {NearStakes} Near Stakes
   */
  async getRewardsByAccounts(
    accountIds: string[],
    startDate?: string,
    endDate?: string,
  ): Promise<NearRewards> {
    try {
      const { data } = await api.get<NearRewards>(
        `/v1/near/rewards?accounts=${accountIds.join(',')}${
          startDate ? `&start_date=${startDate}` : ''
        }${endDate ? `&end_date=${endDate}` : ''}`);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Retrieve rewards history of given stake accounts
   * @param stakeAccounts list of stake accounts {poolId_walletId}
   * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
   * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
   * @returns {NearRewards} Near Rewards
   */
  async getRewardsByStakeAccounts(
    stakeAccounts: string[],
    startDate?: string,
    endDate?: string,
  ): Promise<NearRewards> {
    try {
      const { data } = await api.get<NearRewards>(
        `/v1/near/rewards?stake_accounts=${stakeAccounts.join(',')}${
          startDate ? `&start_date=${startDate}` : ''
        }${endDate ? `&end_date=${endDate}` : ''}`);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Retrieve rewards history of given wallets
   * @param wallets wallet addresses of which you wish to retrieve rewards
   * @param startDate optional date YYYY-MM-DD from which you wish to retrieve rewards
   * @param endDate optional date YYYY-MM-DD until you wish to retrieve rewards
   * @returns {NearRewards} Near Rewards
   */
  async getRewardsByWallets(
    wallets: string[],
    startDate?: string,
    endDate?: string,
  ): Promise<NearRewards> {
    try {
      const { data } = await api.get<NearRewards>(
        `/v1/near/rewards?wallets=${wallets.join(',')}${
          startDate ? `&start_date=${startDate}` : ''
        }${endDate ? `&end_date=${endDate}` : ''}`);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Retrieve NEAR network stats
   */
  async getNetworkStats(): Promise<NearNetworkStats> {
    try {
      const { data } = await api.get<NearNetworkStats>(
        `/v1/near/network-stats`,
      );
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }
}
