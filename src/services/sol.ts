import {
  Keypair,
  PublicKey,
  StakeProgram,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import api from '../api';
import { InvalidStakeAmount } from '../errors/sol';
import { SOL_VOTE_ACCOUNT_ADDRESS } from '../globals';
import { InternalSolanaConfig, SolanaStakeTx, SolStake } from '../models/sol';

export class SolService {
  private testnet: boolean;

  constructor({ testnet }: InternalSolanaConfig) {
    this.testnet = testnet === true;
  }

  /**
   * Craft Solana staking transaction
   * @param accountId id of the kiln account to use for the stake transaction
   * @param walletAddress used to create the stakeaccount and retrieve rewards in the future
   * @param amount how many tokens to stake in SOL (must be at least 0.01 SOL)
   */
  async craftStakeTx(
    accountId: string,
    walletAddress: string,
    amount: number
  ): Promise<SolanaStakeTx> {
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
      // create system account and transfer tokens
      SystemProgram.createAccount({
        fromPubkey: staker,
        newAccountPubkey: stakeKey.publicKey,
        lamports: amount * 10 ** 9,
        space: 200,
        programId: new PublicKey('Stake11111111111111111111111111111111111111'),
      }),
      // initialize stake account credentials
      StakeProgram.initialize({
        stakePubkey: stakeKey.publicKey,
        authorized: {
          staker,
          withdrawer: staker,
        },
        lockup: {
          unixTimestamp: 0,
          epoch: 0,
          custodian: new PublicKey('11111111111111111111111111111111'),
        },
      }),
      // delegate to vote account
      StakeProgram.delegate({
        stakePubkey: stakeKey.publicKey,
        authorizedPubkey: staker,
        votePubkey: new PublicKey(SOL_VOTE_ACCOUNT_ADDRESS), // TODO: testnet support
      }),
    ];
    tx.add(...instructions);
    return tx;
  }

  /**
   * Retrieve stakes of a Kiln account
   * @param accountId id of the kiln account used to make the stake
   * @param start for paging - beginning index of the page
   * @param end for paging - end index of the page
   * @returns {SolStake} Solana Stake
   */
  async getAccountStakes(
    accountId: string,
    start: number,
    end: number
  ): Promise<SolStake> {
    const { data } = await api.get<SolStake>(
      `/v1/sol/stakes?account=${accountId}&start=${start}?end=${end}`
    );
    return data;
  }

  /**
   * Retrieve stakes made with a wallet
   * @param walletAddress address of the wallet used to make the stake
   * @param start for paging - beginning index of the page
   * @param end for paging - end index of the page
   * @returns {SolStake[]} solana Stakes
   */
  async getWalletStakes(
    walletAddress: string,
    start: number,
    end: number
  ): Promise<SolStake> {
    const { data } = await api.get<SolStake>(
      `/v1/sol/stakes?wallets=${walletAddress}&start=${start}&end=${end}`
    );
    return data;
  }

  /**
   * Retrieve stakes on a stakeaccount
   * @param stakeaccountAddress address of the stakeaccount used to make the stake
   * @param start for paging - beginning index of the page
   * @param end for paging - end index of the page
   * @returns {SolStake[]} solana Stakes
   */
  async getStakeAccountStakes(
    stakeaccountAddress: string,
    start: number,
    end: number
  ): Promise<SolStake> {
    const { data } = await api.get<SolStake>(
      `/v1/sol/stakes?stakeaccounts=${stakeaccountAddress}&start=${start}&end=${end}`
    );
    return data;
  }
}
