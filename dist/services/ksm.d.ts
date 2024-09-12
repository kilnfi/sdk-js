import { ServiceProps } from "../types/service";
import { SubstrateService } from "./substrate";
/**
 * Staking docs: https://polkadot.js.org/docs/substrate/extrinsics#staking
 * Nomination pools docs: https://polkadot.js.org/docs/substrate/extrinsics#nominationpools
 */
export declare class KsmService extends SubstrateService {
    constructor(props: ServiceProps);
    mainToPlanck(amount: string): string;
    /**
     * Convert KSM to planck
     * @param amountKsm amount in planck
     */
    ksmToPlanck(amountKsm: string): string;
}
