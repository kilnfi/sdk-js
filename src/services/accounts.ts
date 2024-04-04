import { Account, Accounts, InternalAccountsConfig } from "../types/accounts";
import api from "../api";

export class AccountService {
  private testnet: boolean;

  constructor({ testnet = false }: InternalAccountsConfig) {
    this.testnet = testnet;
  }

  /**
   * Get all accounts
   */
  async getAll(): Promise<Account[]> {
    const { data } = await api.get<Accounts>("/v1/accounts");
    return data.accounts;
  }

  /**
   * Get an account by its id
   * @param accountId
   */
  async get(accountId: string): Promise<Account> {
    const { data } = await api.get<Account>(`/v1/accounts/${accountId}`);
    return data;
  }

  /**
   * Create an account with given name and description. The account name must be unique.
   * @param name
   * @param description
   */
  async create(name: string, description?: string): Promise<Account> {
    const { data } = await api.post<Account>("/v1/accounts", {
      name,
      description: description ?? "",
    });
    return data;
  }

  /**
   * Update given account
   * @param accountId
   * @param name
   * @param description
   */
  async update(accountId: string, name: string, description?: string): Promise<Account> {
    const { data } = await api.put<Account>(`/v1/accounts/${accountId}`, {
      name,
      description: description ?? "",
    });
    return data;
  }
}
