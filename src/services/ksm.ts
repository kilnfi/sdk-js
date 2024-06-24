import { parseUnits } from "viem";
import { ServiceProps } from "../types/service";
import { SubstrateService } from "./substrate";

/**
 * Staking docs: https://polkadot.js.org/docs/substrate/extrinsics#staking
 * Nomination pools docs: https://polkadot.js.org/docs/substrate/extrinsics#nominationpools
 */
export class KsmService extends SubstrateService {
  constructor(props: ServiceProps) {
    super(props, "KSM");
  }


  mainToPlanck(amount: string): string {
    return this.mainToPlanck(amount);
  }

  /**
   * Convert KSM planck to main
   * @param amountKsm amount in planck
   */
  planckToMain(amountKsm: string): string {
    return parseUnits(amountKsm, 12).toString();
}
