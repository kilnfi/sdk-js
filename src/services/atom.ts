import { InternalEthereumConfig } from '../types/eth';
import {
  BroadcastError,
  InvalidIntegration,
  InvalidSignature,
} from "../errors/integrations";
import { Service } from "./service";
import {
  coin,
  MsgDelegateEncodeObject,
  StargateClient,
} from "@cosmjs/stargate";
import { AtomTx } from "../types/atom";
import { NoAccountFound } from "../errors/atom";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import {
  encodePubkey,
  makeAuthInfoBytes,
  Registry,
  TxBodyEncodeObject,
} from "@cosmjs/proto-signing";
import { MsgDelegate } from "cosmjs-types/cosmos/staking/v1beta1/tx";
import { fromBase64, fromHex, toHex } from "@cosmjs/encoding";
import keccak256 from "keccak256";
import secp256k1 from "secp256k1";
import { sha256 } from "ethereumjs-util";

export class AtomService extends Service {
  private rpc: string;

  constructor({ testnet, integrations, rpc }: InternalEthereumConfig) {
    super({ testnet, integrations });
    const kilnRpc = this.testnet ? 'https://rpc.sentry-02.theta-testnet.polypore.xyz' : 'https://rpc.cosmos.network';
    this.rpc = rpc ?? kilnRpc;
  }

  private async getClient(): Promise<StargateClient> {
    return await StargateClient.connect(this.rpc);
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
    try {
      const client = await this.getClient();
      const account = await client.getAccount(walletAddress);

      if (!account) {
        throw new NoAccountFound(`No account found on this address: ${walletAddress}`);
      }

      const msg = MsgDelegate.fromPartial({
        delegatorAddress: 'cosmos19c9fdh488vqjclltwp68jm50ydwyh36jqeatev',
        validatorAddress: 'cosmosvaloper178h4s6at5v9cd8m9n7ew3hg7k9eh0s6wptxpcn',
        amount: coin('5000', "uatom"),
      });

      const delegateMsg: MsgDelegateEncodeObject = {
        typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
        value: msg,
      };

      const txBodyFields: TxBodyEncodeObject = {
        typeUrl: '/cosmos.tx.v1beta1.TxBody',
        value: {
          messages: [delegateMsg],
          memo: accountId,
        },
      };

      const feeAmount = coin(5193, "uatom");
      const fee = {
        amount: [feeAmount],
        gas: 300000,
      };

      const pubkey = encodePubkey({
        type: 'tendermint/PubKeySecp256k1',
        value: account.pubkey?.value,
      });

      const registry = new Registry([['/cosmos.staking.v1beta1.MsgDelegate', MsgDelegate]]);
      const txBodyBytes = registry.encode(txBodyFields);
      const authInfoBytes = makeAuthInfoBytes(
        [{ pubkey, sequence: account.sequence }],
        fee.amount,
        fee.gas,
        127,
      );

      return TxRaw.fromPartial({
        bodyBytes: txBodyBytes,
        authInfoBytes,
        signatures: [],
      });

    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Sign transaction with given integration
   * @param integration
   * @param transaction
   * @param note
   */
  async sign(integration: string, transaction: AtomTx, note?: string): Promise<AtomTx> {
    if (!this.integrations?.find(int => int.name === integration)) {
      throw new InvalidIntegration(`Unknown integration, please provide an integration name that matches one of the integrations provided in the config.`);
    }

    if (!this.fbSigner) {
      throw new InvalidIntegration(`Could not retrieve fireblocks signer.`);
    }

    const signedBytes = Uint8Array.from(TxRaw.encode(transaction).finish());
    const txHash = toHex(signedBytes);
    const message = sha256(Buffer.from(signedBytes)).toString('hex');
    const payload = [
      {
        "content": message,
      },
    ];

    const signatures = await this.fbSigner.signWithFB(payload, this.testnet ? 'ATOM_COS_TEST' : 'ATOM_COS', note);
    console.log(signatures.signedMessages?.[0]);
    if (!signatures.signedMessages?.[0].signature.fullSig) {
      throw new InvalidSignature(`The transaction signatures could not be verified.`);
    }
    transaction.signatures = [fromHex(signatures.signedMessages?.[0].signature.fullSig)];

    const valid = secp256k1.ecdsaVerify(
      transaction.signatures[0],
      transaction.bodyBytes,
      fromHex(signatures.signedMessages?.[0].publicKey),
    );

    console.log('valid: ', valid);

    return transaction;
    //
    // if (signedTx.verifySignature()) {
    //   return signedTx;
    // } else {
    //   throw new InvalidSignature(`The transaction signatures could not be verified.`);
    // }
  }


  /**
   * Broadcast transaction to the network
   * @param transaction
   */
  async broadcast(transaction: AtomTx): Promise<string | undefined> {
    try {
      const client = await this.getClient();
      const res = await client.broadcastTx(TxRaw.encode(transaction).finish());
      return res.transactionHash;
    } catch (e: any) {
      throw new BroadcastError(e);
    }
  }
}
