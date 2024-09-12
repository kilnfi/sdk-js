"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FireblocksService = void 0;
const service_1 = require("./service");
class FireblocksService extends service_1.Service {
    /**
     * Get fireblocks wallet pubkey compressed
     * @param integration
     * @param assetId
     */
    getPubkey(integration, assetId) {
        return __awaiter(this, void 0, void 0, function* () {
            const fbSdk = this.getFbSdk(integration);
            const data = yield fbSdk.getPublicKeyInfoForVaultAccount({
                assetId: assetId,
                vaultAccountId: integration.vaultId,
                change: 0,
                addressIndex: 0,
                compressed: true,
            });
            return data;
        });
    }
    getAssets(integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const fbSdk = this.getFbSdk(integration);
            return yield fbSdk.getSupportedAssets();
        });
    }
}
exports.FireblocksService = FireblocksService;
