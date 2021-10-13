import { api } from "../api";
import { Validator, ValidatorData } from "../models";

export class ValidatorsService {
  constructor() {}

  /**
   * Starts the deployment of an Ethereum validator
   * @param keystoreB64 keystore of the validator, encoded in base64
   * @param password password of the keystore
   * @returns uploaded validator
   */
  async deployValidator(
    keystoreB64: string,
    password: string
  ): Promise<Validator> {
    const { data } = await api.post<Validator>("/v0alpha/validators", {
      keystore: keystoreB64,
      password,
    });
    return data;
  }

  /**
   * Retrieve data from a deployed Ethereum validator
   * @param publicKey public key of the validator
   * @returns validator data
   */
  async getValidatorData(publicKey: string): Promise<ValidatorData> {
    const { data } = await api.get<ValidatorData>(
      `/v0alpha/validators/${publicKey}`
    );
    return data;
  }

  /**
   * Retrieve data of all Ethereum validators deployed with the user account
   * @returns validators data
   */
  async getValidatorsData(): Promise<ValidatorData[]> {
    const { data } = await api.get<ValidatorData[]>("/v0alpha/validators");
    return data;
  }
}
