import { Kiln } from '../src/kiln.ts';
import type { FireblocksIntegration } from '../src/fireblocks.ts';
import { loadEnv } from './env.ts';

const { kilnApiKey, kilnAccountId, kilnApiUrl, fireblocksApiKey, fireblocksApiSecret, fireblocksVaultId } =
  await loadEnv();

const k = new Kiln({
  baseUrl: kilnApiUrl,
  apiToken: kilnApiKey,
});

const vault: FireblocksIntegration = {
  config: {
    apiKey: fireblocksApiKey,
    secretKey: fireblocksApiSecret,
    basePath: 'https://api.fireblocks.io/v1',
  },
  vaultId: fireblocksVaultId,
};

//
// Get the wallet address from Fireblocks
//
const fireblocksWallet = (
  await k.fireblocks.getSdk(vault).vaults.getVaultAccountAssetAddressesPaginated({
    vaultAccountId: vault.vaultId,
    assetId: 'ALGO',
    limit: 1,
  })
).data.addresses?.[0].address;

if (!fireblocksWallet) {
  console.log('Failed to get fireblocks wallet');
  process.exit(0);
}

//
// Craft the transaction
//
console.log('Crafting transaction...');
// const txRequest = await k.client.POST('/algo/stake', {
const txRequest = await fetch('http://localhost:3001/v1/algo/stake', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    amount_micro_algo: '1', // schema expects string per the error
    sender_address: 'SK4UCVAGW2QXRJJ65DFCKEEW2XVLGNT6DW3XQIXPN4RWDH3EFJ2C7LEMLU',
  }),
}).then(async (res) => ({ data: await res.json() }));

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
    return await k.fireblocks.signAlgoTx(vault, txRequest.data.data);
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
const broadcastedRequest = await fetch('http://localhost:3001/v1/algo/broadcast', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    tx_serialized: txRequest.data.data.unsigned_tx_serialized,
  }),
}).then(async (res) => ({ data: await res.json() }));

if (broadcastedRequest.error) {
  console.log('Failed to broadcast transaction:', broadcastedRequest);
  process.exit(1);
} else {
  console.log('Broadcasted transaction:', broadcastedRequest.data);
}
