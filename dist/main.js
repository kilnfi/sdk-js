"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Kiln = exports.KILN_VALIDATORS = void 0;
// Polyfills
require("core-js/stable");
require("regenerator-runtime/runtime");
const accounts_1 = require("./services/accounts");
const ada_1 = require("./services/ada");
const atom_1 = require("./services/atom");
const dot_1 = require("./services/dot");
const dydx_1 = require("./services/dydx");
const eth_1 = require("./services/eth");
const fet_1 = require("./services/fet");
const fireblocks_1 = require("./services/fireblocks");
const inj_1 = require("./services/inj");
const ksm_1 = require("./services/ksm");
const matic_1 = require("./services/matic");
const near_1 = require("./services/near");
const noble_1 = require("./services/noble");
const osmo_1 = require("./services/osmo");
const sol_1 = require("./services/sol");
const tia_1 = require("./services/tia");
const ton_1 = require("./services/ton");
const xtz_1 = require("./services/xtz");
const zeta_1 = require("./services/zeta");
const validators_1 = require("./validators");
const kava_1 = require("./services/kava");
const api_1 = require("./api");
exports.KILN_VALIDATORS = validators_1.KILN_VALIDATORS;
class Kiln {
    constructor({ testnet, apiToken, baseUrl }) {
        api_1.api.defaults.headers.common.Authorization = `Bearer ${apiToken}`;
        api_1.api.defaults.headers.common["Content-Type"] = "application/json";
        api_1.api.defaults.baseURL = baseUrl ? baseUrl : testnet === true ? "https://api.testnet.kiln.fi" : "https://api.kiln.fi";
        this.fireblocks = new fireblocks_1.FireblocksService({ testnet });
        this.accounts = new accounts_1.AccountService({ testnet });
        this.eth = new eth_1.EthService({ testnet });
        this.sol = new sol_1.SolService({ testnet });
        this.atom = new atom_1.AtomService({ testnet });
        this.ada = new ada_1.AdaService({ testnet });
        this.near = new near_1.NearService({ testnet });
        this.dot = new dot_1.DotService({ testnet });
        this.ksm = new ksm_1.KsmService({ testnet });
        this.xtz = new xtz_1.XtzService({ testnet });
        this.matic = new matic_1.MaticService({ testnet });
        this.osmo = new osmo_1.OsmoService({ testnet });
        this.dydx = new dydx_1.DydxService({ testnet });
        this.tia = new tia_1.TiaService({ testnet });
        this.noble = new noble_1.NobleService({ testnet });
        this.fet = new fet_1.FetService({ testnet });
        this.inj = new inj_1.InjService({ testnet });
        this.ton = new ton_1.TonService({ testnet });
        this.zeta = new zeta_1.ZetaService({ testnet });
        this.kava = new kava_1.KavaService({ testnet });
    }
}
exports.Kiln = Kiln;
