import api from './api';
import { EthService } from './services/eth';
import { SolService } from './services/sol';
import { Integrations } from "./types/integrations";
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

  constructor({ testnet, apiToken, integrations }: Config) {
    api.defaults.headers.common.Authorization = `Bearer ${apiToken}`;
    api.defaults.headers.common['Content-Type'] = 'application/json';
    api.defaults.baseURL =
      testnet === true
        ? 'http://localhost:3001'
        : 'https://api.kiln.fi';

    this.accounts = new AccountService({ testnet });
    this.eth = new EthService({ testnet, integrations });
    this.sol = new SolService({ testnet, integrations });
    this.atom = new AtomService({ testnet, integrations });
    this.ada = new AdaService({ testnet, integrations });
    this.near = new NearService({ testnet, integrations });
    this.dot = new DotService({ testnet, integrations });
    this.xtz = new XtzService({ testnet, integrations });
  }
}