export type SupportedProviders = 'fireblocks';

export type FireblocksIntegration = {
  name: string;
  provider: SupportedProviders;
  fireblocksApiKey: string;
  fireblocksSecretKeyPath: string;
  vaultAccountId: string;
};

export type Integrations = (FireblocksIntegration)[];