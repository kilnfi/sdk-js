import api from './api';
import { EthService } from './services/eth';
import { SolService } from './services/sol';
import { Integrations } from "./types/integrations";
import { Rpcs } from "./types/rpcs";
import { AtomService } from "./services/atom";

type Config = {
  apiToken: string;
  testnet?: boolean;
  integrations?: Integrations;
  rpcs?: Rpcs;
};

export class Kiln {
  eth: EthService;
  sol: SolService;
  atom: AtomService;

  constructor({ testnet, apiToken, integrations, rpcs }: Config) {
    api.defaults.headers.common.Authorization = `Bearer ${apiToken}`;
    api.defaults.headers.common['Content-Type'] = 'application/json';
    api.defaults.baseURL =
      testnet === true
        ? 'https://api.testnet.kiln.fi/'
        : 'https://api.kiln.fi/';

    this.eth = new EthService({ testnet, integrations, rpc: rpcs?.ethereum,  });
    this.sol = new SolService({ testnet, integrations, rpc: rpcs?.solana, });
    this.atom = new AtomService({ testnet, integrations, rpc: rpcs?.atom, });
  }
}