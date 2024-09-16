export * from "./validators";
export * from "./openapi/schema";
import createClient, { Client } from "openapi-fetch";
import type { paths } from "./openapi/schema";
import { FireblocksService } from "./services/fireblocks";

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
