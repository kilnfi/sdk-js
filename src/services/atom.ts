import { Service } from './service';

import { AtomSignedTx, AtomTx, AtomTxHash, AtomTxStatus } from '../types/atom';
import { ServiceProps } from '../types/service';
import { Integration } from '../types/integrations';
import api from '../api';

export class AtomService extends Service {

  constructor({ testnet }: ServiceProps) {
    super({ testnet });
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
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAddress validator address to delegate to
   * @param amountAtom how many tokens to stake in ATOM
   */
  async craftStakeTx(
    accountId: string,
    pubkey: string,
    validatorAddress: string,
    amountAtom: number,
  ): Promise<AtomTx> {
    try {
      const { data } = await api.post<AtomTx>(
        `/v1/atom/transaction/stake`,
        {
          account_id: accountId,
          pubkey: pubkey,
          validator: validatorAddress,
          amount_uatom: this.atomToUatom(amountAtom.toString()),
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft atom withdraw rewards transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAddress validator address to which the delegation has been made
   */
  async craftWithdrawRewardsTx(
    pubkey: string,
    validatorAddress: string,
  ): Promise<AtomTx> {
    try {
      const { data } = await api.post<AtomTx>(
        `/v1/atom/transaction/withdraw-rewards`,
        {
          pubkey: pubkey,
          validator: validatorAddress,
        });
      return data;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Craft atom unstaking transaction
   * @param pubkey wallet pubkey, this is different from the wallet address
   * @param validatorAddress validator address to which the delegation has been made
   * @param amountAtom how many tokens to undelegate in ATOM
   */
  async craftUnstakeTx(
    pubkey: string,
    validatorAddress: string,
    amountAtom?: number,
  ): Promise<AtomTx> {
    try {
      const { data } = await api.post<AtomTx>(
        `/v1/atom/transaction/unstake`,
        {
          pubkey: pubkey,
          validator: validatorAddress,
          amount_uatom: amountAtom ? this.atomToUatom(amountAtom.toString()) : undefined,
        });
      return data;
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
    const payload = {
      rawMessageData: {
        messages: [
          {
            'content': tx.data.unsigned_tx_hash,
          },
        ],
      },
    };
    const fbNote = note ? note : 'ATOM tx from @kilnfi/sdk';
    const signer = this.getFbSigner(integration);
    const signedTx = await signer.signWithFB(payload, this.testnet ? 'ATOM_COS_TEST' : 'ATOM_COS', fbNote);
    const signature: string = signedTx.signedMessages![0].signature.fullSig;
    const { data } = await api.post<AtomSignedTx>(
      `/v1/atom/transaction/prepare`,
      {
        pubkey: tx.data.pubkey,
        tx_body: tx.data.tx_body,
        tx_auth_info: tx.data.tx_auth_info,
        signature: signature,
      });
    return data;
  }


  /**
   * Broadcast transaction to the network
   * @param signedTx
   */
  async broadcast(signedTx: AtomSignedTx): Promise<AtomTxHash> {
    try {
      const { data } = await api.post<AtomTxHash>(
        `/v1/atom/transaction/broadcast`,
        {
          tx_serialized: signedTx.data.signed_tx_serialized,
        });
      return data;
    } catch (e: any) {
      throw new Error(e);
    }
  }

  /**
   * Get transaction status
   * @param txHash
   */
  async getTxStatus(txHash: string): Promise<AtomTxStatus> {
    try {
      const { data } = await api.get<AtomTxStatus>(
        `/v1/atom/transaction/status?tx_hash=${txHash}`);
      return data;
    } catch (e: any) {
      throw new Error(e);
    }
  }
}
