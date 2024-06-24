import { parseUnits } from "viem";
import { ServiceProps } from "../types/service";
import { SubstrateService } from "./substrate";

/**
 * Staking docs: https://polkadot.js.org/docs/substrate/extrinsics#staking
 * Nomination pools docs: https://polkadot.js.org/docs/substrate/extrinsics#nominationpools
 */
export class DotService extends SubstrateService {
  constructor(props: ServiceProps) {
    super(props, "DOT");
  }

  mainToPlanck(amount: string): string {
    return this.dotToPlanck(amount);
  }

  /**
   * Convert DOT to planck
   * @param amountDot amount in planck
   */
  dotToPlanck(amountDot: string): string {
    return parseUnits(amountDot, 10).toString();
  }
}
