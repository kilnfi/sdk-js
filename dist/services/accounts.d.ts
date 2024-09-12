import { Account, InternalAccountsConfig } from "../types/accounts";
export declare class AccountService {
    private testnet;
    constructor({ testnet }: InternalAccountsConfig);
    /**
     * Get all accounts
     */
    getAll(): Promise<Account[]>;
    /**
     * Get an account by its id
     * @param accountId
     */
    get(accountId: string): Promise<Account>;
    /**
     * Create an account with given name and description. The account name must be unique.
     * @param name
     * @param description
     */
    create(name: string, description?: string): Promise<Account>;
    /**
     * Update given account
     * @param accountId
     * @param name
     * @param description
     */
    update(accountId: string, name: string, description?: string): Promise<Account>;
}
