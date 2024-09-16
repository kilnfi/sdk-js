import { FireblocksIntegration } from "../types/integrations";
import { FbSigner } from "../integrations/fb_signer";
import { FireblocksSDK } from "fireblocks-sdk";

export class Service {
  /**
   * Retrieve a fireblocks SDK from a Fireblocks integration
   * @param integration
   */
  getFbSdk(integration: FireblocksIntegration): FireblocksSDK {
    try {
      return new FireblocksSDK(integration.fireblocksSecretKey, integration.fireblocksApiKey);
    } catch (err: any) {
      throw new Error("getFbSdk: " + err);
    }
  }

  /**
   * Retrieve a fireblocks signer from a Fireblocks integration
   * @param integration
   */
  getFbSigner(integration: FireblocksIntegration): FbSigner {
    try {
      const fbSdk = this.getFbSdk(integration);
      return new FbSigner(fbSdk, integration.vaultId);
    } catch (err: any) {
      throw new Error("getFbSigner: " + err);
    }
  }
}
