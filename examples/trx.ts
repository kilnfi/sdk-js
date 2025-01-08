import { atomToUatom, Kiln, KILN_VALIDATORS, trxToSun } from '../src/kiln.ts';
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
// Get the pubkey from Fireblocks
//
const fireblocksPubkey = (await k.fireblocks.getPubkey(vault, 'TRX')).publicKey;
if (!fireblocksPubkey) {
  console.log('Failed to get pubkey');
  process.exit(0);
}

//
// Craft the transaction
//
console.log('Crafting transaction...');
const txRequest = await k.client.POST('/trx/transaction/stake', {
  body: {
    account_id: '9d7b0e32-203d-4b1d-9ff1-99ccae420c7f',
    owner_address: 'TAERHY5gyzDRmAaeqqa6C4Fuyc9HLnnHx7',
    amount_sun: Number(trxToSun('1')),
    resource: 'BANDWIDTH',
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
    return await k.fireblocks.signTrxTx(vault, txRequest.data.data);
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
const broadcastedRequest = await k.client.POST('/trx/transaction/broadcast', {
  body: {
    tx_serialized: signRequest.signed_tx.data.signed_tx_serialized,
  },
});
if (broadcastedRequest.error) {
  console.log('Failed to broadcast transaction:', broadcastedRequest);
  process.exit(1);
} else {
  console.log('Broadcasted transaction:', broadcastedRequest.data);
}
