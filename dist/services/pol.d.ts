import { Service } from "./service";
import { ServiceProps } from "../types/service";
import { PolDecodedTx, PolSignedTx, PolTx, PolTxHash, PolTxStatus } from "../types/pol";
import { Integration } from "../types/integrations";
import { TransactionResponse } from "fireblocks-sdk";
export declare class PolService extends Service {
    constructor({ testnet }: ServiceProps);
    /**
     * Craft an approve transaction to the POL token contract allowing the contract given to spend the amount given
     * If no amount is provided, an infinite amount will be approved
     * @param walletAddress wallet address signing the transaction
     * @param contractAddressToApprove contract address that you allow to spend the token
     * @param amountPol how many tokens to approve the spending, if not specified an infinite amount will be approved
     */
    craftApproveTx(walletAddress: string, contractAddressToApprove: string, amountPol?: number): Promise<PolTx>;
    /**
     * Craft a buyVoucher transaction to a ValidatorShare proxy contract
     * It also links the stake to the account id given
     * @param accountId id of the kiln account to use for the stake transaction
     * @param walletAddress withdrawal creds /!\ losing it => losing the ability to withdraw
     * @param validatorShareProxyAddress ValidatorShare proxy contract address of the validator
     * @param amountPol how many tokens to stake in POL
     */
    craftBuyVoucherTx(accountId: string, walletAddress: string, validatorShareProxyAddress: string, amountPol: number): Promise<PolTx>;
    /**
     * Craft a sellVoucher transaction to a ValidatorShare proxy contract
     * Note there that your tokens will be unbonding and locked for 21 days after this transaction
     * @param walletAddress address delegating
     * @param validatorShareProxyAddress ValidatorShare proxy contract address of the validator
     * @param amountPol how many tokens to unbond in POL
     */
    craftSellVoucherTx(walletAddress: string, validatorShareProxyAddress: string, amountPol: number): Promise<PolTx>;
    /**
     * Craft an unstakeClaimTokens transaction to a ValidatorShare proxy contract
     * Note that your tokens must be unbonded before you can claim them
     * @param walletAddress address delegating
     * @param validatorShareProxyAddress ValidatorShare proxy contract address of the validator
     */
    craftUnstakeClaimTokensTx(walletAddress: string, validatorShareProxyAddress: string): Promise<PolTx>;
    /**
     * Craft an withdrawRewards transaction to a ValidatorShare proxy contract
     * All rewards earned are transferred to the delegator's wallet
     * @param walletAddress address delegating
     * @param validatorShareProxyAddress ValidatorShare proxy contract address of the validator
     */
    craftWithdrawRewardsTx(walletAddress: string, validatorShareProxyAddress: string): Promise<PolTx>;
    /**
     * Craft an withdrawRewards transaction to a ValidatorShare proxy contract
     * All rewards earned are then re-delegated
     * @param walletAddress address delegating
     * @param validatorShareProxyAddress ValidatorShare proxy contract address of the validator
     */
    craftRestakeRewardsTx(walletAddress: string, validatorShareProxyAddress: string): Promise<PolTx>;
    /**
     * Sign transaction with given integration
     * @param integration custody solution to sign with
     * @param tx raw transaction
     * @param note note to identify the transaction in your custody solution
     */
    sign(integration: Integration, tx: PolTx, note?: string): Promise<PolSignedTx>;
    /**
     * Sign transaction with given integration
     * @param integration custody solution to sign with
     * @param tx raw transaction
     * @param note note to identify the transaction in your custody solution
     */
    signAndBroadcast(integration: Integration, tx: PolTx, note?: string): Promise<TransactionResponse>;
    /**
     * Broadcast transaction to the network
     * @param signedTx
     */
    broadcast(signedTx: PolSignedTx): Promise<PolTxHash>;
    /**
     * Get transaction status
     * @param txHash transaction hash
     */
    getTxStatus(txHash: string): Promise<PolTxStatus>;
    /**
     * Decode transaction
     * @param txSerialized transaction serialized
     */
    decodeTx(txSerialized: string): Promise<PolDecodedTx>;
    /**
     * Convert POL to WEI
     * @param pol
     */
    polToWei(pol: string): string;
}
