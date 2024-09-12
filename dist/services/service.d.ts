import type { FireblocksIntegration } from "../types/integrations";
import { FbSigner } from "../integrations/fb_signer";
import type { ServiceProps } from "../types/service";
import { FireblocksSDK } from "fireblocks-sdk";
export declare class Service {
    protected testnet: boolean;
    constructor({ testnet }: ServiceProps);
    /**
     * Retrieve a fireblocks SDK from a Fireblocks integration
     * @param integration
     */
    getFbSdk(integration: FireblocksIntegration): FireblocksSDK;
    /**
     * Retrieve a fireblocks signer from a Fireblocks integration
     * @param integration
     */
    getFbSigner(integration: FireblocksIntegration): FbSigner;
}
