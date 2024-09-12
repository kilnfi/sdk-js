"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DotService = void 0;
const viem_1 = require("viem");
const substrate_1 = require("./substrate");
/**
 * Staking docs: https://polkadot.js.org/docs/substrate/extrinsics#staking
 * Nomination pools docs: https://polkadot.js.org/docs/substrate/extrinsics#nominationpools
 */
class DotService extends substrate_1.SubstrateService {
    constructor(props) {
        super(props, "DOT");
    }
    mainToPlanck(amount) {
        return this.dotToPlanck(amount);
    }
    /**
     * Convert DOT to planck
     * @param amountDot amount in planck
     */
    dotToPlanck(amountDot) {
        return (0, viem_1.parseUnits)(amountDot, 10).toString();
    }
}
exports.DotService = DotService;
