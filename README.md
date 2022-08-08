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
    'kiln-account-id',
    'withdrawl-address',
    32
  );
} catch (err) {
  console.log(err);
}
```

## Fetch ETH stakes and network stats
```typescript
try {
    // Get stakes by account
    const stakes = await k.eth.getAccountStakes('kiln-account-id');
    
    // Get stakes by wallet
    const stakesByWallet = await k.eth.getWalletStakes('wallet-address');

    // Get stakes by validator
    const stakesByValidator = await k.eth.getValidatorStakes('validator-address');

    // Get network stats
    const stats = await k.eth.getNetworkStats();
    
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
} catch (err){
  console.log(err);
}
```

## Fetch SOL stakes and network stats
```typescript
try {
    // Get stakes by stake account
    const stakes = await k.sol.getStakeAccountStakes('stake-account-address');

    // Get network stats
    const stats = await k.sol.getNetworkStats();
    
  } catch (err) {
    console.log(err);
  }
```