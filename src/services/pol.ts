import api from "../api";
import { Service } from "./service";
import { utils } from "ethers";
import { ServiceProps } from "../types/service";
import { PolDecodedTx, PolSignedTx, PolTx, PolTxHash, PolTxStatus } from "../types/pol";
import { Integration } from "../types/integrations";
import { TransactionResponse } from "fireblocks-sdk";

export class PolService extends Service {
  constructor({ testnet }: ServiceProps) {
    super({ testnet });
  }

  /**
   * Craft an approve transaction to the POL token contract allowing the contract given to spend the amount given
   * If no amount is provided, an infinite amount will be approved
   * @param walletAddress wallet address signing the transaction
   * @param contractAddressToApprove contract address that you allow to spend the token
   * @param amountPol how many tokens to approve the spending, if not specified an infinite amount will be approved
   */
  async craftApproveTx(walletAddress: string, contractAddressToApprove: string, amountPol?: number): Promise<PolTx> {
    const { data } = await api.post<PolTx>(`/v1/pol/transaction/approve`, {
      wallet: walletAddress,
      contract: contractAddressToApprove,
      amount_wei: amountPol ? this.polToWei(amountPol.toString()) : undefined,
    });
    return data;
  }

  /**
   * Craft a buyVoucher transaction to a ValidatorShare proxy contract
   * It also links the stake to the account id given
   * @param accountId id of the kiln account to use for the stake transaction
   * @param walletAddress withdrawal creds /!\ losing it => losing the ability to withdraw
   * @param validatorShareProxyAddress ValidatorShare proxy contract address of the validator
   * @param amountPol how many tokens to stake in POL
   */
  async craftBuyVoucherTx(
    accountId: string,
    walletAddress: string,
    validatorShareProxyAddress: string,
    amountPol: number,
  ): Promise<PolTx> {
    const { data } = await api.post<PolTx>(`/v1/pol/transaction/buy-voucher`, {
      account_id: accountId,
      wallet: walletAddress,
      amount_wei: this.polToWei(amountPol.toString()),
      validator_share_proxy_address: validatorShareProxyAddress,
    });
    return data;
  }

  /**
   * Craft a sellVoucher transaction to a ValidatorShare proxy contract
   * Note there that your tokens will be unbonding and locked for 21 days after this transaction
   * @param walletAddress address delegating
   * @param validatorShareProxyAddress ValidatorShare proxy contract address of the validator
   * @param amountPol how many tokens to unbond in POL
   */
  async craftSellVoucherTx(
    walletAddress: string,
    validatorShareProxyAddress: string,
    amountPol: number,
  ): Promise<PolTx> {
    const { data } = await api.post<PolTx>(`/v1/pol/transaction/sell-voucher`, {
      wallet: walletAddress,
      amount_wei: this.polToWei(amountPol.toString()),
      validator_share_proxy_address: validatorShareProxyAddress,
    });
    return data;
  }

  /**
   * Craft an unstakeClaimTokens transaction to a ValidatorShare proxy contract
   * Note that your tokens must be unbonded before you can claim them
   * @param walletAddress address delegating
   * @param validatorShareProxyAddress ValidatorShare proxy contract address of the validator
   */
  async craftUnstakeClaimTokensTx(walletAddress: string, validatorShareProxyAddress: string): Promise<PolTx> {
    const { data } = await api.post<PolTx>(`/v1/pol/transaction/unstake-claim-tokens`, {
      wallet: walletAddress,
      validator_share_proxy_address: validatorShareProxyAddress,
    });
    return data;
  }

  /**
   * Craft an withdrawRewards transaction to a ValidatorShare proxy contract
   * All rewards earned are transferred to the delegator's wallet
   * @param walletAddress address delegating
   * @param validatorShareProxyAddress ValidatorShare proxy contract address of the validator
   */
  async craftWithdrawRewardsTx(walletAddress: string, validatorShareProxyAddress: string): Promise<PolTx> {
    const { data } = await api.post<PolTx>(`/v1/pol/transaction/withdraw-rewards`, {
      wallet: walletAddress,
      validator_share_proxy_address: validatorShareProxyAddress,
    });
    return data;
  }

  /**
   * Craft an withdrawRewards transaction to a ValidatorShare proxy contract
   * All rewards earned are then re-delegated
   * @param walletAddress address delegating
   * @param validatorShareProxyAddress ValidatorShare proxy contract address of the validator
   */
  async craftRestakeRewardsTx(walletAddress: string, validatorShareProxyAddress: string): Promise<PolTx> {
    const { data } = await api.post<PolTx>(`/v1/pol/transaction/restake-rewards`, {
      wallet: walletAddress,
      validator_share_proxy_address: validatorShareProxyAddress,
    });
    return data;
  }

  /**
   * Sign transaction with given integration
   * @param integration custody solution to sign with
   * @param tx raw transaction
   * @param note note to identify the transaction in your custody solution
   */
  async sign(integration: Integration, tx: PolTx, note?: string): Promise<PolSignedTx> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.data.unsigned_tx_hash,
            preHash: {
              content: tx.data.unsigned_tx_serialized,
              hashAlgorithm: "KECCAK256",
            },
          },
        ],
      },
    };

    const fbSigner = this.getFbSigner(integration);
    const fbNote = note ? note : "POL tx from @kilnfi/sdk";
    const fbTx = await fbSigner.sign(payload, this.testnet ? "ETH_TEST5" : "ETH", fbNote);
    const { data } = await api.post<PolSignedTx>(`/v1/pol/transaction/prepare`, {
      unsigned_tx_serialized: tx.data.unsigned_tx_serialized,
      r: `0x${fbTx?.signedMessages?.[0].signature.r}`,
      s: `0x${fbTx?.signedMessages?.[0].signature.s}`,
      v: fbTx?.signedMessages?.[0].signature.v ?? 0,
    });
    data.data.fireblocks_tx = fbTx;
    return data;
  }

  /**
   * Sign transaction with given integration
   * @param integration custody solution to sign with
   * @param tx raw transaction
   * @param note note to identify the transaction in your custody solution
   */
  async signAndBroadcast(integration: Integration, tx: PolTx, note?: string): Promise<TransactionResponse> {
    if (!integration.fireblocksDestinationId) {
      throw new Error("Fireblocks destination id is missing in integration");
    }

    const payload = {
      contractCallData: tx.data.contract_call_data,
    };

    const fbSigner = this.getFbSigner(integration);
    const fbNote = note ? note : "POL tx from @kilnfi/sdk";
    const assetId = this.testnet ? "ETH_TEST5" : "ETH";
    return await fbSigner.signAndBroadcastWith(
      payload,
      assetId,
      tx,
      integration.fireblocksDestinationId,
      false,
      fbNote,
    );
  }

  /**
   * Broadcast transaction to the network
   * @param signedTx
   */
  async broadcast(signedTx: PolSignedTx): Promise<PolTxHash> {
    const { data } = await api.post<PolTxHash>(`/v1/pol/transaction/broadcast`, {
      tx_serialized: signedTx.data.signed_tx_serialized,
    });
    return data;
  }

  /**
   * Get transaction status
   * @param txHash transaction hash
   */
  async getTxStatus(txHash: string): Promise<PolTxStatus> {
    const { data } = await api.get<PolTxStatus>(`/v1/pol/transaction/status?tx_hash=${txHash}`);
    return data;
  }

  /**
   * Decode transaction
   * @param txSerialized transaction serialized
   */
  async decodeTx(txSerialized: string): Promise<PolDecodedTx> {
    const { data } = await api.get<PolDecodedTx>(`/v1/pol/transaction/decode?tx_serialized=${txSerialized}`);
    return data;
  }

  /**
   * Convert POL to WEI
   * @param pol
   */
  polToWei(pol: string): string {
    return utils.parseEther(pol).toString();
  }
}
