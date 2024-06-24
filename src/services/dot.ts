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

  /**
   * Convert DOT token to planck
   * @param amount amount in DOT
   */
  mainToPlanck(amount: string): string {
    return parseUnits(amount, 10).toString();
  }
}
