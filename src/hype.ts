// HYPE native staking on HyperCore: crafts the EIP-712 staking actions and broadcasts them to the Hyperliquid API,
// until Kiln Connect exposes HYPE endpoints. ref: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint

import { weiToHype } from './utils.js';

export type HypeNetwork = 'mainnet' | 'testnet';

export const HYPE_API_URLS: Record<HypeNetwork, string> = {
  mainnet: 'https://api.hyperliquid.xyz',
  testnet: 'https://api.hyperliquid-testnet.xyz',
};

type HyperliquidChain = 'Mainnet' | 'Testnet';

/** HyperEVM JSON-RPC endpoints and chain ids */
export const HYPE_EVM_RPC_URLS: Record<HypeNetwork, string> = {
  mainnet: 'https://rpc.hyperliquid.xyz/evm',
  testnet: 'https://rpc.hyperliquid-testnet.xyz/evm',
};
export const HYPE_EVM_CHAIN_IDS: Record<HypeNetwork, number> = { mainnet: 999, testnet: 998 };

/** Sending HYPE to this system address moves it between HyperEVM and HyperCore, to the sender's own address */
export const HYPE_SYSTEM_ADDRESS: `0x${string}` = '0x2222222222222222222222222222222222222222';

export type HypeCDepositAction = {
  type: 'cDeposit';
  signatureChainId: `0x${string}`;
  hyperliquidChain: HyperliquidChain;
  wei: number;
  nonce: number;
};

export type HypeCWithdrawAction = {
  type: 'cWithdraw';
  signatureChainId: `0x${string}`;
  hyperliquidChain: HyperliquidChain;
  wei: number;
  nonce: number;
};

export type HypeTokenDelegateAction = {
  type: 'tokenDelegate';
  signatureChainId: `0x${string}`;
  hyperliquidChain: HyperliquidChain;
  validator: `0x${string}`;
  wei: number;
  isUndelegate: boolean;
  nonce: number;
};

export type HypeSendAssetAction = {
  type: 'sendAsset';
  signatureChainId: `0x${string}`;
  hyperliquidChain: HyperliquidChain;
  destination: `0x${string}`;
  sourceDex: string;
  destinationDex: string;
  token: string;
  amount: string;
  fromSubAccount: string;
  nonce: number;
};

export type HypeStakingAction =
  | HypeCDepositAction
  | HypeCWithdrawAction
  | HypeTokenDelegateAction
  | HypeSendAssetAction;

export type HypeTypedData = {
  domain: { name: 'HyperliquidSignTransaction'; version: '1'; chainId: number; verifyingContract: `0x${string}` };
  types: Record<string, { name: string; type: string }[]>;
  primaryType: string;
  message: Record<string, unknown>;
};

/** Unsigned HYPE transaction: a HyperCore action and the EIP-712 payload to sign */
export type HypeTx = {
  action: HypeStakingAction;
  nonce: number;
  typed_data: HypeTypedData;
};

export type HypeSignature = { r: `0x${string}`; s: `0x${string}`; v: number };

/** Signed HYPE transaction, as posted to the Hyperliquid exchange endpoint */
export type HypeBroadcastTxPayload = {
  action: HypeStakingAction;
  nonce: number;
  signature: HypeSignature;
};

// EIP-712 types of the user-signed staking actions (ref: nktkas/hyperliquid, hyperliquid-python-sdk)
const EIP712_DOMAIN_TYPE = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
];

const ACTION_TYPES = {
  cDeposit: {
    primaryType: 'HyperliquidTransaction:CDeposit',
    fields: [
      { name: 'hyperliquidChain', type: 'string' },
      { name: 'wei', type: 'uint64' },
      { name: 'nonce', type: 'uint64' },
    ],
  },
  cWithdraw: {
    primaryType: 'HyperliquidTransaction:CWithdraw',
    fields: [
      { name: 'hyperliquidChain', type: 'string' },
      { name: 'wei', type: 'uint64' },
      { name: 'nonce', type: 'uint64' },
    ],
  },
  sendAsset: {
    primaryType: 'HyperliquidTransaction:SendAsset',
    fields: [
      { name: 'hyperliquidChain', type: 'string' },
      { name: 'destination', type: 'string' },
      { name: 'sourceDex', type: 'string' },
      { name: 'destinationDex', type: 'string' },
      { name: 'token', type: 'string' },
      { name: 'amount', type: 'string' },
      { name: 'fromSubAccount', type: 'string' },
      { name: 'nonce', type: 'uint64' },
    ],
  },
  tokenDelegate: {
    primaryType: 'HyperliquidTransaction:TokenDelegate',
    fields: [
      { name: 'hyperliquidChain', type: 'string' },
      { name: 'validator', type: 'address' },
      { name: 'wei', type: 'uint64' },
      { name: 'isUndelegate', type: 'bool' },
      { name: 'nonce', type: 'uint64' },
    ],
  },
} as const;

type HypeTxPayload = {
  network: HypeNetwork;
  /** amount in wei (1 HYPE = 1e8 wei), see `hypeToWei` */
  amount_wei: string;
  /**
   * chain id carried by the EIP-712 domain, any value is accepted by Hyperliquid; it must match what the signer
   * expects: 0x3e7 (default) for the Fireblocks HyperEVM asset, 0x1 for ETH, the active chain of a browser wallet
   */
  signature_chain_id?: `0x${string}`;
  /** defaults to the current timestamp in ms; must be unique per signer */
  nonce?: number;
};

export type HypeDepositTxPayload = HypeTxPayload;
export type HypeWithdrawTxPayload = HypeTxPayload;
export type HypeStakeTxPayload = HypeTxPayload & { validator: `0x${string}` };
export type HypeUnstakeTxPayload = HypeTxPayload & { validator: `0x${string}` };
export type HypeTransferToEvmTxPayload = HypeTxPayload;

type HypeActionBody<T extends HypeStakingAction> = Omit<T, 'type' | 'signatureChainId' | 'hyperliquidChain' | 'nonce'>;

const craftHypeTx = <T extends HypeStakingAction>(
  payload: HypeTxPayload,
  type: T['type'],
  body: HypeActionBody<T>,
): HypeTx => {
  const signatureChainId = payload.signature_chain_id ?? '0x3e7';
  const nonce = payload.nonce ?? Date.now();
  const action = {
    type,
    signatureChainId,
    hyperliquidChain: payload.network === 'mainnet' ? 'Mainnet' : 'Testnet',
    ...body,
    nonce,
  } as unknown as T;

  const { primaryType, fields } = ACTION_TYPES[action.type];
  const message: Record<string, unknown> = {};
  for (const f of fields) {
    message[f.name] = action[f.name as keyof HypeStakingAction];
  }

  return {
    action,
    nonce,
    typed_data: {
      domain: {
        name: 'HyperliquidSignTransaction',
        version: '1',
        chainId: Number.parseInt(signatureChainId, 16),
        verifyingContract: '0x0000000000000000000000000000000000000000',
      },
      types: { [primaryType]: [...fields], EIP712Domain: EIP712_DOMAIN_TYPE },
      primaryType,
      message,
    },
  };
};

const toWei = (amount_wei: string): number => {
  const wei = Number(amount_wei);
  if (!Number.isSafeInteger(wei) || wei <= 0) {
    throw new Error(`invalid amount_wei ${amount_wei}`);
  }
  return wei;
};

/**
 * Craft a HYPE deposit transaction (cDeposit): spot balance -> staking balance
 */
export const craftHypeDepositTx = (payload: HypeDepositTxPayload): HypeTx =>
  craftHypeTx<HypeCDepositAction>(payload, 'cDeposit', { wei: toWei(payload.amount_wei) });

/**
 * Craft a HYPE stake transaction (tokenDelegate): staking balance -> validator, locked for 1 day
 */
export const craftHypeStakeTx = (payload: HypeStakeTxPayload): HypeTx =>
  craftHypeTx<HypeTokenDelegateAction>(payload, 'tokenDelegate', {
    validator: payload.validator.toLowerCase() as `0x${string}`,
    wei: toWei(payload.amount_wei),
    isUndelegate: false,
  });

/**
 * Craft a HYPE unstake transaction (tokenDelegate with isUndelegate): validator -> staking balance
 */
export const craftHypeUnstakeTx = (payload: HypeUnstakeTxPayload): HypeTx =>
  craftHypeTx<HypeTokenDelegateAction>(payload, 'tokenDelegate', {
    validator: payload.validator.toLowerCase() as `0x${string}`,
    wei: toWei(payload.amount_wei),
    isUndelegate: true,
  });

/**
 * Craft a HYPE withdraw transaction (cWithdraw): staking balance -> spot balance, after a 7-day queue
 */
export const craftHypeWithdrawTx = (payload: HypeWithdrawTxPayload): HypeTx =>
  craftHypeTx<HypeCWithdrawAction>(payload, 'cWithdraw', { wei: toWei(payload.amount_wei) });

/**
 * Craft a HYPE transfer to HyperEVM (sendAsset to HYPE_SYSTEM_ADDRESS): spot balance -> the signer's own HyperEVM
 * address, e.g. after a withdraw. Transfers to other accounts are not supported.
 */
export const craftHypeTransferToEvmTx = async (payload: HypeTransferToEvmTxPayload): Promise<HypeTx> =>
  craftHypeTx<HypeSendAssetAction>(payload, 'sendAsset', {
    destination: HYPE_SYSTEM_ADDRESS,
    sourceDex: 'spot',
    destinationDex: 'spot',
    token: await getHypeSpotToken(payload.network),
    amount: weiToHype(BigInt(toWei(payload.amount_wei))),
    fromSubAccount: '',
  });

export type HypeTransferToCoreTxPayload = { network: HypeNetwork; amount_wei: string };

/** Unsigned HyperEVM transaction: a native HYPE transfer, `value` in 18 decimals */
export type HypeEvmTx = { chain_id: number; to: `0x${string}`; value: string; gas_limit: number };

// the system contract emits a log on receipt: a plain 21000-gas transfer runs out of gas
const TRANSFER_TO_CORE_GAS_LIMIT = 30000;

/**
 * Craft a HYPE transfer to HyperCore: HyperEVM transfer to HYPE_SYSTEM_ADDRESS, credited to the sender's own
 * HyperCore spot balance. The first credit of a new HyperCore account pays a one-off activation fee (~0.0126 HYPE).
 */
export const craftHypeTransferToCoreTx = (payload: HypeTransferToCoreTxPayload): HypeEvmTx => ({
  chain_id: HYPE_EVM_CHAIN_IDS[payload.network],
  to: HYPE_SYSTEM_ADDRESS,
  value: (BigInt(toWei(payload.amount_wei)) * 10n ** 10n).toString(),
  gas_limit: TRANSFER_TO_CORE_GAS_LIMIT,
});

/**
 * Broadcast a signed HYPE transaction to the Hyperliquid exchange endpoint
 */
export const broadcastHypeTx = async (
  network: HypeNetwork,
  payload: HypeBroadcastTxPayload,
): Promise<{ status: 'ok' | 'err'; response: unknown }> => {
  const res = await fetch(`${HYPE_API_URLS[network]}/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Hyperliquid exchange endpoint returned HTTP ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as { status: 'ok' | 'err'; response: unknown };
};

const postInfo = async <T>(network: HypeNetwork, body: object): Promise<T> => {
  const res = await fetch(`${HYPE_API_URLS[network]}/info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Hyperliquid info endpoint returned HTTP ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
};

export type HypeDelegatorSummary = {
  delegated: string;
  undelegated: string;
  totalPendingWithdrawal: string;
  nPendingWithdrawals: number;
};

export type HypeDelegation = { validator: string; amount: string; lockedUntilTimestamp: number };

export type HypeDelegatorHistoryEntry = { time: number; hash: string; delta: Record<string, unknown> };

/** Staking balances of a user: delegated, undelegated (staking balance) and pending withdrawals */
export const getHypeDelegatorSummary = (network: HypeNetwork, user: string) =>
  postInfo<HypeDelegatorSummary>(network, { type: 'delegatorSummary', user });

/** Current delegations of a user, per validator */
export const getHypeDelegations = (network: HypeNetwork, user: string) =>
  postInfo<HypeDelegation[]>(network, { type: 'delegations', user });

/** Staking actions of a user (deposits, delegations, withdrawals), most recent first, capped to 2000 entries */
export const getHypeDelegatorHistory = (network: HypeNetwork, user: string) =>
  postInfo<HypeDelegatorHistoryEntry[]>(network, { type: 'delegatorHistory', user });

/** HYPE balances of a user's spot account */
export const getHypeSpotBalance = async (network: HypeNetwork, user: string): Promise<string> => {
  const state = await postInfo<{ balances: { coin: string; total: string }[] }>(network, {
    type: 'spotClearinghouseState',
    user,
  });
  return state.balances.find((b) => b.coin === 'HYPE')?.total ?? '0';
};

/** HYPE token identifier for spot transfers on HyperCore, as `name:tokenId` (it differs between networks) */
export const getHypeSpotToken = async (network: HypeNetwork): Promise<string> => {
  const meta = await postInfo<{ tokens: { name: string; tokenId: string }[] }>(network, { type: 'spotMeta' });
  const hype = meta.tokens.find((t) => t.name === 'HYPE');
  if (!hype) {
    throw new Error('HYPE not found in spotMeta');
  }
  return `HYPE:${hype.tokenId}`;
};

/** Current validator set */
export const getHypeValidators = (network: HypeNetwork) =>
  postInfo<{ validator: string; name: string; isActive: boolean; isJailed: boolean; commission: string }[]>(network, {
    type: 'validatorSummaries',
  });
