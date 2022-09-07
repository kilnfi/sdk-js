export type SupportedProviders = 'fireblocks';

export type FireblocksIntegration = {
  name: string;
  provider: SupportedProviders;
  fireblocksApiKey: string;
  fireblocksSecretKey: string;
  vaultAccountId: string;
};

export type Integrations = (FireblocksIntegration)[];