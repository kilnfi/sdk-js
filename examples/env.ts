export const loadEnv = async () => {
  if (!Bun.env.KILN_API_URL) {
    console.log('KILN_API_URL is required');
    process.exit(1);
  }

  if (!Bun.env.KILN_ACCOUNT_ID) {
    console.log('KILN_ACCOUNT_ID is required');
    process.exit(1);
  }

  if (!Bun.env.KILN_API_KEY) {
    console.log('KILN_API_KEY is required');
    process.exit(1);
  }

  if (!Bun.env.FIREBLOCKS_API_KEY) {
    console.log('FIREBLOCKS_API_KEY is required');
    process.exit(1);
  }

  if (!Bun.env.FIREBLOCKS_VAULT_ID) {
    console.log('FIREBLOCKS_VAULT_ID is required');
    process.exit(1);
  }

  if (!Bun.env.FIREBLOCKS_SECRET_FILENAME) {
    console.log('FIREBLOCKS_SECRET_FILENAME is required');
    process.exit(1);
  }

  const fireblocksApiSecret = await Bun.file(Bun.env.FIREBLOCKS_SECRET_FILENAME).text();

  return {
    kilnApiUrl: Bun.env.KILN_API_URL,
    kilnApiKey: Bun.env.KILN_API_KEY,
    kilnAccountId: Bun.env.KILN_ACCOUNT_ID,
    fireblocksApiKey: Bun.env.FIREBLOCKS_API_KEY,
    fireblocksVaultId: Bun.env.FIREBLOCKS_VAULT_ID as `${number}`,
    fireblocksApiSecret,
  };
};
