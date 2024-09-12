import "core-js/stable";
import "regenerator-runtime/runtime";
import { AccountService } from "./services/accounts";
import { AdaService } from "./services/ada";
import { AtomService } from "./services/atom";
import { DotService } from "./services/dot";
import { DydxService } from "./services/dydx";
import { EthService } from "./services/eth";
import { FetService } from "./services/fet";
import { FireblocksService } from "./services/fireblocks";
import { InjService } from "./services/inj";
import { KsmService } from "./services/ksm";
import { MaticService } from "./services/matic";
import { NearService } from "./services/near";
import { NobleService } from "./services/noble";
import { OsmoService } from "./services/osmo";
import { SolService } from "./services/sol";
import { TiaService } from "./services/tia";
import { TonService } from "./services/ton";
import { XtzService } from "./services/xtz";
import { ZetaService } from "./services/zeta";
import { KavaService } from "./services/kava";
type Config = {
    apiToken: string;
    testnet?: boolean;
    baseUrl?: string;
};
export declare const KILN_VALIDATORS: {
    ADA: {
        mainnet: {
            KILN0: string;
            KILN1: string;
            KILN2: string;
            KILN3: string;
        };
        preprod: {
            KILN: string;
        };
    };
    ATOM: {
        mainnet: {
            KILN: string;
            KILN_BETA: string;
        };
    };
    DOT: {
        mainnet: {
            KILN: string;
            KILN_NOMINATION_POOL_ID: string;
        };
    };
    KSM: {
        mainnet: {
            KILN: string;
            KILN_NOMINATION_POOL_ID: string;
        };
    };
    MATIC: {
        mainnet: {
            KILN_OWNEST: string;
        };
    };
    NEAR: {
        mainnet: {
            KILN: string;
            KILN1: string;
        };
        testnet: {
            KILN: string;
        };
    };
    SOL: {
        mainnet: {
            KILN: string;
        };
        devnet: {
            KILN: string;
        };
    };
    XTZ: {
        mainnet: {
            KILN: string;
        };
        testnet: {
            KILN: string;
        };
    };
    FET: {
        mainnet: {
            KILN: string;
        };
    };
    ZETA: {
        mainnet: {
            KILN: string;
        };
    };
};
export declare class Kiln {
    fireblocks: FireblocksService;
    accounts: AccountService;
    eth: EthService;
    sol: SolService;
    atom: AtomService;
    ada: AdaService;
    near: NearService;
    dot: DotService;
    ksm: KsmService;
    xtz: XtzService;
    matic: MaticService;
    osmo: OsmoService;
    dydx: DydxService;
    tia: TiaService;
    noble: NobleService;
    fet: FetService;
    inj: InjService;
    ton: TonService;
    zeta: ZetaService;
    kava: KavaService;
    constructor({ testnet, apiToken, baseUrl }: Config);
}
export {};
