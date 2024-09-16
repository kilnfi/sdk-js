import { FireblocksIntegration, Integration } from "../types/integrations";
import { AssetTypeResponse, FireblocksSDK, PublicKeyResponse } from "fireblocks-sdk";
import { FbSigner } from "../integrations/fb_signer";
import { Client } from "openapi-fetch";
import { components, paths } from "../../openapi/schema";
import { AdaSignedMessage } from "../types/ada";

export class FireblocksService {
  client: Client<paths>;

  constructor(client: Client<paths>) {
    this.client = client;
  }

  /**
   * Retrieve a fireblocks SDK from a Fireblocks integration
   * @param integration
   */
  getFbSdk(integration: FireblocksIntegration): FireblocksSDK {
    return new FireblocksSDK(integration.fireblocksSecretKey, integration.fireblocksApiKey);
  }

  /**
   * Retrieve a fireblocks signer from a Fireblocks integration
   * @param integration
   */
  getFbSigner(integration: FireblocksIntegration): FbSigner {
    const fbSdk = this.getFbSdk(integration);
    return new FbSigner(fbSdk, integration.vaultId);
  }
  /**
   * Get fireblocks wallet pubkey compressed
   * @param integration
   * @param assetId
   */
  async getPubkey(integration: Integration, assetId: string): Promise<PublicKeyResponse> {
    const fbSdk = this.getFbSdk(integration);
    const data = await fbSdk.getPublicKeyInfoForVaultAccount({
      assetId: assetId,
      vaultAccountId: integration.vaultId,
      change: 0,
      addressIndex: 0,
      compressed: true,
    });
    return data;
  }

  /**
   * List Fireblocks supported assets
   * @param integration
   */
  async getAssets(integration: Integration): Promise<AssetTypeResponse[]> {
    const fbSdk = this.getFbSdk(integration);
    return await fbSdk.getSupportedAssets();
  }

  /**
   * Sign a Solana transaction on Fireblocks
   * @param integration
   * @param tx
   * @param assetId
   * @param note
   */
  async signSolTx(
    integration: Integration,
    tx: components["schemas"]["SOLStakeTx"],
    assetId: "SOL_TEST" | "SOL",
    note?: string,
  ) {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
          },
        ],
      },
    };

    const fbSigner = this.getFbSigner(integration);
    const fbNote = note ? note : "SOL tx from @kilnfi/sdk";
    const fbTx = await fbSigner.sign(payload, assetId, fbNote);

    const signatures = fbTx.signedMessages
      ?.filter((signedMessage) => signedMessage.derivationPath[3] === 0)
      .map((signedMessage) => signedMessage.signature.fullSig);

    const preparedTx = await this.client.POST("/v1/sol/transaction/prepare", {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        signatures: signatures,
      },
    });

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a Cardano transaction on Fireblocks
   * @param integration
   * @param tx
   * @param note
   */
  async signAdaTx(integration: Integration, tx: components["schemas"]["ADAUnsignedTx"], note?: string) {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
          },
          {
            content: tx.unsigned_tx_hash,
            bip44change: 2,
          },
        ],
      },
      inputsSelection: {
        inputsToSpend: tx.inputs,
      },
    };

    const fbSigner = this.getFbSigner(integration);
    const fbNote = note ? note : "ADA tx from @kilnfi/sdk";
    const fbTx = await fbSigner.sign(payload, "ADA", fbNote);

    const signedMessages = fbTx.signedMessages.map((message) => {
      return {
        pubkey: message.publicKey,
        signature: message.signature.fullSig,
      };
    });

    const preparedTx = await this.client.POST("/v1/ada/transaction/prepare", {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        signed_messages: signedMessages,
      },
    });

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }
}
