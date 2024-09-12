"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Service = void 0;
const fb_signer_1 = require("../integrations/fb_signer");
const fireblocks_sdk_1 = require("fireblocks-sdk");
class Service {
    constructor({ testnet }) {
        this.testnet = testnet === true;
    }
    /**
     * Retrieve a fireblocks SDK from a Fireblocks integration
     * @param integration
     */
    getFbSdk(integration) {
        try {
            return new fireblocks_sdk_1.FireblocksSDK(integration.fireblocksSecretKey, integration.fireblocksApiKey);
        }
        catch (err) {
            throw new Error("getFbSdk: " + err);
        }
    }
    /**
     * Retrieve a fireblocks signer from a Fireblocks integration
     * @param integration
     */
    getFbSigner(integration) {
        try {
            const fbSdk = this.getFbSdk(integration);
            return new fb_signer_1.FbSigner(fbSdk, integration.vaultId);
        }
        catch (err) {
            throw new Error("getFbSigner: " + err);
        }
    }
}
exports.Service = Service;
