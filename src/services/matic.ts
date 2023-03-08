import api from '../api';
import { Service } from './service';
import { utils } from 'ethers';
import { ServiceProps } from '../types/service';
import {
  MaticSignedTx, MaticStakeTxOptions,
  MaticTx,
  MaticTxHash,
  MaticTxStatus,
} from '../types/matic';

export class MaticService extends Service {
  constructor({ testnet, integrations }: ServiceProps) {
    super({ testnet, integrations });
  }

  /**
   * Craft an approve transaction
   * @param walletAddress wallet address signing the transaction
   * @param contractAddressToApprove contract address that you allow to spend the token
   * @param amountWei how many tokens to approve the spending, if not specified an infinite amount will be approved
   */
  async craftApproveTx(
    walletAddress: string,
    contractAddressToApprove: string,
    amountWei?: string,
  ): Promise<MaticTx> {
    try {
      const { data } = await api.post<MaticTx>(
        `/v1/matic/transaction/approve`,
        {
          wallet: walletAddress,
          contract: contractAddressToApprove,
          amount_wei: amountWei,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft a buyVoucher transaction to Kiln's ValidatorShare proxy contract or the one provided
   * It also links the stake to the account id given
   * @param accountId id of the kiln account to use for the stake transaction
   * @param walletAddress withdrawal creds /!\ losing it => losing the ability to withdraw
   * @param amountWei how many tokens to stake in WEI
   * @param options options to pass a custom ValidatorShare proxy contract address
   */
  async craftBuyVoucherTx(
    accountId: string,
    walletAddress: string,
    amountWei: string,
    options?: MaticStakeTxOptions,
  ): Promise<MaticTx> {
    try {
      const { data } = await api.post<MaticTx>(
        `/v1/matic/transaction/buy-voucher`,
        {
          account_id: accountId,
          wallet: walletAddress,
          amount_wei: amountWei,
          options: options,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft a sellVoucher transaction to Kiln's ValidatorShare proxy contract or the one provided
   * Note there that your tokens will be unbonding and locked for 21 days after this transaction
   * @param walletAddress address delegating
   * @param amountWei how many tokens to stake in WEI
   * @param options options to pass a custom ValidatorShare proxy contract address
   */
  async craftSellVoucherTx(
    walletAddress: string,
    amountWei: string,
    options?: MaticStakeTxOptions,
  ): Promise<MaticTx> {
    try {
      const { data } = await api.post<MaticTx>(
        `/v1/matic/transaction/sell-voucher`,
        {
          wallet: walletAddress,
          amount_wei: amountWei,
          options: options,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft an unstakeClaimTokens transaction to Kiln's ValidatorShare proxy contract or the one provided
   * Note that your tokens must be unbonded before you can claim them
   * @param walletAddress address delegating
   * @param options options to pass a custom ValidatorShare proxy contract address
   */
  async craftUnstakeClaimTokensTx(
    walletAddress: string,
    options?: MaticStakeTxOptions,
  ): Promise<MaticTx> {
    try {
      const { data } = await api.post<MaticTx>(
        `/v1/matic/transaction/unstake-claim-tokens`,
        {
          wallet: walletAddress,
          options: options,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft an withdrawRewards transaction to Kiln's ValidatorShare proxy contract or the one provided
   * All rewards earned are transferred to the delegator's wallet
   * @param walletAddress address delegating
   * @param options options to pass a custom ValidatorShare proxy contract address
   */
  async craftWithdrawRewardsTx(
    walletAddress: string,
    options?: MaticStakeTxOptions,
  ): Promise<MaticTx> {
    try {
      const { data } = await api.post<MaticTx>(
        `/v1/matic/transaction/withdraw-rewards`,
        {
          wallet: walletAddress,
          options: options,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft an withdrawRewards transaction to Kiln's ValidatorShare proxy contract or the one provided
   * All rewards earned are then re-delegated
   * @param walletAddress address delegating
   * @param options options to pass a custom ValidatorShare proxy contract address
   */
  async craftRestakeRewardsTx(
    walletAddress: string,
    options?: MaticStakeTxOptions,
  ): Promise<MaticTx> {
    try {
      const { data } = await api.post<MaticTx>(
        `/v1/matic/transaction/restake-rewards`,
        {
          wallet: walletAddress,
          options: options,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Sign transaction with given integration
   * @param integration
   * @param tx
   * @param note
   */
  async sign(integration: string, tx: MaticTx, note?: string): Promise<MaticSignedTx> {
    if (!this.integrations?.find(int => int.name === integration)) {
      throw new Error(`Unknown integration, please provide an integration name that matches one of the integrations provided in the config.`);
    }

    if (!this.fbSigner) {
      throw new Error(`Could not retrieve fireblocks signer.`);
    }


    try {
      const payload = {
        rawMessageData: {
          messages: [
            {
              'content': tx.data.unsigned_tx_hash,
            },
          ],
        },
      };

      const signatures = await this.fbSigner.signWithFB(payload, this.testnet ? 'ETH_TEST3' : 'ETH', note);
      const { data } = await api.post<MaticSignedTx>(
        `/v1/matic/transaction/prepare`,
        {
          unsigned_tx_serialized: tx.data.unsigned_tx_serialized,
          r: `0x${signatures?.signedMessages?.[0].signature.r}`,
          s: `0x${signatures?.signedMessages?.[0].signature.s}`,
          v: signatures?.signedMessages?.[0].signature.v ?? 0,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }


  /**
   * Broadcast transaction to the network
   * @param signedTx
   */
  async broadcast(signedTx: MaticSignedTx): Promise<MaticTxHash> {
    try {
      const { data } = await api.post<MaticTxHash>(
        `/v1/matic/transaction/broadcast`,
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
   * @param txHash: transaction hash
   */
  async getTxStatus(txHash: string): Promise<MaticTxStatus> {
    try {
      const { data } = await api.get<MaticTxStatus>(
        `/v1/matic/transaction/status?tx_hash=${txHash}`);
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Utility function to convert MATIC to WEI
   * @param matic
   */
  maticToWei(matic: string): string {
    return utils.parseEther(matic).toString();
  }
}
