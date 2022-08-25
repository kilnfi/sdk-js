
export type InternalAccountsConfig = {
  testnet?: boolean;
};

export type Account = {
  createdAt: string;
  id: string;
  name: string;
  description: string;
};

export type Accounts = {
  accounts: Account[]
}