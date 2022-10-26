## Description

Kiln JS SDK makes it easy to interact with the Kiln platform. It provides a simple way of crafting staking transactions as well getting real time rewards data.

Check out the full documentation [here](https://docs.kiln.fi/v1/connect/overview).

## Supported protocols
- ETH
- SOL
- ATOM
- ADA
- NEAR
- DOT
- More protocol to come, don't hesitate to contact us (support@kiln.fi)

## Installation

You can install the JS SDK with npm:

```sh
npm install --save @kilnfi/sdk
```

## Setup
In order to use this sdk, you will need a kiln api token.  
Please contact support@kiln.fi to get one.

```typescript
import { Kiln } from "../src/kiln";

const k = new Kiln({
  testnet: true,
  apiToken: 'kiln_xxx',
});
```

## Craft 32 ETH staking transaction, sign it with fireblocks and broadcast it
```typescript
import { Kiln } from "../src/kiln";
const fs = require('fs');

const apiSecret = fs.readFileSync(__dirname + '/path_to_fireblocks_secret', 'utf8');

const k = new Kiln({
  testnet: true,
  apiToken: 'kiln_xxx',
  integrations: [
    {
      name: 'vault1',
      provider: 'fireblocks',
      fireblocksApiKey: 'fireblocks_api_key',
      fireblocksSecretKey: apiSecret,
      vaultAccountId: 'vault_account_id'
    }
  ],
});

try {
  // Craft 32 ETH staking transaction
  const tx = await k.eth.craftStakeTx(
    'kiln_account_id',
    'withdrawal_address',
    32
  );
  
  // Sign it with fireblocks vault 'vault1'
  const txSigned = await k.eth.sign('vault1', tx);
  
  // Broadcast it
  const receipt = await k.eth.broadcast(txSigned);
  
} catch (err) {
  // handle errors
}
```

## Fetch ETH stakes and network stats
```typescript
try {
    // Get stakes by accounts
    const stakes = await k.eth.getAccountsRewards(['kiln-account-id']);
    
    // Get stakes by wallets
    const stakesByWallet = await k.eth.getWalletRewards(['wallet-address']);

    // Get stakes by validators
    const stakesByValidator = await k.eth.getStakesRewards(['validator-address']);

    // Get network stats
    const stats = await k.eth.getNetworkStats();
    
  } catch (err) {
    // handle errors
  }
```

## License
This package is open-sourced software licensed under the [BUSL-1.1 license](https://github.com/kilnfi/sdk-js/blob/main/LICENSE).

