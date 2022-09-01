import { FireblocksSDK, PeerType, TransactionOperation } from "fireblocks-sdk";
import {
  AccountData,
  makeSignBytes,
  OfflineDirectSigner,
} from "@cosmjs/proto-signing";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { createHash } from "crypto";
import { encodeSecp256k1Signature } from "@cosmjs/amino";
import { FbSigner } from "./fb_signer";

type AssetId = 'ATOM_COS_TEST' | 'ATOM_COS';

export class AtomFbSigner extends FbSigner implements OfflineDirectSigner {
  protected assetId: AssetId;

  constructor(fireblocks: FireblocksSDK, vaultAccountId: string, assetId: AssetId) {
    super(fireblocks, vaultAccountId);
    this.assetId = assetId;
  };

  async getAccounts(): Promise<AccountData[]> {
    // Get the compressed public key
    const pubkey = await this.fireblocks.getPublicKeyInfoForVaultAccount({
      assetId: this.assetId,
      vaultAccountId: parseInt(this.vaultAccountId),
      compressed: true,
      change: 0,
      addressIndex: 0,
    });

    const address = (await this.fireblocks.getDepositAddresses(this.vaultAccountId, this.assetId))[0].address;

    return [
      {
        address: address,
        pubkey: Uint8Array.from(Buffer.from(pubkey.publicKey, 'hex')),
        algo: 'secp256k1',
      },
    ];
  }

  async signDirect(signerAddress: string, signDoc: SignDoc) {
    const signedBytes = makeSignBytes(signDoc);
    const content = createHash('sha256').update(signedBytes).digest("hex");

    const fbTx = await this.fireblocks.createTransaction({
      operation: TransactionOperation.RAW,
      assetId: this.assetId,
      source: {
        type: PeerType.VAULT_ACCOUNT,
        id: this.vaultAccountId,
      },
      extraParameters: {
        rawMessageData: {
          messages: [
            {
              content: content,
            },
          ],
        },
      },
    });

    let txInfo = await this.waitForTxCompletion(fbTx);
    const pubkey = (await this.getAccounts())[0].pubkey;
    const sig = encodeSecp256k1Signature(pubkey, Uint8Array.from(Buffer.from(txInfo.signedMessages![0].signature.fullSig, 'hex')));

    return {
      signed: signDoc,
      signature: sig,
    };
  }
}

