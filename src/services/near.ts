import { connect, Near, transactions, utils } from "near-api-js";
import BN from 'bn.js';
import { sha256 } from "js-sha256";
import { Service } from "./service";
import {
  InternalNearConfig,
  NearStakeOptions,
  NearTxStatus,
} from "../types/near";
import { PublicKey } from "near-api-js/lib/utils";
import { SignedTransaction, Transaction } from "near-api-js/lib/transaction";
import {
  CouldNotFindAccessKey,
  CouldNotParseStakeAmount,
} from "../errors/near";
import {
  BroadcastError,
  GetTxStatusError,
  InvalidIntegration,
} from "../errors/integrations";
import { ADDRESSES } from "../globals";
import { FinalExecutionOutcome } from "near-api-js/lib/providers";

export class NearService extends Service {

  constructor({ testnet, integrations }: InternalNearConfig) {
    super({ testnet, integrations });
  }

  private async getConnection(): Promise<Near> {
    const connectionConfig = {
      networkId: this.testnet ? 'testnet' : 'mainnet',
      nodeUrl: `https://rpc.${this.testnet ? 'testnet' : 'mainnet'}.near.org`,
    };
    return await connect(connectionConfig);
  }

  /**
   * Craft near stake transaction
   * @param accountId id of the kiln account to use for the stake transaction
   * @param walletId near wallet id
   * @param amountNear amount in near to stake
   * @param options
   */
  async craftStakeTx(
    accountId: string,
    walletId: string,
    amountNear: number,
    options?: NearStakeOptions,
  ): Promise<Transaction> {

    const stakePoolId = options?.stakePoolId ? options.stakePoolId : this.testnet ? ADDRESSES.near.testnet.poolId : ADDRESSES.near.mainnet.poolId;
    const connection = await this.getConnection();
    const account = await connection.account(walletId);
    const accessKeys = await account.getAccessKeys();
    const fullAccessKey = accessKeys.find(key => key.access_key.permission === 'FullAccess');
    if (!fullAccessKey) {
      throw new CouldNotFindAccessKey('Could not find access key');
    }
    const walletPubKey = PublicKey.from(fullAccessKey.public_key);
    const nonce = fullAccessKey.access_key.nonce + 1;
    const stakeAmountYocto = utils.format.parseNearAmount(amountNear.toString());
    if (!stakeAmountYocto) {
      throw new CouldNotParseStakeAmount('Could not parse stake amount');
    }
    // Max gas fee to use in NEAR (300 Tgas)
    const maxGasAmount = '0.0000000003';
    const parsedGasAmount = utils.format.parseNearAmount(maxGasAmount);
    if (!parsedGasAmount) {
      throw new CouldNotParseStakeAmount('Could not parse gas amount');
    }
    const bnAmount = new BN(stakeAmountYocto);
    const bnMaxGasFees = new BN(parsedGasAmount);
    const actions = [transactions.functionCall('deposit_and_stake', {}, bnMaxGasFees, bnAmount)];
    const accessKey = await connection.connection.provider.query(
      `access_key/${walletId}/${walletPubKey.toString()}`,
      "",
    );
    const blockHash = utils.serialize.base_decode(accessKey.block_hash);
    return transactions.createTransaction(
      walletId,
      walletPubKey,
      stakePoolId,
      nonce,
      actions,
      blockHash,
    );
  }

  /**
   * Craft near unstake transaction, unstaking takes 2-3 epochs (~48 hours) and needs to be done before a staked amount can be withdrawn
   * @param walletId near wallet id
   * @param stakePoolId stake pool id
   * @param amountNear amount in near to unstake
   */
  async craftUnstakeTx(
    walletId: string,
    stakePoolId: string,
    amountNear?: number,
  ): Promise<Transaction> {
    const connection = await this.getConnection();
    const account = await connection.account(walletId);
    const accessKeys = await account.getAccessKeys();
    const fullAccessKey = accessKeys.find(key => key.access_key.permission === 'FullAccess');
    if (!fullAccessKey) {
      throw new CouldNotFindAccessKey('Could not find access key');
    }
    const walletPubKey = PublicKey.from(fullAccessKey.public_key);
    const nonce = fullAccessKey.access_key.nonce + 1;
    let params = {};
    if (amountNear) {
      const amountYocto = utils.format.parseNearAmount(amountNear.toString());
      if (!amountYocto) {
        throw new CouldNotParseStakeAmount('Could not parse stake amount');
      }
      params = {
        amount: amountYocto,
      };
    }
    // Max gas fee to use in NEAR (300 Tgas)
    const maxGasAmount = '0.0000000003';
    const parsedGasAmount = utils.format.parseNearAmount(maxGasAmount);
    if (!parsedGasAmount) {
      throw new CouldNotParseStakeAmount('Could not parse gas amount');
    }
    const bnAmount = new BN('0');
    const bnMaxGasFees = new BN(parsedGasAmount);
    const actions = [transactions.functionCall(amountNear ? 'unstake' : 'unstake_all', params, bnMaxGasFees, bnAmount)];
    const accessKey = await connection.connection.provider.query(
      `access_key/${walletId}/${walletPubKey.toString()}`,
      "",
    );
    const blockHash = utils.serialize.base_decode(accessKey.block_hash);
    return transactions.createTransaction(
      walletId,
      walletPubKey,
      stakePoolId,
      nonce,
      actions,
      blockHash,
    );
  }

  /**
   * Craft near withdraw transaction, withdrawing funds from a pool can only be done after previously unstaking funds
   * @param walletId near wallet id
   * @param stakePoolId stake pool id
   * @param amountNear amount in near to unstake
   */
  async craftWithdrawTx(
    walletId: string,
    stakePoolId: string,
    amountNear?: number,
  ): Promise<Transaction> {
    const connection = await this.getConnection();
    const account = await connection.account(walletId);
    const accessKeys = await account.getAccessKeys();
    const fullAccessKey = accessKeys.find(key => key.access_key.permission === 'FullAccess');
    if (!fullAccessKey) {
      throw new CouldNotFindAccessKey('Could not find access key');
    }
    const walletPubKey = PublicKey.from(fullAccessKey.public_key);
    const nonce = fullAccessKey.access_key.nonce + 1;
    let params = {};
    if (amountNear) {
      const amountYocto = utils.format.parseNearAmount(amountNear.toString());
      if (!amountYocto) {
        throw new CouldNotParseStakeAmount('Could not parse stake amount');
      }
      params = {
        amount: amountYocto,
      };
    }
    // Max gas fee to use in NEAR (300 Tgas)
    const maxGasAmount = '0.0000000003';
    const parsedGasAmount = utils.format.parseNearAmount(maxGasAmount);
    if (!parsedGasAmount) {
      throw new CouldNotParseStakeAmount('Could not parse gas amount');
    }
    const bnAmount = new BN('0');
    const bnMaxGasFees = new BN(parsedGasAmount);
    const actions = [transactions.functionCall(amountNear ? 'withdraw' : 'withdraw_all', params, bnMaxGasFees, bnAmount)];
    const accessKey = await connection.connection.provider.query(
      `access_key/${walletId}/${walletPubKey.toString()}`,
      "",
    );
    const blockHash = utils.serialize.base_decode(accessKey.block_hash);
    return transactions.createTransaction(
      walletId,
      walletPubKey,
      stakePoolId,
      nonce,
      actions,
      blockHash,
    );
  }

  /**
   * Sign transaction with given integration
   * @param integration
   * @param transaction
   * @param note
   */
  async sign(integration: string, transaction: Transaction, note?: string): Promise<SignedTransaction> {
    if (!this.integrations?.find(int => int.name === integration)) {
      throw new InvalidIntegration(`Unknown integration, please provide an integration name that matches one of the integrations provided in the config.`);
    }

    if (!this.fbSigner) {
      throw new InvalidIntegration(`Could not retrieve fireblocks signer.`);
    }

    const serializedTx = utils.serialize.serialize(
      transactions.SCHEMA,
      transaction,
    );
    const serializedTxArray = new Uint8Array(sha256.array(serializedTx));
    const serializedTxHash = Buffer.from(serializedTxArray).toString('hex');
    const payload = {
      rawMessageData: {
        messages: [
          {
            "content": serializedTxHash,
          },
        ],
      },
    };

    const signatures = await this.fbSigner.signWithFB(payload, this.testnet ? 'NEAR_TEST' : 'NEAR', note);
    const signature = signatures.signedMessages![0];

    return new transactions.SignedTransaction({
      transaction,
      signature: new transactions.Signature({
        keyType: transaction.publicKey.keyType,
        data: Uint8Array.from(Buffer.from(signature.signature.fullSig, 'hex')),
      }),
    });
  }

  /**
   * Broadcast a signed near transaction to the network
   * @param transaction
   */
  async broadcast(transaction: SignedTransaction): Promise<string | undefined> {
    try {
      const connection = await this.getConnection();
      const res = await connection.connection.provider.sendTransaction(transaction);
      return res.transaction.hash;
    } catch (e: any) {
      throw new BroadcastError(e);
    }
  }

  /**
   * Get transaction status
   * @param transactionHash: transaction hash
   */
  async getTxStatus(transactionHash: string): Promise<NearTxStatus> {
    try {
      const connection = await this.getConnection();
      const receipt = await connection.connection.provider.txStatusReceipts(transactionHash, this.testnet ? ADDRESSES.near.testnet.poolId : ADDRESSES.near.mainnet.poolId);
      const status = Object.keys(receipt.status).includes('SuccessValue') ? 'success' : 'error';
      return {
        status: status,
        txReceipt: receipt,
      };
    } catch (e: any) {
      throw new GetTxStatusError(e);
    }
  }
}
