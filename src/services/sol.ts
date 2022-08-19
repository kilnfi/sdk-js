import {
  Authorized,
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmRawTransaction,
  StakeProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import api from '../api';
import { InvalidStakeAmount } from '../errors/sol';
import { ADDRESSES } from '../globals';
import {
  InternalSolanaConfig,
  SolanaTx,
  SolNetworkStats,
  SolStakes,
} from '../types/sol';
import {
  BroadcastError,
  InvalidIntegration,
  InvalidSignature,
} from "../errors/integrations";
import { Service } from "./service";

const LAMPORTS_TO_SOL = 1000000000;

export class SolService extends Service {
  private rpc: string | undefined;

  constructor({ testnet, integrations, rpc }: InternalSolanaConfig) {
    super({ testnet, integrations });
    this.rpc = rpc;
  }

  private async getConnection(): Promise<Connection> {
    let connection;

    if (this.testnet) {
      connection = new Connection(this.rpc ?? clusterApiUrl('devnet'));
    } else {
      connection = new Connection(this.rpc ?? clusterApiUrl('mainnet-beta'));
    }
    return connection;
  }

  /**
   * Craft Solana staking transaction
   * @param accountId id of the kiln account to use for the stake transaction
   * @param walletAddress used to create the stake account and retrieve rewards in the future
   * @param amount how many tokens to stake in SOL (must be at least 0.01 SOL)
   */
  async craftStakeTx(
    accountId: string,
    walletAddress: string,
    amount: number,
  ): Promise<SolanaTx> {
    if (amount < 0.01) {
      throw new InvalidStakeAmount('Solana stake must be at least 0.01 SOL');
    }

    const tx = new Transaction();
    const staker = new PublicKey(walletAddress);
    const stakeKey = new Keypair();

    const instructions = [
      // memo the transaction with account id
      new TransactionInstruction({
        keys: [
          {
            pubkey: staker,
            isSigner: true,
            isWritable: true,
          },
        ],
        programId: new PublicKey('Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo'),
        data: Buffer.from(accountId),
      }),
      StakeProgram.createAccount({
        fromPubkey: staker,
        authorized: new Authorized(staker, staker),
        lamports: amount * LAMPORTS_TO_SOL,
        stakePubkey: stakeKey.publicKey,
      }),
      StakeProgram.delegate({
        stakePubkey: stakeKey.publicKey,
        authorizedPubkey: staker,
        votePubkey: new PublicKey(this.testnet ?
          ADDRESSES.sol.devnet.voteAccountAddress :
          ADDRESSES.sol.mainnet.voteAccountAddress,
        ),
      }),
    ];
    tx.add(...instructions);


    const connection = await this.getConnection();
    let blockhash = await connection.getLatestBlockhash('finalized');
    tx.recentBlockhash = blockhash.blockhash;
    tx.feePayer = staker;
    tx.partialSign(stakeKey);

    return tx;
  }

  /**
   * Craft Solana desactivate stake account transaction
   * @param stakeAccountAddress stake account address to deactivate
   * @param walletAddress wallet that has authority over the stake account
   */
  async craftDeactivateStakeTx(
    stakeAccountAddress: string,
    walletAddress: string,
  ): Promise<SolanaTx> {

    const tx = new Transaction();
    const stakeAccountPubKey = new PublicKey(stakeAccountAddress);
    const walletPubKey = new PublicKey(walletAddress);

    const instructions = [
      StakeProgram.deactivate({
        stakePubkey: stakeAccountPubKey,
        authorizedPubkey: walletPubKey,
      }),
    ];
    tx.add(...instructions);


    const connection = await this.getConnection();
    let blockhash = await connection.getLatestBlockhash('finalized');
    tx.recentBlockhash = blockhash.blockhash;
    tx.feePayer = walletPubKey;
    return tx;
  }

  /**
   * Craft Solana withdraw staked balance transaction
   * @param stakeAccountAddress stake account address to deactivate
   * @param walletAddress wallet that has authority over the stake account
   * @param amountToWithdraw: amount to withdraw, if not specified the whole balance will be withdrawn
   */
  async craftWithdrawStakedBalanceTx(
    stakeAccountAddress: string,
    walletAddress: string,
    amountToWithdraw?: number,
  ): Promise<SolanaTx> {
    const stakeAccountPubKey = new PublicKey(stakeAccountAddress);
    const walletPubKey = new PublicKey(walletAddress);
    let amount;
    const connection = await this.getConnection();

    if (!amountToWithdraw) {
      amount = await connection.getBalance(stakeAccountPubKey);
    } else {
      amount = amountToWithdraw * LAMPORTS_TO_SOL;
    }

    const tx = new Transaction();

    const instructions = [
      StakeProgram.withdraw({
        stakePubkey: stakeAccountPubKey,
        authorizedPubkey: walletPubKey,
        toPubkey: walletPubKey,
        lamports: amount,
      }),
    ];
    tx.add(...instructions);


    let blockhash = await connection.getLatestBlockhash('finalized');
    tx.recentBlockhash = blockhash.blockhash;
    tx.feePayer = walletPubKey;
    return tx;
  }

  /**
   * Craft merge stake accounts transaction
   * @param stakeAccountSourceAddress source stake account to merge into the destination stake account
   * @param stakeAccountDestinationAddress stake account to merge the source stake account into
   * @param walletAddress that has authority over the 2 stake accounts to merge
   */
  async craftMergeStakeAccountsTx(
    stakeAccountSourceAddress: string,
    stakeAccountDestinationAddress: string,
    walletAddress: string,
  ): Promise<SolanaTx> {
    const tx = new Transaction();
    const stakerPubKey = new PublicKey(walletAddress);
    const sourcePubKey = new PublicKey(stakeAccountSourceAddress);
    const destinationPubKey = new PublicKey(stakeAccountDestinationAddress);

    const instructions = [
      StakeProgram.merge({
        stakePubkey: destinationPubKey,
        sourceStakePubKey: sourcePubKey,
        authorizedPubkey: stakerPubKey,
      }),
    ];
    tx.add(...instructions);

    const connection = await this.getConnection();
    let blockhash = await connection.getLatestBlockhash('finalized');
    tx.recentBlockhash = blockhash.blockhash;
    tx.feePayer = stakerPubKey;

    return tx;
  }

  /**
   * Sign transaction with given integration
   * @param integration
   * @param transaction
   * @param note
   */
  async sign(integration: string, transaction: SolanaTx, note?: string): Promise<SolanaTx> {
    if (!this.integrations?.find(int => int.name === integration)) {
      throw new InvalidIntegration(`Unknown integration, please provide an integration name that matches one of the integrations provided in the config.`);
    }

    if (!this.fbSigner) {
      throw new InvalidIntegration(`Could not retrieve fireblocks signer.`);
    }

    let transactionBuffer = transaction.serializeMessage();
    const message = transactionBuffer.toString('hex');
    const payload = [
      {
        "content": message,
      },
    ];

    const signatures = await this.fbSigner.signWithFB(payload, this.testnet ? 'SOL_TEST' : 'SOL', note);
    signatures.signedMessages?.forEach((signedMessage: any) => {
      console.log(signedMessage);
      if (signedMessage.derivationPath[3] == 0 && transaction.feePayer) {
        transaction.addSignature(transaction.feePayer, Buffer.from(signedMessage.signature.fullSig, "hex"));
      }
    });

    if (transaction.verifySignatures()) {
      return transaction;
    } else {
      throw new InvalidSignature(`The transaction signatures could not be verified.`);
    }

  }


  /**
   * Broadcast transaction to the network
   * @param transaction
   */
  async broadcast(transaction: SolanaTx): Promise<string | undefined> {
    try {
      const connection = await this.getConnection();
      return await sendAndConfirmRawTransaction(connection, transaction.serialize());
    } catch (e: any) {
      throw new BroadcastError(e);
    }
  }

  /**
   * Retrieve stakes on a stake account
   * @param stakeAccountAddress address of the stakeaccount used to make the stake
   * @returns {SolStakes} solana Stakes
   */
  async getStakeAccountStakes(
    stakeAccountAddress: string,
  ): Promise<SolStakes> {
    const { data } = await api.get<SolStakes>(
      `/v1/sol/stakes?stakeaccounts=${stakeAccountAddress}`,
    );
    return data;
  }

  /**
   * Retrieve SOL network stats
   */
  async getNetworkStats(): Promise<SolNetworkStats> {
    const { data } = await api.get<SolNetworkStats>(
      `/v1/sol/network-stats`,
    );
    return data;
  }
}
