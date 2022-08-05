## Description

Kiln JS SDK makes it easy to interact with the kiln platform. It provides a simple way of crafting staking transactions as well getting real time rewards data.

## Installation

You can install the JS SDK with npm:

```sh
npm install --save @kilnfi/sdk
```

## Craft ETH staking transaction
```typescript
const k = new Kiln({
  testnet: true,
  apiToken: 'kiln_xxx',
});

try {
  const tx = await k.eth.craftStakeTx(
    'account-id',
    'withdrawl-address',
    32
  );
  console.log(tx);
} catch (err) {
  console.log(err);
}
```

## Craft SOL staking transaction

```typescript
try {
  const tx = await k.sol.craftStakeTx(
    'account-id',
    'wallet-address',
    2
  );
  console.log(tx);
} catch (err){
  console.log(err);
}
```