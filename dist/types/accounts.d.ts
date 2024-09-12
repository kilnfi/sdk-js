export type InternalAccountsConfig = {
    testnet?: boolean;
};
export type Account = {
    created_at: string;
    id: string;
    name: string;
    description: string;
};
export type Accounts = {
    accounts: Account[];
};
