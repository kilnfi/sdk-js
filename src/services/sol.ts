import {
  Authorized,
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmRawTransaction,
  StakeProgram,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import api from '../api';
import { InvalidStakeAmount } from '../errors/sol';
import { ADDRESSES } from '../globals';
import {
  ApiCreatedStakes,
  InternalSolanaConfig,
  PublicNonceAccountInfo,
  PublicSignature,
  SolanaStakeOptions,
  SolanaTx,
  SolanaTxStatus,
  SolNetworkStats,
  SolRewards,
  SolStakes,
  TaggedStake,
} from '../types/sol';
import { BroadcastError, GetTxStatusError, InvalidIntegration, InvalidSignature, } from "../errors/integrations";
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
     * Get Kiln nonce account info
     * @private
     */
    private async getNonceAccount(): Promise<PublicNonceAccountInfo> {
      const { data } = await api.get<PublicNonceAccountInfo>('/v1/sol/nonce-account');
      return data;
    };

    /**
     * Partially sign a hex encoded message with kiln nonce account
     * @param message
     * @private
     */
    private async partialSignWithNonceAccount(message: string): Promise<PublicSignature[]> {
      const { data } = await api.post<PublicSignature[]>('/v1/sol/nonce-account/partial-sign', {
        message,
      });
      return data;
    };

    /**
     * Craft Solana staking transaction
     * @param accountId id of the kiln account to use for the stake transaction
     * @param walletAddress used to create the stake account and retrieve rewards in the future
     * @param amountSol how many tokens to stake in SOL (must be at least 0.01 SOL)
     * @param options
     */
    async craftStakeTx(
      accountId: string,
      walletAddress: string,
      amountSol: number,
      options?: SolanaStakeOptions,
    ): Promise<SolanaTx> {
      if (amountSol < 0.01) {
        throw new InvalidStakeAmount('Solana stake must be at least 0.01 SOL');
      }

      const tx = new Transaction();
      const staker = new PublicKey(walletAddress);
      const stakeKey = new Keypair();
      const votePubKey = new PublicKey(
        options?.voteAccountAddress ? options.voteAccountAddress :
          this.testnet ?
            ADDRESSES.sol.devnet.voteAccountAddress :
            ADDRESSES.sol.mainnet.voteAccountAddress,
      );
      const memoProgram = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

      // Get nonce account info
      const nonceInfo = await this.getNonceAccount();
      const nonceAccountPubKey = new PublicKey(nonceInfo.nonce_account);
      const connection = await this.getConnection();
      const nonceAccount = await connection.getNonce(nonceAccountPubKey);
      if (!nonceAccount) {
        throw new Error('Could not fetch nonce account');
      }

      const instructions = [
        SystemProgram.nonceAdvance({
          noncePubkey: nonceAccountPubKey,
          authorizedPubkey: nonceAccount.authorizedPubkey,
        }),
        new TransactionInstruction({
          keys: [
            {
              pubkey: staker,
              isSigner: true,
              isWritable: true,
            },
          ],
          programId: new PublicKey(memoProgram),
          data: Buffer.from(Buffer.from(accountId).toString('base64')),
        }),
        StakeProgram.createAccount({
          fromPubkey: staker,
          authorized: new Authorized(staker, staker),
          lamports: amountSol * LAMPORTS_TO_SOL,
          stakePubkey: stakeKey.publicKey,
        }),
        StakeProgram.delegate({
          stakePubkey: stakeKey.publicKey,
          authorizedPubkey: staker,
          votePubkey: votePubKey,
        }),
      ];
      tx.add(...instructions);

      if (options?.memo) {
        tx.add(
          // custom memo
          new TransactionInstruction({
            keys: [
              {
                pubkey: staker,
                isSigner: true,
                isWritable: true,
              },
            ],
            programId: new PublicKey(memoProgram),
            data: Buffer.from(options.memo),
          }),
        );
      }

      tx.recentBlockhash = nonceAccount.nonce;
      tx.feePayer = staker;
      tx.partialSign(stakeKey);

      // Sign with nonce account
      const signatures = await this.partialSignWithNonceAccount(tx.serializeMessage().toString('hex'));
      signatures.forEach((signature: PublicSignature) => {
        if (signature.signature) {
          tx.addSignature(
            new PublicKey(signature.pubkey),
            Buffer.from(signature.signature, 'hex'),
          );
        }
      });

      // Tag stake
      const stake: TaggedStake = {
        stakeAccount: stakeKey.publicKey.toString(),
        balance: amountSol * LAMPORTS_TO_SOL
      };
      await api.post<ApiCreatedStakes>(
        '/v1/sol/stakes',
        {
          account_id: accountId,
          stakes: [stake],
        });

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

      // Get nonce account info
      const nonceInfo = await this.getNonceAccount();
      const nonceAccountPubKey = new PublicKey(nonceInfo.nonce_account);
      const connection = await this.getConnection();
      const nonceAccount = await connection.getNonce(nonceAccountPubKey);
      if (!nonceAccount) {
        throw new Error('Could not fetch nonce account');
      }

      const instructions = [
        SystemProgram.nonceAdvance({
          noncePubkey: nonceAccountPubKey,
          authorizedPubkey: nonceAccount.authorizedPubkey,
        }),
        StakeProgram.deactivate({
          stakePubkey: stakeAccountPubKey,
          authorizedPubkey: walletPubKey,
        }),
      ];
      tx.add(...instructions);


      tx.recentBlockhash = nonceAccount.nonce;
      tx.feePayer = walletPubKey;

      // Sign with nonce account
      const signatures = await this.partialSignWithNonceAccount(tx.serializeMessage().toString('hex'));
      signatures.forEach((signature: PublicSignature) => {
        if (signature.signature) {
          tx.addSignature(
            new PublicKey(signature.pubkey),
            Buffer.from(signature.signature, 'hex'),
          );
        }
      });

      return tx;
    }

    /**
     * Craft Solana withdraw staked balance transaction
     * @param stakeAccountAddress stake account address to deactivate
     * @param walletAddress wallet that has authority over the stake account
     * @param amountSol: amount to withdraw in SOL, if not specified the whole balance will be withdrawn
     */
    async craftWithdrawStakedBalanceTx(
      stakeAccountAddress: string,
      walletAddress: string,
      amountSol?: number,
    ): Promise<SolanaTx> {
      const stakeAccountPubKey = new PublicKey(stakeAccountAddress);
      const walletPubKey = new PublicKey(walletAddress);

      // Get nonce account info
      const nonceInfo = await this.getNonceAccount();
      const nonceAccountPubKey = new PublicKey(nonceInfo.nonce_account);
      const connection = await this.getConnection();
      const nonceAccount = await connection.getNonce(nonceAccountPubKey);
      if (!nonceAccount) {
        throw new Error('Could not fetch nonce account');
      }

      let amount;

      if (!amountSol) {
        amount = await connection.getBalance(stakeAccountPubKey);
      } else {
        amount = amountSol * LAMPORTS_TO_SOL;
      }

      const tx = new Transaction();

      const instructions = [
        SystemProgram.nonceAdvance({
          noncePubkey: nonceAccountPubKey,
          authorizedPubkey: nonceAccount.authorizedPubkey,
        }),
        StakeProgram.withdraw({
          stakePubkey: stakeAccountPubKey,
          authorizedPubkey: walletPubKey,
          toPubkey: walletPubKey,
          lamports: amount,
        }),
      ];
      tx.add(...instructions);

      tx.recentBlockhash = nonceAccount.nonce;
      tx.feePayer = walletPubKey;

      // Sign with nonce account
      const signatures = await this.partialSignWithNonceAccount(tx.serializeMessage().toString('hex'));
      signatures.forEach((signature: PublicSignature) => {
        if (signature.signature) {
          tx.addSignature(
            new PublicKey(signature.pubkey),
            Buffer.from(signature.signature, 'hex'),
          );
        }
      });

      return tx;
    }

    /**
     * Craft merge stake accounts transaction, merging stake accounts can only be done on these conditions
     * https://docs.solana.com/staking/stake-accounts#merging-stake-accounts
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

      // Get nonce account info
      const nonceInfo = await this.getNonceAccount();
      const nonceAccountPubKey = new PublicKey(nonceInfo.nonce_account);
      const connection = await this.getConnection();
      const nonceAccount = await connection.getNonce(nonceAccountPubKey);
      if (!nonceAccount) {
        throw new Error('Could not fetch nonce account');
      }

      const instructions = [
        SystemProgram.nonceAdvance({
          noncePubkey: nonceAccountPubKey,
          authorizedPubkey: nonceAccount.authorizedPubkey,
        }),
        StakeProgram.merge({
          stakePubkey: destinationPubKey,
          sourceStakePubKey: sourcePubKey,
          authorizedPubkey: stakerPubKey,
        }),
      ];
      tx.add(...instructions);

      tx.recentBlockhash = nonceAccount.nonce;
      tx.feePayer = stakerPubKey;

      // Sign with nonce account
      const signatures = await this.partialSignWithNonceAccount(tx.serializeMessage().toString('hex'));
      signatures.forEach((signature: PublicSignature) => {
        if (signature.signature) {
          tx.addSignature(
            new PublicKey(signature.pubkey),
            Buffer.from(signature.signature, 'hex'),
          );
        }
      });

      return tx;
    }

    /**
     * Craft split stake account transaction
     * @param accountId kiln account id to associate the new stake account with
     * @param stakeAccountAddress stake account to split
     * @param walletAddress that has authority over the stake account to split
     * @param amountSol amount in SOL to put in the new stake account
     */
    async craftSplitStakeAccountTx(
      accountId: string,
      stakeAccountAddress: string,
      walletAddress: string,
      amountSol: number,
    ): Promise<SolanaTx> {
      if (amountSol < 0.01) {
        throw new InvalidStakeAmount('Amount must be at least 0.01 SOL');
      }
      const tx = new Transaction();
      const stakerPubKey = new PublicKey(walletAddress);
      const sourcePubKey = new PublicKey(stakeAccountAddress);
      const newStakeAccountPubKey = new Keypair();

      // Get nonce account info
      const nonceInfo = await this.getNonceAccount();
      const nonceAccountPubKey = new PublicKey(nonceInfo.nonce_account);
      const connection = await this.getConnection();
      const nonceAccount = await connection.getNonce(nonceAccountPubKey);
      if (!nonceAccount) {
        throw new Error('Could not fetch nonce account');
      }

      const instructions = [
        SystemProgram.nonceAdvance({
          noncePubkey: nonceAccountPubKey,
          authorizedPubkey: nonceAccount.authorizedPubkey,
        }),
        StakeProgram.split({
          stakePubkey: sourcePubKey,
          authorizedPubkey: stakerPubKey,
          splitStakePubkey: newStakeAccountPubKey.publicKey,
          lamports: amountSol * LAMPORTS_TO_SOL,
        }),
      ];
      tx.add(...instructions);

      tx.recentBlockhash = nonceAccount.nonce;
      tx.feePayer = stakerPubKey;
      tx.partialSign(newStakeAccountPubKey);

      // Sign with nonce account
      const signatures = await this.partialSignWithNonceAccount(tx.serializeMessage().toString('hex'));
      signatures.forEach((signature: PublicSignature) => {
        if (signature.signature) {
          tx.addSignature(
            new PublicKey(signature.pubkey),
            Buffer.from(signature.signature, 'hex'),
          );
        }
      });

      // Tag new stake
      const stake: TaggedStake = {
        stakeAccount: newStakeAccountPubKey.publicKey.toString(),
        balance: amountSol * LAMPORTS_TO_SOL,
      };
      await api.post<ApiCreatedStakes>(
        '/v1/sol/stakes',
        {
          account_id: accountId,
          stakes: [stake],
        });

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
      const payload = {
        rawMessageData: {
          messages: [
            {
              "content": message,
            },
          ],
        },
      };

      const signatures = await this.fbSigner.signWithFB(payload, this.testnet ? 'SOL_TEST' : 'SOL', note);
      signatures.signedMessages?.forEach((signedMessage: any) => {
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
     * Get transaction status
     * @param transactionHash: transaction hash
     */
    async getTxStatus(transactionHash: string): Promise<SolanaTxStatus> {
      try {
        const connection = await this.getConnection();
        const receipt = await connection.getTransaction(transactionHash);
        const status = receipt?.meta?.err === null ? 'success' : 'error';
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
     * @param accountIds: kiln account ids of which you wish to retrieve stakes
     * @returns {SolStakes} Solana Stakes
     */
    async getStakesByAccounts(
      accountIds: string[],
    ): Promise<SolStakes> {
      const { data } = await api.get<SolStakes>(
        `/v1/sol/stakes?accounts=${accountIds.join(',')}`);
      return data;
    }

    /**
     * Retrieve stakes of given stake accounts
     * @param stakeAccounts: stake account addresses of which you wish to retrieve rewards
     * @returns {SolStakes} Solana Stakes
     */
    async getStakesByStakeAccounts(
      stakeAccounts: string[],
    ): Promise<SolStakes> {
      const { data } = await api.get<SolStakes>(
        `/v1/sol/stakes?stake_accounts=${stakeAccounts.join(',')}`);
      return data;
    }

    /**
     * Retrieve stakes of given wallets
     * @param wallets: wallet addresses of which you wish to retrieve rewards
     * @returns {SolStakes} Solana Stakes
     */
    async getStakesByWallets(
      wallets: string[],
    ): Promise<SolStakes> {
      const { data } = await api.get<SolStakes>(
        `/v1/sol/stakes?wallets=${wallets.join(',')}`);
      return data;
    }

    /**
     * Retrieve rewards for given accounts
     * @param accountIds kiln account ids of which you wish to retrieve rewards
     * @returns {SolRewards} Solana rewards
     */
    async getRewardsByAccounts(accountIds: string[]): Promise<SolRewards> {
      const { data } = await api.get<SolRewards>(
        `/v1/sol/rewards?accounts=${accountIds.join(',')}`,
      );
      return data;
    }

    /**
     * Retrieve rewards for given stake accounts
     * @param stakeAccounts stake account addresses of which you wish to retrieve rewards
     * @returns {SolRewards} Solana rewards
     */
    async getRewardsByStakeAccounts(stakeAccounts: string[]): Promise<SolRewards> {
      const { data } = await api.get<SolRewards>(
        `/v1/sol/rewards?stake_accounts=${stakeAccounts.join(',')}`,
      );
      return data;
    }

    /**
     * Retrieve rewards for given stake accounts
     * @param wallets wallet addresses of which you wish to retrieve rewards
     * @returns {SolRewards} Solana rewards
     */
    async getRewardsByWallets(wallets: string[]): Promise<SolRewards> {
      const { data } = await api.get<SolRewards>(
        `/v1/sol/rewards?wallets=${wallets.join(',')}`,
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
