import { Integrations } from "../types/integrations";
import { FbSigner } from "../integrations/fb_signer";
import { ServiceProps } from "../types/service";
import { FireblocksSDK } from "fireblocks-sdk";

export class Service {
  protected testnet: boolean;
  protected integrations: Integrations | undefined;
  protected fbSigner: FbSigner | undefined;

  constructor({ testnet, integrations }: ServiceProps) {
    this.testnet = testnet === true;
    this.integrations = integrations;

    // Fireblocks integration
    const fireblocksIntegration = integrations?.find(integration => integration.provider === 'fireblocks');
    if (fireblocksIntegration) {
      const fireblocks = new FireblocksSDK(fireblocksIntegration.fireblocksSecretKeyPath, fireblocksIntegration.fireblocksApiKey);
      this.fbSigner = new FbSigner(fireblocks, fireblocksIntegration.vaultAccountId);
    }
  }

}