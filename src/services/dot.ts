import { Service } from "./service";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { InvalidStakeAmount } from "../errors/dot";
import {
  DotStakeOptions,
  DotTransaction,
  InternalDotConfig,
} from "../types/dot";
import { InvalidIntegration } from "../errors/integrations";
import { DotFbSigner } from "../integrations/dot_fb_signer";
import { Signer } from "@polkadot/api/types";
import { SignerOptions } from "@polkadot/api/submittable/types";
import { SubmittableExtrinsic } from "@polkadot/api/promise/types";

const DOT_TO_PLANCK = 1000000000000;

export class DotService extends Service {
  private rpc: string;

  constructor({ testnet, integrations, rpc }: InternalDotConfig) {
    super({ testnet, integrations });
    const kilnRpc = this.testnet ? 'wss://westend-rpc.polkadot.io' : 'wss://rpc.polkadot.io';
    this.rpc = rpc ?? kilnRpc;
  }

  private async getClient(): Promise<ApiPromise> {
    const provider = new WsProvider(this.rpc);
    return await ApiPromise.create({
      provider,
      noInitWarn: true,
      initWasm: false,
    });
  }

  /**
   * Craft dot bonding transaction
   * @param accountId id of the kiln account to use for the stake transaction
   * @param walletAddress stash account
   * @param amountDot how many tokens to stake in DOT
   * @param options
   */
  async craftBondTx(
    accountId: string,
    walletAddress: string,
    amountDot: number,
    options?: DotStakeOptions,
  ): Promise<DotTransaction> {
    if (amountDot < 0.01) {
      throw new InvalidStakeAmount('Dot stake must be at least 0.01 DOT');
    }

    const client = await this.getClient();
    const amount = (amountDot * DOT_TO_PLANCK).toString();
    const controllerAccountAddress = options?.controllerAccountAddress ?? walletAddress;
    const rewardsDestination = options?.rewardDestination ?? 'Staked';
    const extrinsic = await client.tx.staking.bond(controllerAccountAddress, amount, rewardsDestination);

    return {
      from: walletAddress,
      submittableExtrinsic: extrinsic,
    };
  }

  /**
   * Craft dot bonding extra token transaction (to be used if you already bonded tokens)
   * @param walletAddress stash account
   * @param amountDot how many tokens to stake in DOT
   */
  async craftBondExtraTx(
    walletAddress: string,
    amountDot: number,
  ): Promise<DotTransaction> {
    if (amountDot < 0.01) {
      throw new InvalidStakeAmount('Dot stake must be at least 0.01 DOT');
    }

    const client = await this.getClient();
    const amount = (amountDot * DOT_TO_PLANCK).toString();
    const extrinsic = await client.tx.staking.bondExtra(amount);

    return {
      from: walletAddress,
      submittableExtrinsic: extrinsic,
    };
  }

  /**
   * Craft dot unbonding transaction, there is an unbonding period of ~9h before your tokens can be withdrawn
   * @param walletAddress stash account
   * @param amountDot how many tokens unbond
   */
  async craftUnbondTx(
    walletAddress: string,
    amountDot: number,
  ): Promise<DotTransaction> {
    if (amountDot < 0.01) {
      throw new InvalidStakeAmount('Dot stake must be at least 0.01 DOT');
    }

    const client = await this.getClient();
    const amount = (amountDot * DOT_TO_PLANCK).toString();
    const extrinsic = await client.tx.staking.unbond(amount);

    return {
      from: walletAddress,
      submittableExtrinsic: extrinsic,
    };
  }

  /**
   * Craft dot chill transaction that chills the controller account associated
   * to the given stash account, meaning that given account will not nominate
   * any validator anymore, so you will stop earning rewards at the beginning
   * of the next era.
   * @param walletAddress stash account
   */
  async craftChillTx(
    walletAddress: string,
  ): Promise<DotTransaction> {
    const client = await this.getClient();
    const extrinsic = await client.tx.staking.chill();

    return {
      from: walletAddress,
      submittableExtrinsic: extrinsic,
    };
  }

  /**
   * Sign transaction with given integration
   * @param integration
   * @param transaction
   */
  async sign(integration: string, transaction: DotTransaction): Promise<any> {
    // const client = await this.getClient();
    const signer = this.getSigner(integration);
    const options: Partial<SignerOptions> = {
      era: 0,
      signer: signer,
    };
    const txSigned = await transaction.submittableExtrinsic.signAsync(transaction.from, options);
    // await client.disconnect();
    return txSigned;
  }

  /**
   * Broadcast signed transaction
   * @param transaction
   */
  async broadcast(transaction: SubmittableExtrinsic): Promise<string> {
    const submittedExtrinsic = await transaction.send();
    return submittedExtrinsic.toString();
  }

  /**
   * Get correct signer given integration. (only support fireblocks provider for now)
   * @param integration
   * @private
   */
  private getSigner(integration: string): Signer {
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

    return new DotFbSigner(this.fbSdk, currentIntegration.vaultAccountId, this.testnet ? 'WND' : 'DOT');
  }
}
