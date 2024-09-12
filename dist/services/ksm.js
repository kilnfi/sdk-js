"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KsmService = void 0;
const viem_1 = require("viem");
const substrate_1 = require("./substrate");
/**
 * Staking docs: https://polkadot.js.org/docs/substrate/extrinsics#staking
 * Nomination pools docs: https://polkadot.js.org/docs/substrate/extrinsics#nominationpools
 */
class KsmService extends substrate_1.SubstrateService {
    constructor(props) {
        super(props, "KSM");
    }
    mainToPlanck(amount) {
        return this.ksmToPlanck(amount);
    }
    /**
     * Convert KSM to planck
     * @param amountKsm amount in planck
     */
    ksmToPlanck(amountKsm) {
        return (0, viem_1.parseUnits)(amountKsm, 12).toString();
    }
}
exports.KsmService = KsmService;
