import { Service } from "./service";
import { DotRewardDestination, DotSignedTx, DotTx, DotTxHash, DotTxStatus } from "../types/dot";
import { ServiceProps } from "../types/service";
import { Integration } from "../types/integrations";
import api from "../api";

/**
 * Staking docs: https://polkadot.js.org/docs/substrate/extrinsics#staking
 * Nomination pools docs: https://polkadot.js.org/docs/substrate/extrinsics#nominationpools
 */
export class DotService extends Service {
  constructor({ testnet }: ServiceProps) {
    super({ testnet });
  }

  /**
   * Convert WND (testnet token) to PLANCK
   * To be used in testnet (Westend)
   * @param amountWnd
   */
  wndToPlanck(amountWnd: string): string {
    return (parseFloat(amountWnd) * 10 ** 12).toFixed();
  }

  /**
   * Convert DOT to PLANCK
   * To be used in mainnet
   * @param amountDot
   */
  dotToPlanck(amountDot: string): string {
    return (parseFloat(amountDot) * 10 ** 10).toFixed();
  }

  /**
   * Craft dot bonding transaction
   * @param accountId id of the kiln account to use for the stake transaction
   * @param stashAccount stash account address (your most secure cold wallet)
   * @param amountDot amount to bond in DOT
   * @param rewardDestination
   */
  async craftBondTx(
    accountId: string,
    stashAccount: string,
    amountDot: number,
    rewardDestination: DotRewardDestination,
  ): Promise<DotTx> {
    const amountPlanck = this.testnet ? this.wndToPlanck(amountDot.toString()) : this.dotToPlanck(amountDot.toString());
    try {
      const { data } = await api.post<DotTx>(
        `/v1/dot/transaction/bond`,
        {
          account_id: accountId,
          stash_account: stashAccount,
          amount_planck: amountPlanck,
          reward_destination: rewardDestination,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft dot bonding extra token transaction (to be used if you already bonded tokens)
   * @param stashAccount stash account address
   * @param amountDot amount to bond extra in DOT
   */
  async craftBondExtraTx(
    stashAccount: string,
    amountDot: number,
  ): Promise<DotTx> {
    const amountPlanck = this.testnet ? this.wndToPlanck(amountDot.toString()) : this.dotToPlanck(amountDot.toString());
    try {
      const { data } = await api.post<DotTx>(
        `/v1/dot/transaction/bond-extra`,
        {
          stash_account: stashAccount,
          amount_planck: amountPlanck,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft dot rebond transaction (to be used to rebond unbonding token)
   * @param stashAccount stash account address
   * @param amountDot amount to rebond in DOT
   */
  async craftRebondTx(
    stashAccount: string,
    amountDot: number,
  ): Promise<DotTx> {
    const amountPlanck = this.testnet ? this.wndToPlanck(amountDot.toString()) : this.dotToPlanck(amountDot.toString());
    try {
      const { data } = await api.post<DotTx>(
        `/v1/dot/transaction/rebond`,
        {
          stash_account: stashAccount,
          amount_planck: amountPlanck,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft dot nominate transaction
   * @param stashAccount stash account address
   * @param validatorAddresses validator addresses to nominate to
   */
  async craftNominateTx(
    stashAccount: string,
    validatorAddresses: string[],
  ): Promise<DotTx> {
    try {
      const { data } = await api.post<DotTx>(
        `/v1/dot/transaction/nominate`,
        {
          stash_account: stashAccount,
          validator_addresses: validatorAddresses,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft dot unbonding transaction, there is an unbonding period before your tokens can be withdrawn
   * @param stashAccount stash account address
   * @param amountDot amount to unrebond in DOT
   */
  async craftUnbondTx(
    stashAccount: string,
    amountDot: number,
  ): Promise<DotTx> {
    const amountPlanck = this.testnet ? this.wndToPlanck(amountDot.toString()) : this.dotToPlanck(amountDot.toString());
    try {
      const { data } = await api.post<DotTx>(
        `/v1/dot/transaction/unbond`,
        {
          stash_account: stashAccount,
          amount_planck: amountPlanck,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft dot withdraw unbonded token transaction
   * @param stashAccount stash account address
   */
  async craftWithdrawUnbondedTx(
    stashAccount: string,
  ): Promise<DotTx> {
    try {
      const { data } = await api.post<DotTx>(
        `/v1/dot/transaction/withdraw-unbonded`,
        {
          stash_account: stashAccount,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft dot chill transaction that chills the stash account,
   * meaning that given account will not nominate
   * any validator anymore, so you will stop earning rewards at the beginning
   * of the next era.
   * @param stashAccount stash account address
   */
  async craftChillTx(
    stashAccount: string,
  ): Promise<DotTx> {
    try {
      const { data } = await api.post<DotTx>(
        `/v1/dot/transaction/chill`,
        {
          stash_account: stashAccount,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft dot set reward destination transaction that updates the destination rewards address for the given stash account
   * @param stashAccount stash account address
   * @param rewardsDestination:
   *  'Staked': rewards are paid into the stash account, increasing the amount at stake accordingly.
   *  'Stash': rewards are paid into the stash account, not increasing the amount at stake.
   *  'Controller': rewards are paid into the controller account
   *  Custom account address: rewards are paid into the custom account address
   */
  async craftSetPayeeTx(
    stashAccount: string,
    rewardsDestination: DotRewardDestination,
  ): Promise<DotTx> {
    try {
      const { data } = await api.post<DotTx>(
        `/v1/dot/transaction/set-payee`,
        {
          stash_account: stashAccount,
          reward_destination: rewardsDestination,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft dot join pool transaction
   * The amount to bond is transferred from the member to the pools account and immediately increases the pools bond.
   * @param accountId
   * @param memberAccount
   * @param amountDot
   * @param poolId
   */
  async craftJoinPoolTx(
    accountId: string,
    memberAccount: string,
    amountDot: number,
    poolId: string,
  ): Promise<DotTx> {
    try {
      const amountPlanck = this.testnet ? this.wndToPlanck(amountDot.toString()) : this.dotToPlanck(amountDot.toString());
      const { data } = await api.post<DotTx>(
        `/v1/dot/transaction/join-pool`,
        {
          account_id: accountId,
          member_account: memberAccount,
          amount_planck: amountPlanck,
          pool_id: poolId,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft a pool bond extra transaction
   * Bond extra more funds from origin into the pool to which they already belong.
   * Bonding extra funds implies an automatic payout of all pending rewards as well.
   * @param memberAccount
   * @param amountDot
   */
  async craftBondExtraToPoolTx(
    memberAccount: string,
    amountDot: number,
  ): Promise<DotTx> {
    try {
      const amountPlanck = this.testnet ? this.wndToPlanck(amountDot.toString()) : this.dotToPlanck(amountDot.toString());
      const { data } = await api.post<DotTx>(
        `/v1/dot/transaction/bond-extra-pool`,
        {
          member_account: memberAccount,
          amount_planck: amountPlanck,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft a pool bond extra transaction to bond available rewards into the pool to which they already belong.
   * @param memberAccount
   */
  async craftBondRewardsToPoolTx(
    memberAccount: string,
  ): Promise<DotTx> {
    try {
      const { data } = await api.post<DotTx>(
        `/v1/dot/transaction/bond-rewards-pool`,
        {
          member_account: memberAccount,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft a pool claim payout transaction
   * A bonded member can use this to claim their payout based on the rewards that
   * the pool has accumulated since their last claimed payout (OR since joining
   * if this is their first time claiming rewards).
   * The payout will be transferred to the member's account.
   * The member will earn rewards pro rata based on the members stake vs the sum of the members in the pools stake. Rewards do not "expire".
   * @param memberAccount
   */
  async craftClaimPayoutFromPoolTx(
    memberAccount: string,
  ): Promise<DotTx> {
    try {
      const { data } = await api.post<DotTx>(
        `/v1/dot/transaction/claim-payout-pool`,
        {
          member_account: memberAccount,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft a pool unbond transaction
   * Unbond amount funds from the pool.
   * It implicitly collects the rewards one last time, since not doing so would mean some rewards would be forfeited.
   * Warning: you cannot rebond during the unbonding period with a nomination pool. If you change your mind, you must wait for the unbonding period to end before you can join a nomination pool again.
   * @param memberAccount
   * @param amountDot
   */
  async craftUnbondFromPoolTx(
    memberAccount: string,
    amountDot: number,
  ): Promise<DotTx> {
    try {
      const amountPlanck = this.testnet ? this.wndToPlanck(amountDot.toString()) : this.dotToPlanck(amountDot.toString());
      const { data } = await api.post<DotTx>(
        `/v1/dot/transaction/unbond-pool`,
        {
          member_account: memberAccount,
          amount_planck: amountPlanck,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft a pool withdraw unbonded transaction
   * Withdraw unbonded funds from member_account.
   * @param memberAccount
   */
  async craftWithdrawUnbondedFromPoolTx(
    memberAccount: string,
  ): Promise<DotTx> {
    try {
      const { data } = await api.post<DotTx>(
        `/v1/dot/transaction/withdraw-unbonded-pool`,
        {
          member_account: memberAccount,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Sign transaction with given integration
   * @param integration custody solution to sign with
   * @param tx raw transaction
   * @param note note to identify the transaction in your custody solution
   */
  async sign(integration: Integration, tx: DotTx, note?: string): Promise<DotSignedTx> {
    try {
      const payload = {
        rawMessageData: {
          messages: [
            {
              content: tx.data.unsigned_tx_payload.substring(2),
            },
          ],
        },
      };

      const fbSigner = this.getFbSigner(integration);
      const fbNote = note ? note : 'DOT tx from @kilnfi/sdk';
      const fbSignatures = await fbSigner.signWithFB(payload, this.testnet ? 'WND' : 'DOT', fbNote);
      const signature = `0x00${fbSignatures.signedMessages![0].signature.fullSig}`;

      const { data } = await api.post<DotSignedTx>(
        `/v1/dot/transaction/prepare`,
        {
          unsigned_tx_serialized: tx.data.unsigned_tx_serialized,
          signature: signature,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Broadcast signed transaction
   * @param signedTx
   */
  async broadcast(signedTx: DotSignedTx): Promise<DotTxHash> {
    try {
      const { data } = await api.post<DotTxHash>(
        `/v1/dot/transaction/broadcast`,
        {
          tx_serialized: signedTx.data.signed_tx_serialized,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Get transaction status
   * @param txHash transaction hash
   */
  async getTxStatus(
    txHash: string,
  ): Promise<DotTxStatus> {
    try {
      const { data } = await api.get<DotTxStatus>(`/v1/dot/transaction/status?tx_hash=${txHash}`);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }
}
