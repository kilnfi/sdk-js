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
    return this.mainToPlanck(amount);
  }

  /**
   * Convert DOT planck to main
   * @param amountDot amount in planck
   */
  planckToMain(amountDot: string): string {
    return parseUnits(amountDot, 10).toString();
  }
}
