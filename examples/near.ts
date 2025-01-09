import { Kiln, KILN_VALIDATORS } from '../src/kiln.ts';
import type { FireblocksIntegration } from '../src/fireblocks.ts';
import { loadEnv } from './env.ts';
import { parseUnits } from "viem";

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
// Craft the transaction
//
console.log('Crafting transaction...');
const txRequest = await k.client.POST('/near/transaction/stake', {
  body: {
    account_id: kilnAccountId,
    wallet: 'c36b1a5da2e60d1fd5d3a6b46f7399eb26571457f3272f3c978bc9527ad2335f',
    pool_id: KILN_VALIDATORS.NEAR.testnet.KILN,
    amount_yocto: parseUnits('0.1', 24).toString(),
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
