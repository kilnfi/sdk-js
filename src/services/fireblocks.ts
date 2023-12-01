import { Integration } from "../types/integrations";
import { Service } from "./service";
import { PublicKeyResponse } from "fireblocks-sdk";

export class FireblocksService extends Service {

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
}