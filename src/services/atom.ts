import { BroadcastError, InvalidIntegration } from "../errors/integrations";
import { Service } from "./service";
import {
  coin,
  MsgDelegateEncodeObject,
  SigningStargateClient,
  StargateClient,
  StdFee,
} from "@cosmjs/stargate";
import { AtomTx, InternalAtomConfig } from "../types/atom";
import { NoAccountFound, InvalidStakeAmount } from "../errors/atom";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { OfflineSigner } from "@cosmjs/proto-signing";
import { MsgDelegate } from "cosmjs-types/cosmos/staking/v1beta1/tx";
import { AtomFbSigner } from "../integrations/atom_fb_signer";
import { ADDRESSES } from "../globals";

const UATOM_TO_ATOM = 1000000;

export class AtomService extends Service {
  private rpc: string;

  constructor({ testnet, integrations, rpc }: InternalAtomConfig) {
    super({ testnet, integrations });
    const kilnRpc = this.testnet ? 'https://rpc.sentry-02.theta-testnet.polypore.xyz' : 'https://rpc.cosmos.network';
    this.rpc = rpc ?? kilnRpc;
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
   * @param amount how many tokens to stake in ETH (must be a multiple of 32)
   */
  async craftStakeTx(
    accountId: string,
    walletAddress: string,
    amount: number,
  ): Promise<AtomTx> {
    if (amount < 0.01) {
      throw new InvalidStakeAmount('Atom stake must be at least 0.01 SOL');
    }

    try {
      const client = await this.getClient();
      const account = await client.getAccount(walletAddress);

      if (!account) {
        throw new NoAccountFound(`No account found on this address: ${walletAddress}`);
      }

      const msg = MsgDelegate.fromPartial({
        delegatorAddress: account.address,
        validatorAddress: this.testnet ? ADDRESSES.atom.testnet.validatorAddress : ADDRESSES.atom.mainnet.validatorAddress,
        amount: coin((amount * UATOM_TO_ATOM).toString(), "uatom"),
      });

      const delegateMsg: MsgDelegateEncodeObject = {
        typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
        value: msg,
      };

      const feeAmount = coin(5000, "uatom");
      const fee: StdFee = {
        amount: [feeAmount],
        gas: '300000',
      };

      return {
        address: account.address,
        messages: [delegateMsg],
        fee: fee,
        memo: Buffer.from(accountId).toString('base64'),
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
      throw new BroadcastError(e);
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
      throw new InvalidIntegration(`Unknown integration, please provide an integration name that matches one of the integrations provided in the config.`);
    }

    // We only support fireblocks integration for now
    if (currentIntegration.provider !== 'fireblocks') {
      throw new InvalidIntegration(`Unsupported integration provider: ${currentIntegration.provider}`);
    }

    if (!this.fbSdk) {
      throw new InvalidIntegration(`Could not retrieve fireblocks signer.`);
    }

    return new AtomFbSigner(this.fbSdk, currentIntegration.vaultAccountId, this.testnet ? 'ATOM_COS_TEST' : 'ATOM_COS');
  }
}
