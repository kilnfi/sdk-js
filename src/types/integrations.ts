export type SupportedIntegrations = 'fireblocks';

export type FireblocksIntegration = {
  name: SupportedIntegrations;
  fireblocksApiKey: string;
  fireblocksSecretKeyPath: string;
  vaultAccountId: string;
};

export type Integrations = (FireblocksIntegration)[];