export class SolService {
  constructor() {}

  /**
   * Starts the deployment of an Ethereum validator
   * @param keystoreB64 keystore of the validator, encoded in base64
   * @param password password of the keystore
   * @returns uploaded validator
   */
  async deployValidator(keystoreB64: string, password: string): Promise<Eth> {
    const { data } = await api.post<Validator>('/v0alpha/validators', {
      keystore: keystoreB64,
      password,
    });
    return data;
  }
}
