export class UtilsService {
  constructor() {}

  /**
   * Check if a deposit object has valid keys and values types
   * @param obj deposit object to validate
   * @returns true if object is a correct deposit
   */
  static isDepositValid(obj: { [k: string]: any }): boolean {
    const reference: { [k: string]: 'string' | 'number' } = {
      pubkey: 'string',
      withdrawal_credentials: 'string',
      amount: 'number',
      signature: 'string',
      deposit_message_root: 'string',
      deposit_data_root: 'string',
      fork_version: 'string',
      eth2_network_name: 'string',
    };
    for (const key of Object.keys(reference)) {
      if (!obj[key] || typeof obj[key] !== reference[key]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if a keystore object has valid keys and values types
   * @param obj keystore object to validate
   * @returns true if object is a correct keystore
   */
  static isKeystoreValid(obj: { [k: string]: any }): boolean {
    const reference: { [k: string]: 'string' | 'number' | 'object' } = {
      version: 'number',
      uuid: 'string',
      path: 'string',
      pubkey: 'string',
      crypto: 'object',
    };
    for (const key of Object.keys(reference)) {
      if (!obj[key] || typeof obj[key] !== reference[key]) {
        return false;
      }
    }
    return true;
  }
}
