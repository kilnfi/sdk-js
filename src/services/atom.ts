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
  SigningStargateClient,
  StargateClient,
} from "@cosmjs/stargate";
import { AtomTx } from "../types/atom";
import { NoAccountFound } from "../errors/atom";
import { SignDoc, TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import {
  AccountData,
  DirectSecp256k1HdWallet,
  encodePubkey,
  makeAuthInfoBytes,
  makeSignBytes,
  makeSignDoc,
  Registry,
  TxBodyEncodeObject,
} from "@cosmjs/proto-signing";
import { MsgDelegate } from "cosmjs-types/cosmos/staking/v1beta1/tx";
import { fromBase64, fromHex } from "@cosmjs/encoding";
import { sha256 } from "ethereumjs-util";
import { createHash } from "crypto";
import secp256k1 from "secp256k1";
import crypto_1 from "@cosmjs/crypto";
import { encodeSecp256k1Signature } from "@cosmjs/amino";

const UATOM_TO_ATOM = 1000000;

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
  ): Promise<SignDoc> {
    try {
      const client = await this.getClient();
      const account = await client.getAccount(walletAddress);

      if (!account) {
        throw new NoAccountFound(`No account found on this address: ${walletAddress}`);
      }

      const msg = MsgDelegate.fromPartial({
        delegatorAddress: account.address,
        validatorAddress: 'cosmosvaloper178h4s6at5v9cd8m9n7ew3hg7k9eh0s6wptxpcn',
        amount: coin((amount * UATOM_TO_ATOM).toString(), "uatom"),
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

      const feeAmount = coin(5000, "uatom");
      const fee = {
        amount: [feeAmount],
        gas: '300000',
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
        Number(fee.gas),
      );

      const chainId = this.testnet ? 'theta-testnet-001' : 'cosmoshub-4';

      return makeSignDoc(txBodyBytes, authInfoBytes, chainId, account.accountNumber);
      
      // const p = publicKeyConvert(pubkey.value, true);
      // const body = Uint8Array.from(TxRaw.encode(txBodyBytes).finish())
      // const valid = secp256k1.ecdsaVerify(
      //   signatures[0],
      //   sha256(Buffer.from(txBodyBytes)),
      //   p,
      // );

      // console.log('valid: ', valid);

      // return TxRaw.fromPartial({
      //   bodyBytes: txBodyBytes,
      //   authInfoBytes,
      //   signatures: [],
      // });

    } catch (err: any) {
      throw new Error(err);
    }
  }

  /**
   * Sign transaction with given integration
   * @param integration
   * @param doc
   * @param note
   */
  async sign(integration: string, doc: SignDoc, note?: string): Promise<AtomTx> {
    if (!this.integrations?.find(int => int.name === integration)) {
      throw new InvalidIntegration(`Unknown integration, please provide an integration name that matches one of the integrations provided in the config.`);
    }

    if (!this.fbSigner) {
      throw new InvalidIntegration(`Could not retrieve fireblocks signer.`);
    }

    // const hashedMessage = (0, crypto_1.sha256)(signBytes);
    // const signature = await crypto_1.Secp256k1.createSignature(hashedMessage, this.privkey);
    // const signatureBytes = new Uint8Array([...signature.r(32), ...signature.s(32)]);
    // const stdSignature = (0, amino_1.encodeSecp256k1Signature)(this.pubkey, signatureBytes);

    const signedBytes = makeSignBytes(doc);
    // const message = sha256(Buffer.from(signedBytes)).toString('utf8');
    // const hash = createHash('sha256').update(message, 'utf8').digest();
    const content = createHash('sha256').update(signedBytes).digest("hex");
    const payload = [
      {
        "content": content,
      },
    ];

    const signatures = await this.fbSigner.signWithFB(payload, this.testnet ? 'ATOM_COS_TEST' : 'ATOM_COS', note);
    if (!signatures.signedMessages?.[0].signature.fullSig || !signatures.signedMessages?.[0].signature.r || !signatures.signedMessages?.[0].signature.s) {
      throw new InvalidSignature(`The transaction signatures could not be verified.`);
    }

    const fullSigBytes = fromBase64(signatures.signedMessages?.[0].signature.fullSig).slice(0,64);
    const sigBytes = new Uint8Array([...fromBase64(signatures.signedMessages?.[0].signature.r).slice(0,32), ...fromBase64(signatures.signedMessages?.[0].signature.s).slice(0,32)]);
    const pubkey = fromHex(signatures.signedMessages?.[0].publicKey);
    const stdSignature = encodeSecp256k1Signature(pubkey, fullSigBytes);
    return TxRaw.fromPartial({
      authInfoBytes: doc.authInfoBytes,
      bodyBytes: doc.bodyBytes,
      signatures: [fromBase64(stdSignature.signature)],
    });

    // const valid = secp256k1.ecdsaVerify(
    //   transaction.signatures[0],
    //   transaction.bodyBytes,
    //   fromHex(signatures.signedMessages?.[0].publicKey),
    // );
    //
    // console.log('valid: ', valid);

    // return transaction;
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
