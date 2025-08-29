import type { FireblocksIntegration } from '../src/fireblocks.ts';
import { KILN_VALIDATORS, Kiln, suiToMist } from '../src/kiln.ts';
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
const fireblocksWallet = (
  await k.fireblocks
    .getSdk(vault)
    .vaults.getVaultAccountAssetAddressesPaginated({ assetId: 'SUI', vaultAccountId: vault.vaultId, limit: 1 })
).data.addresses?.[0].address;
if (!fireblocksWallet) {
  console.log('Failed to get pubkey');
  process.exit(0);
}

console.log(fireblocksWallet);

//
// Craft the transaction
//
console.log('Crafting transaction...');
console.log('params:', {
  account_id: kilnAccountId,
  sender: fireblocksWallet,
  validator_address: KILN_VALIDATORS.SUI.mainnet.KILN,
  amount_mist: suiToMist('1.1').toString(),
});
const txRequest = await k.client.POST('/sui/transaction/stake', {
  body: {
    account_id: kilnAccountId,
    sender: fireblocksWallet,
    validator_address: KILN_VALIDATORS.SUI.mainnet.KILN,
    amount_mist: suiToMist('1.1').toString(),
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
    return await k.fireblocks.signSuiTx(vault, txRequest.data.data);
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
const broadcastedRequest = await k.client.POST('/sui/transaction/broadcast', {
  body: {
    tx_serialized: signRequest.signed_tx.data.tx_serialized,
    serialized_signature: signRequest.signed_tx.data.serialized_signature,
  },
});
if (broadcastedRequest.error) {
  console.log('Failed to broadcast transaction:', broadcastedRequest);
  process.exit(1);
} else {
  console.log('Broadcasted transaction:', broadcastedRequest.data);
}
