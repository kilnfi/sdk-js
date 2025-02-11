import { Kiln, tonToNanoton } from '../src/kiln.ts';
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
  vaultId: '37', // mainnet QA Automated test UQAfjn5-4M5H7q_2z4rCjAIGDslZoT0VsZNWaQ9BIaR4w0V9
};

//
// Get the wallet address from Fireblocks
//
const fireblocksWallet = (
  await k.fireblocks.getSdk(vault).vaults.getVaultAccountAssetAddressesPaginated({
    vaultAccountId: vault.vaultId,
    assetId: 'TON',
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
const txRequest = await k.client.POST('/ton/transaction/stake-single-nomination-pool', {
  body: {
    account_id: kilnAccountId,
    pool_address: 'Ef8Fl22VmKm2kDqIWnPf3iNhCUz0cZkedMkZBNZ2D0jDxH9p',
    wallet: fireblocksWallet,
    amount_nanoton: tonToNanoton('1.2').toString(),
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
    return await k.fireblocks.signTonTx(vault, txRequest.data.data, 'TON');
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
// console.log('Broadcasting transaction...');
// const broadcastedRequest = await k.client.POST('/ton/transaction/broadcast', {
//   body: {
//     tx_serialized: signRequest.signed_tx.data.signed_tx_serialized,
//   },
// });
// if (broadcastedRequest.error) {
//   console.log('Failed to broadcast transaction:', broadcastedRequest);
//   process.exit(1);
// } else {
//   console.log('Broadcasted transaction:', broadcastedRequest.data);
// }
