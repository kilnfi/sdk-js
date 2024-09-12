import { Integration } from "../types/integrations";
import { Service } from "./service";
import type { AssetTypeResponse, PublicKeyResponse } from "fireblocks-sdk";
export declare class FireblocksService extends Service {
    /**
     * Get fireblocks wallet pubkey compressed
     * @param integration
     * @param assetId
     */
    getPubkey(integration: Integration, assetId: string): Promise<PublicKeyResponse>;
    getAssets(integration: Integration): Promise<AssetTypeResponse[]>;
}
