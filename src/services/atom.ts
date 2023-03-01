import { Service } from './service';
import {
  coin,
  MsgDelegateEncodeObject,
  MsgUndelegateEncodeObject,
  SigningStargateClient,
  StargateClient,
  StdFee,
} from '@cosmjs/stargate';
import { AtomStakeOptions, AtomTx, AtomTxStatus } from '../types/atom';
import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import { Coin, OfflineSigner } from '@cosmjs/proto-signing';
import {
  MsgDelegate,
  MsgUndelegate,
} from 'cosmjs-types/cosmos/staking/v1beta1/tx';
import { AtomFbSigner } from '../integrations/atom_fb_signer';
import { ADDRESSES } from '../globals';
import { ServiceProps } from '../types/service';

const UATOM_TO_ATOM = 1000000;

export class AtomService extends Service {
  private rpc: string;

  constructor({ testnet, integrations }: ServiceProps) {
    super({ testnet, integrations });
    const kilnRpc = this.testnet ? 'https://rpc.sentry-02.theta-testnet.polypore.xyz' : 'https://rpc.atomscan.com';
    this.rpc = kilnRpc;
  }

  private async getClient(): Promise<StargateClient> {
    return await StargateClient.connect(this.rpc);
  }

  private async getSigningClient(signer: OfflineSigner): Promise<SigningStargateClient> {
    return await SigningStargateClient.connectWithSigner(this.rpc, signer);
  }

  /**
   * Craft atom staking transaction
   * @param accountId id of the kiln account to use for the stake transaction
   * @param walletAddress withdrawal creds /!\ losing it => losing the ability to withdraw
   * @param amountAtom how many tokens to stake in ATOM
   * @param options
   */
  async craftStakeTx(
    accountId: string,
    walletAddress: string,
    amountAtom: number,
    options?: AtomStakeOptions,
  ): Promise<AtomTx> {
    if (amountAtom < 0.01) {
      throw new Error('Atom stake must be at least 0.01 ATOM');
    }

    try {
      const validatorAddress = options?.validatorAddress ? options.validatorAddress :
        this.testnet ?
          ADDRESSES.atom.testnet.validatorAddress :
          ADDRESSES.atom.mainnet.validatorAddress;

      const msg = MsgDelegate.fromPartial({
        delegatorAddress: walletAddress,
        validatorAddress: validatorAddress,
        amount: coin((amountAtom * UATOM_TO_ATOM).toString(), 'uatom'),
      });

      const delegateMsg: MsgDelegateEncodeObject = {
        typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
        value: msg,
      };

      const feeAmount = coin(5000, 'uatom');
      const fee: StdFee = {
        amount: [feeAmount],
        gas: '300000',
      };

      return {
        address: walletAddress,
        messages: [delegateMsg],
        fee: fee,
        memo: Buffer.from(accountId).toString('base64'),
      };

    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft atom unstaking staking transaction
   * @param walletAddress wallet address from which the delegation has been made
   * @param validatorAddress validator address to which the delegation has been made
   * @param amountAtom how many tokens to un undelegate in ATOM
   */
  async craftUnstakeTx(
    walletAddress: string,
    validatorAddress: string,
    amountAtom?: number,
  ): Promise<AtomTx> {
    try {
      let amountToWithdraw: Coin;
      if (!amountAtom) {
        const client = await this.getClient();
        const delegation = await client.getDelegation(walletAddress, validatorAddress);
        if (!delegation) {
          throw new Error('Could not fetch delegation.');
        }
        amountToWithdraw = delegation;
      } else {
        amountToWithdraw = coin((amountAtom * UATOM_TO_ATOM).toString(), 'uatom');
      }

      const msg = MsgUndelegate.fromPartial({
        delegatorAddress: walletAddress,
        validatorAddress: validatorAddress,
        amount: amountToWithdraw,
      });

      const undelegateMsg: MsgUndelegateEncodeObject = {
        typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
        value: msg,
      };

      const feeAmount = coin(5000, 'uatom');
      const fee: StdFee = {
        amount: [feeAmount],
        gas: '300000',
      };

      return {
        address: walletAddress,
        messages: [undelegateMsg],
        fee: fee,
      };

    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Sign transaction with given integration
   * @param integration
   * @param transaction
   */
  async sign(integration: string, transaction: AtomTx): Promise<TxRaw> {
    const signer = this.getSigner(integration);
    const client = await this.getSigningClient(signer);
    return client.sign(transaction.address, transaction.messages, transaction.fee, transaction.memo ?? '');
  }


  /**
   * Broadcast transaction to the network
   * @param transaction
   */
  async broadcast(transaction: TxRaw): Promise<string | undefined> {
    try {
      const client = await this.getClient();
      const res = await client.broadcastTx(TxRaw.encode(transaction).finish());
      return res.transactionHash;
    } catch (e: any) {
      throw new Error(e);
    }
  }

  /**
   * Get transaction status
   * @param transactionHash: hash of transaction
   */
  async getTxStatus(transactionHash: string): Promise<AtomTxStatus | null> {
    try {
      const client = await this.getClient();
      const tx = await client.getTx(transactionHash);
      return tx ? {
        status: tx.code === 0 ? 'success' : 'error',
        txReceipt: tx,
      } : null;
    } catch (e: any) {
      throw new Error(e);
    }
  }

  /**
   * Get correct signer given integration. (only support fireblocks provider for now)
   * @param integration
   * @private
   */
  private getSigner(integration: string): OfflineSigner {
    const currentIntegration = this.integrations?.find(int => int.name === integration);
    if (!currentIntegration) {
      throw new Error(`Unknown integration, please provide an integration name that matches one of the integrations provided in the config.`);
    }

    // We only support fireblocks integration for now
    if (currentIntegration.provider !== 'fireblocks') {
      throw new Error(`Unsupported integration provider: ${currentIntegration.provider}`);
    }

    if (!this.fbSdk) {
      throw new Error(`Could not retrieve fireblocks signer.`);
    }

    return new AtomFbSigner(this.fbSdk, currentIntegration.vaultAccountId, this.testnet ? 'ATOM_COS_TEST' : 'ATOM_COS');
  }
}
