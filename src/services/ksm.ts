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

  /**
   * Convert KSM token to planck
   * @param amount amount in KSM
   */
  mainToPlanck(amount: string): string {
    return parseUnits(amount, 12).toString();
  }
}
