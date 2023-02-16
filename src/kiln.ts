import api from './api';
import { EthService } from './services/eth';
import { SolService } from './services/sol';
import { Integrations } from "./types/integrations";
import { Rpcs } from "./types/rpcs";
import { AtomService } from "./services/atom";
import { AccountService } from "./services/accounts";
import { AdaService } from "./services/ada";
import { NearService } from "./services/near";
import { DotService } from "./services/dot";
import { XtzService } from "./services/xtz";

type Config = {
  apiToken: string;
  testnet?: boolean;
  integrations?: Integrations;
  rpcs?: Rpcs;
};

export class Kiln {
  eth: EthService;
  sol: SolService;
  accounts: AccountService;
  atom: AtomService;
  ada: AdaService;
  near: NearService;
  dot: DotService;
  xtz: XtzService;

  constructor({ testnet, apiToken, integrations, rpcs }: Config) {
    api.defaults.headers.common.Authorization = `Bearer ${apiToken}`;
    api.defaults.headers.common['Content-Type'] = 'application/json';
    api.defaults.baseURL =
      testnet === true
        ? 'https://api.testnet.kiln.fi/'
        : 'https://api.kiln.fi/';

    this.accounts = new AccountService({ testnet });
    this.eth = new EthService({ testnet, integrations, rpc: rpcs?.ethereum,  });
    this.sol = new SolService({ testnet, integrations, rpc: rpcs?.solana, });
    this.atom = new AtomService({ testnet, integrations, rpc: rpcs?.atom, });
    this.ada = new AdaService({ testnet, integrations });
    this.near = new NearService({ testnet, integrations, rpc: rpcs?.near });
    this.dot = new DotService({ testnet, integrations, rpc: rpcs?.dot });
    this.xtz = new XtzService({ testnet, integrations });
  }
}