import api from "./api";
import { ValidatorsService } from "./services/validators";

type Network = "prater" | "mainnet";

export class SkillZ {
  validators: ValidatorsService;

  constructor(network: Network, apiToken: string) {
    api.defaults.headers.common.Authorization = `Bearer ${apiToken}`;
    api.defaults.headers.common["Content-Type"] = `application/json`;
    api.defaults.baseURL =
      network === "prater"
        ? "https://prater.api.skillz.io/"
        : "https://api.skillz.io/";

    this.validators = new ValidatorsService();
  }
}
