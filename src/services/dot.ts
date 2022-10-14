import { Service } from "./service";
import { ApiPromise, HttpProvider } from "@polkadot/api";
import { InvalidStakeAmount } from "../errors/dot";
import {
  DotStakeOptions,
  DotTransaction,
  InternalDotConfig, RewardDestination,
} from "../types/dot";
import { InvalidIntegration } from "../errors/integrations";
import { DotFbSigner } from "../integrations/dot_fb_signer";
import { Signer } from "@polkadot/api/types";
import { SignerOptions } from "@polkadot/api/submittable/types";
import { SubmittableExtrinsic } from "@polkadot/api/promise/types";
import { ADDRESSES } from "../globals";

const DOT_TO_PLANCK = 1000000000000;


/**
 * Staking docs: https://paritytech.github.io/substrate/master/pallet_staking/struct.Pallet.html
 */
export class DotService extends Service {
  private rpc: string;

  constructor({ testnet, integrations, rpc }: InternalDotConfig) {
    super({ testnet, integrations });
    const kilnRpc = this.testnet ? 'https://westend-rpc.polkadot.io' : 'https://rpc.polkadot.io';
    this.rpc = rpc ?? kilnRpc;
  }

  private async getClient(): Promise<ApiPromise> {
    const provider = new HttpProvider(this.rpc);
    return await ApiPromise.create({
      provider,
      noInitWarn: true,
      initWasm: false,
    });
  }

  /**
   * Craft dot bonding transaction
   * @param accountId id of the kiln account to use for the stake transaction
   * @param stashAccount stash account address (your most secure cold wallet)
   * @param amountDot how many tokens to bond in DOT
   * @param options
   */
  async craftBondTx(
    accountId: string,
    stashAccount: string,
    amountDot: number,
    options?: DotStakeOptions,
  ): Promise<DotTransaction> {
    if (amountDot < 0.01) {
      throw new InvalidStakeAmount('Dot stake must be at least 0.01 DOT');
    }

    const client = await this.getClient();
    const amount = (amountDot * DOT_TO_PLANCK).toString();

    // The controller account is responsible for managing the stake,
    // it is recommended to have a separate wallet for it and keep the stash account as a cold offline wallet,
    // although it is possible for the controller account to be the same as the stash account
    const controllerAccount = options?.controllerAccount ?? stashAccount;
    const rewardsDestination = options?.rewardDestination ?? 'Staked';
    const extrinsic = await client.tx.staking.bond(controllerAccount, amount, rewardsDestination);

    return {
      from: stashAccount,
      submittableExtrinsic: extrinsic,
    };
  }

  /**
   * Craft dot bonding extra token transaction (to be used if you already bonded tokens)
   * @param stashAccount stash account address
   * @param amountDot how many tokens to bond in DOT
   */
  async craftBondExtraTx(
    stashAccount: string,
    amountDot: number,
  ): Promise<DotTransaction> {
    if (amountDot < 0.01) {
      throw new InvalidStakeAmount('Dot stake must be at least 0.01 DOT');
    }

    const client = await this.getClient();
    const amount = (amountDot * DOT_TO_PLANCK).toString();
    const extrinsic = await client.tx.staking.bondExtra(amount);

    return {
      from: stashAccount,
      submittableExtrinsic: extrinsic,
    };
  }

  /**
   * Craft dot nominate transaction
   * @param controllerAccount controller account address
   * @param validatorAddresses validator addresses to nominate to, if not provided, will nominate to Kiln's validator
   */
  async craftNominateTx(
    controllerAccount: string,
    validatorAddresses?: string[],
  ): Promise<DotTransaction> {

    const validators: string[] = validatorAddresses ?? this.testnet ? [ADDRESSES.dot.testnet.validatorAddress] : [ADDRESSES.dot.mainnet.validatorAddress];
    const client = await this.getClient();
    const extrinsic = await client.tx.staking.nominate(validators);

    return {
      from: controllerAccount,
      submittableExtrinsic: extrinsic,
    };
  }

  /**
   * Craft dot unbonding transaction, there is an unbonding period before your tokens can be withdrawn
   * @param controllerAccount controller account address
   * @param amountDot how many tokens to unbond in DOT
   */
  async craftUnbondTx(
    controllerAccount: string,
    amountDot: number,
  ): Promise<DotTransaction> {
    if (amountDot < 0.01) {
      throw new InvalidStakeAmount('Dot stake must be at least 0.01 DOT');
    }

    const client = await this.getClient();
    const amount = (amountDot * DOT_TO_PLANCK).toString();
    const extrinsic = await client.tx.staking.unbond(amount);

    return {
      from: controllerAccount,
      submittableExtrinsic: extrinsic,
    };
  }

  /**
   * Craft dot withdraw unbonded token transaction
   * @param controllerAccount controller account address
   */
  async craftWithdrawUnbondedTx(
    controllerAccount: string,
  ): Promise<DotTransaction> {
    const client = await this.getClient();
    const spanCount = await client.query.staking.slashingSpans(controllerAccount);
    const extrinsic = await client.tx.staking.withdrawUnbonded(spanCount.toHex());

    return {
      from: controllerAccount,
      submittableExtrinsic: extrinsic,
    };
  }

  /**
   * Craft dot chill transaction that chills the controller account associated
   * to the given stash account, meaning that given account will not nominate
   * any validator anymore, so you will stop earning rewards at the beginning
   * of the next era.
   * @param controllerAccount controller account address
   */
  async craftChillTx(
    controllerAccount: string,
  ): Promise<DotTransaction> {
    const client = await this.getClient();
    const extrinsic = await client.tx.staking.chill();

    return {
      from: controllerAccount,
      submittableExtrinsic: extrinsic,
    };
  }

  /**
   * Craft dot set controller transaction that updates the controller for the given stash account
   * @param stashAccount stash account address
   * @param controllerAccount controller account address
   */
  async craftSetControllerTx(
    stashAccount: string,
    controllerAccount: string,
  ): Promise<DotTransaction> {
    const client = await this.getClient();
    const extrinsic = await client.tx.staking.setController(controllerAccount);

    return {
      from: stashAccount,
      submittableExtrinsic: extrinsic,
    };
  }

  /**
   * Craft dot set reward destination transaction that updates the destination rewards address for the given stash account
   * @param controllerAccount controller account address
   * @param rewardsDestination:
   *  'Staked': rewards are paid into the stash account, increasing the amount at stake accordingly.
   *  'Stash': rewards are paid into the stash account, not increasing the amount at stake.
   *  'Controller': rewards are paid into the controller account
   *  Custom account address: rewards are paid into the custom account address
   */
  async craftSetPayeeTx(
    controllerAccount: string,
    rewardsDestination: RewardDestination,
  ): Promise<DotTransaction> {
    const client = await this.getClient();
    const extrinsic = await client.tx.staking.setPayee(rewardsDestination);

    return {
      from: controllerAccount,
      submittableExtrinsic: extrinsic,
    };
  }

  /**
   * Sign transaction with given integration
   * @param integration
   * @param transaction
   */
  async sign(integration: string, transaction: DotTransaction): Promise<SubmittableExtrinsic> {
    const signer = this.getSigner(integration);
    const options: Partial<SignerOptions> = {
      era: 0,
      signer: signer,
    };
    return await transaction.submittableExtrinsic.signAsync(transaction.from, options);
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
   * Get transaction status
   * @param transactionHash hash of transaction
   */
  async getTxStatus(
    transactionHash: string,
  ): Promise<any> {
    const client = await this.getClient();
    const extrinsicData = await client.query.system.extrinsicData(transactionHash);
    console.log(extrinsicData.toHuman());
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
