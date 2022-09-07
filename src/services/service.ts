import { Integrations } from "../types/integrations";
import { FbSigner } from "../integrations/fb_signer";
import { ServiceProps } from "../types/service";
import { FireblocksSDK } from "fireblocks-sdk";

export class Service {
  protected testnet: boolean;
  protected integrations: Integrations | undefined;
  protected fbSigner: FbSigner | undefined;
  protected fbSdk: FireblocksSDK | undefined;

  constructor({ testnet, integrations }: ServiceProps) {
    this.testnet = testnet === true;
    this.integrations = integrations;

    // Fireblocks integration
    const fireblocksIntegration = integrations?.find(integration => integration.provider === 'fireblocks');
    if (fireblocksIntegration) {
      this.fbSdk = new FireblocksSDK(fireblocksIntegration.fireblocksSecretKey, fireblocksIntegration.fireblocksApiKey);
      this.fbSigner = new FbSigner(this.fbSdk, fireblocksIntegration.vaultAccountId);
    }
  }

}