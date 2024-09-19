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

```typescript
import { Kiln } from "@kilnfi/sdk";

const k = new Kiln({
  baseUrl: "https://api.kiln.fi",
  apiToken: "kiln_xxx",
});
```


## Example: Stake 1 NEAR using Fireblocks raw signing
```typescript
import { Kiln } from "@kilnfi/sdk";
import type { Integration } from "@kilnfi/sdk/lib/types/integrations";
import fs from "node:fs";
import 'dotenv/config'


const apiSecret = fs.readFileSync(__dirname + '/fireblocks_secret.key', 'utf8');

const stake = async () => {
  // Kiln client configuration
  const k = new Kiln({
    baseUrl: 'https://api.testnet.kiln.fi',
    apiToken: process.env.KILN_API_KEY,
  });

  // Fireblocks vault configuration
  const vault: Integration = {
    provider: 'fireblocks',
    fireblocksApiKey: process.env.FIREBLOCKS_API_KEY,
    fireblocksSecretKey: apiSecret,
    vaultId: 14
  };

  // Craft staking tx
  const tx = await k.client.POST(
    '/v1/near/transaction/stake',
    {
      body: {
        account_id: 'd3f1b917-72b1-4982-a4dd-93fce579a708',
        wallet: 'c36b1a5da2e60d1fd5d3a6b46f7399eb26571457f3272f3c978bc9527ad2335f',
        pool_id: 'kiln.pool.f863973.m0',
        amount_yocto: '1000000000000000000000000',
      }
    }
  );

  // Sign tx with Fireblocks
  const signResponse = await k.fireblocks.signNearTx(vault, tx.data.data, "NEAR_TEST");

  // Broadcast tx
  const broadcastedTx = await k.client.POST("/v1/near/transaction/broadcast", {
    body: {
      signed_tx_serialized: signResponse.signed_tx.data.signed_tx_serialized,
    }
  });
};

stake();
```
Find complete examples in the `examples` directory.

## License

This package is open-sourced software licensed under the [BUSL-1.1 license](https://github.com/kilnfi/sdk-js/blob/main/LICENSE).
