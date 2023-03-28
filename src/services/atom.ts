import { Service } from './service';
import {
  coin,
  MsgDelegateEncodeObject,
  MsgUndelegateEncodeObject,
  MsgWithdrawDelegatorRewardEncodeObject,
  SigningStargateClient,
  StargateClient,
  StdFee,
} from '@cosmjs/stargate';
import { AtomSignedTx, AtomTx, AtomTxHash, AtomTxStatus } from '../types/atom';
import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import { Coin, OfflineSigner } from '@cosmjs/proto-signing';
import {
  MsgDelegate,
  MsgUndelegate,
} from 'cosmjs-types/cosmos/staking/v1beta1/tx';
import { AtomFbSigner } from '../integrations/atom_fb_signer';
import { ServiceProps } from '../types/service';
import { Integration } from '../types/integrations';
import {
  MsgWithdrawDelegatorReward,
} from 'cosmjs-types/cosmos/distribution/v1beta1/tx';

export class AtomService extends Service {
  private rpc: string;

  constructor({ testnet }: ServiceProps) {
    super({ testnet });
    this.rpc = this.testnet ? 'https://rpc.sentry-02.theta-testnet.polypore.xyz' : 'https://rpc.atomscan.com';
  }

  private async getClient(): Promise<StargateClient> {
    return await StargateClient.connect(this.rpc);
  }

  private async getSigningClient(signer: OfflineSigner): Promise<SigningStargateClient> {
    return await SigningStargateClient.connectWithSigner(this.rpc, signer);
  }

  /**
   * Convert ATOM to UATOM
   * @param amountAtom
   */
  atomToUatom(amountAtom: string): string {
    return (parseFloat(amountAtom) * 10 ** 6).toFixed();
  }

  /**
   * Craft atom staking transaction
   * @param accountId id of the kiln account to use for the stake transaction
   * @param walletAddress withdrawal creds /!\ losing it => losing the ability to withdraw
   * @param validatorAddress validator address to delegate to
   * @param amountAtom how many tokens to stake in ATOM
   */
  async craftStakeTx(
    accountId: string,
    walletAddress: string,
    validatorAddress: string,
    amountAtom: number,
  ): Promise<AtomTx> {
    try {
      const msg = MsgDelegate.fromPartial({
        delegatorAddress: walletAddress,
        validatorAddress: validatorAddress,
        amount: coin(this.atomToUatom(amountAtom.toString()), 'uatom'),
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
   * Craft atom withdraw rewards transaction
   * @param walletAddress wallet address from which the delegation has been made
   * @param validatorAddress validator address to which the delegation has been made
   */
  async craftWithdrawRewardsTx(
    walletAddress: string,
    validatorAddress: string,
  ): Promise<AtomTx> {
    try {
      const msg = MsgWithdrawDelegatorReward.fromPartial({
        delegatorAddress: walletAddress,
        validatorAddress: validatorAddress,
      });

      const msgEncoded: MsgWithdrawDelegatorRewardEncodeObject = {
        typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
        value: msg,
      };

      const feeAmount = coin(5000, 'uatom');
      const fee: StdFee = {
        amount: [feeAmount],
        gas: '300000',
      };

      return {
        address: walletAddress,
        messages: [msgEncoded],
        fee: fee,
      };

    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft atom unstaking transaction
   * @param walletAddress wallet address from which the delegation has been made
   * @param validatorAddress validator address to which the delegation has been made
   * @param amountAtom how many tokens to undelegate in ATOM
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
        amountToWithdraw = coin(this.atomToUatom(amountAtom.toString()), 'uatom');
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
   * @param integration custody solution to sign with
   * @param tx raw ada transaction
   * @param note note to identify the transaction in your custody solution
   */
  async sign(integration: Integration, tx: AtomTx, note?: string): Promise<AtomSignedTx> {
    const fbNote = note ? note : 'ATOM tx from @kilnfi/sdk';
    const signer = this.getSigner(integration, fbNote);
    const client = await this.getSigningClient(signer);
    const signedTx = await client.sign(tx.address, tx.messages, tx.fee, tx.memo ?? '');
    return {
      data: {
        signed_tx_serialized: Buffer.from(TxRaw.encode(signedTx).finish()).toString('hex'),
      },
    };
  }


  /**
   * Broadcast transaction to the network
   * @param signedTx
   */
  async broadcast(signedTx: AtomSignedTx): Promise<AtomTxHash> {
    try {
      const client = await this.getClient();
      const res = await client.broadcastTx(Uint8Array.from(Buffer.from(signedTx.data.signed_tx_serialized, 'hex')));
      return {
        data: {
          tx_hash: res.transactionHash,
        },
      };
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
      if (!tx) return null;
      return {
        data: {
          status: tx.code === 0 ? 'success' : 'error',
          receipt: tx,
        },
      };
    } catch (e: any) {
      throw new Error(e);
    }
  }

  /**
   * Get correct signer given integration. (only support fireblocks provider for now)
   * @param integration
   * @param note
   * @private
   */
  private getSigner(integration: Integration, note?: string): OfflineSigner {
    const fbSdk = this.getFbSdk(integration);
    return new AtomFbSigner(fbSdk, integration.vaultId, this.testnet ? 'ATOM_COS_TEST' : 'ATOM_COS', note);
  }
}
