import createClient, { type Client, type ClientOptions } from 'openapi-fetch';
import { FireblocksService } from './fireblocks.js';
import type { paths } from './openapi/schema.js';

export * from './validators.js';
export * from './openapi/schema.js';
export * from './utils.js';
export type { FireblocksIntegration } from './fireblocks.js';
export type { FireblocksAssetId } from './fireblocks_signer.js';

type Config = {
  baseUrl: string;
  apiToken?: string;
  clientOptions?: ClientOptions;
};

export class Kiln {
  fireblocks: FireblocksService;
  client: Client<paths>;

  constructor({ apiToken, baseUrl, clientOptions }: Config) {
    const client = createClient<paths>({
      ...clientOptions,
      baseUrl,
      headers: {
        ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
        ...clientOptions?.headers,
      },
      querySerializer: { array: { explode: false, style: 'form' } },
    });
    this.fireblocks = new FireblocksService(client);
    this.client = client;
  }
}
