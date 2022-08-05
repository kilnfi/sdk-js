import api from './api';
import { EthService } from './services/eth';
import { SolService } from './services/sol';

type Config = {
  testnet?: boolean;
  apiToken: string;
};

class Kiln {
  eth: EthService;
  sol: SolService;

  constructor({ testnet, apiToken }: Config) {
    api.defaults.headers.common.Authorization = `Bearer ${apiToken}`;
    api.defaults.headers.common['Content-Type'] = 'application/json';
    api.defaults.baseURL =
      testnet === true
        ? 'https://api.testnet.kiln.fi/'
        : 'https://api.kiln.fi/';

    this.eth = new EthService({ testnet });
    this.sol = new SolService({ testnet });
  }
}

export default Kiln;
