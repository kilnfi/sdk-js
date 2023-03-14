export type SupportedProviders = 'fireblocks';

export type FireblocksIntegration = {
  name: string;
  provider: SupportedProviders;
  fireblocksApiKey: string;
  fireblocksSecretKey: string;
  vaultId: number;
};

export type Integration = FireblocksIntegration;