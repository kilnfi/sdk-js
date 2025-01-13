## Description

Kiln SDK is a wrapper around the Kiln Connect API, which allows you to craft staking transactions as well getting real time and historical data about your stakes.

On top of that, the SDK provides a way to sign your transactions with Fireblocks using their Contract call and Raw Signing features. 

- [Kiln Connect documentation](https://docs.kiln.fi/v1/connect/overview)
- [OpenAPI reference](https://docs.api.kiln.fi/reference/getaccounts)

## Installation

You can install the JS SDK with your favorite package manager:

```sh
bun install @kilnfi/sdk
```

## Setup

In order to use this sdk, you will need a kiln api token.
Please contact support@kiln.fi to get one.

## Example: Stake 1 NEAR using Fireblocks raw signing
```typescript
import { Kiln, KILN_VALIDATORS } from '@kilnfi/sdk';
import type { FireblocksIntegration } from '@kilnfi/sdk/fireblocks.ts';
import { loadEnv } from './env.ts';
import { parseUnits } from "viem";

const k = new Kiln({
  baseUrl: 'https://api.kiln.fi/v1',
  apiToken: process.env.KILN_API_TOKEN,
});

const apiSecret = fs.readFileSync(__dirname + '/fireblocks_secret.key', 'utf8');

const vault: FireblocksIntegration = {
  config: {
    apiKey: process.env.FIREBLOCKS_API_KEY,
    secretKey: apiSecret,
    basePath: 'https://api.fireblocks.io/v1',
  },
  vaultId: process.env.FIREBLOCKS_VAULT_ID,
};

//
// Craft the transaction
//
console.log('Crafting transaction...');
const txRequest = await k.client.POST('/near/transaction/stake', {
  body: {
    account_id: kilnAccountId,
    wallet: 'c36b1a5da2e60d1fd5d3a6b46f7399eb26571457f3272f3c978bc9527ad2335f',
    pool_id: KILN_VALIDATORS.NEAR.mainnet.KILN,
    amount_yocto: parseUnits('1', 24).toString(),
  },
});
if (txRequest.error) {
  console.log('Failed to craft transaction:', txRequest);
  process.exit(1);
} else {
  console.log('Crafted transaction:', txRequest.data);
}
console.log('\n\n\n');

//
// Sign the transaction
//
console.log('Signing transaction...');
const signRequest = await (async () => {
  try {
    // @ts-ignore
    return await k.fireblocks.signNearTx(vault, txRequest.data.data, "NEAR_TEST");
  } catch (err) {
    console.log('Failed to sign transaction:', err);
    process.exit(1);
  }
})();
console.log('Signed transaction:', signRequest);
console.log('\n\n\n');

//
// Broadcast the transaction
//
console.log('Broadcasting transaction...');
const broadcastedRequest = await k.client.POST('/near/transaction/broadcast', {
  body: {
    signed_tx_serialized: signRequest.signed_tx.data.signed_tx_serialized,
  },
});
if (broadcastedRequest.error) {
  console.log('Failed to broadcast transaction:', broadcastedRequest);
  process.exit(1);
} else {
  console.log('Broadcasted transaction:', broadcastedRequest.data);
}

```
Find complete examples in the `examples` directory.

## License

This package is open-sourced software licensed under the [BUSL-1.1 license](https://github.com/kilnfi/sdk-js/blob/main/LICENSE).
