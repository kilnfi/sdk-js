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

const DOT_TO_PLANCK = 10000000000;

export class DotService extends Service {
  private rpc: string;
  private client: ApiPromise | undefined;

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

  private async disconnectClient(client: ApiPromise): Promise<void> {
    await client.disconnect();
  }

  /**
   * Craft dot bonding transaction
   * @param accountId id of the kiln account to use for the stake transaction
   * @param walletAddress withdrawal creds /!\ losing it => losing the ability to withdraw
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
    await this.disconnectClient(client);

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
    const client = await this.getClient();
    const signer = this.getSigner(integration);
    const options: Partial<SignerOptions> = {
      era: 0,
      signer: signer,
    };
    const txSigned = await transaction.submittableExtrinsic.signAsync(transaction.from, options);
    await this.disconnectClient(client);
    return txSigned;
  }

  /**
   * Broadcast signed transaction
   * @param transaction
   */
  async broadcast(transaction: SubmittableExtrinsic): Promise<any> {
    return transaction.send();
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
