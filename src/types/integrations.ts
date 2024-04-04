export type SupportedProviders = "fireblocks";

export type FireblocksIntegration = {
  provider: SupportedProviders;
  fireblocksApiKey: string;
  fireblocksSecretKey: string;
  vaultId: number;
  name?: string;
  fireblocksDestinationId?: string;
};

export type Integration = FireblocksIntegration;
