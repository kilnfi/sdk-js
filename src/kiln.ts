export * from './validators';
export * from './openapi/schema';
export * from './utils';
import createClient, { type Client } from 'openapi-fetch';
import { FireblocksService } from './fireblocks';
import type { paths } from './openapi/schema';

type Config = {
  baseUrl: string;
  apiToken: string;
};

export class Kiln {
  fireblocks: FireblocksService;
  client: Client<paths>;

  constructor({ apiToken, baseUrl }: Config) {
    const client = createClient<paths>({ baseUrl, headers: { Authorization: `Bearer ${apiToken}` } });
    this.fireblocks = new FireblocksService(client);
    this.client = client;
  }
}
