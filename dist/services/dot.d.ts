import { ServiceProps } from "../types/service";
import { SubstrateService } from "./substrate";
/**
 * Staking docs: https://polkadot.js.org/docs/substrate/extrinsics#staking
 * Nomination pools docs: https://polkadot.js.org/docs/substrate/extrinsics#nominationpools
 */
export declare class DotService extends SubstrateService {
    constructor(props: ServiceProps);
    mainToPlanck(amount: string): string;
    /**
     * Convert DOT to planck
     * @param amountDot amount in planck
     */
    dotToPlanck(amountDot: string): string;
}
