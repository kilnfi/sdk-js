import type { FireblocksIntegration } from '../src/fireblocks.ts';
import {
  Kiln,
  broadcastHypeTx,
  craftHypeDepositTx,
  craftHypeStakeTx,
  getHypeDelegations,
  hypeToWei,
} from '../src/kiln.ts';
import { loadEnv } from './env.ts';

const { kilnApiKey, kilnApiUrl, fireblocksApiKey, fireblocksApiSecret, fireblocksVaultId } = await loadEnv();

// the vault's HyperEVM address must already hold HYPE on HyperCore spot (see craftHypeTransferToCoreTx)
const validator = Bun.env.HYPE_VALIDATOR as `0x${string}` | undefined;
if (!validator) {
  console.log('HYPE_VALIDATOR is required');
  process.exit(1);
}

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
// Get the address from Fireblocks
//
const address = (
  await k.fireblocks
    .getSdk(vault)
    .vaults.getVaultAccountAssetAddressesPaginated({ assetId: 'HYPE_ETH', vaultAccountId: vault.vaultId, limit: 1 })
).data.addresses?.[0]?.address;
if (!address) {
  console.log('Failed to get address');
  process.exit(0);
}

//
// Craft the transactions: deposit from spot to the staking balance, then delegate to the validator
//
const amount_wei = hypeToWei('0.1').toString();
const txs = [
  craftHypeDepositTx({ network: 'mainnet', amount_wei }),
  craftHypeStakeTx({ network: 'mainnet', amount_wei, validator }),
];

for (const tx of txs) {
  //
  // Sign the transaction
  //
  console.log(`Signing ${tx.action.type}...`);
  const signRequest = await (async () => {
    try {
      return await k.fireblocks.signHypeTx(vault, tx, 'HYPE_ETH');
    } catch (err) {
      console.log('Failed to sign transaction:', err);
      process.exit(1);
    }
  })();

  //
  // Broadcast the transaction
  //
  console.log(`Broadcasting ${tx.action.type}...`);
  const broadcasted = await broadcastHypeTx('mainnet', signRequest.signed_tx.data);
  if (broadcasted.status !== 'ok') {
    console.log('Failed to broadcast transaction:', broadcasted);
    process.exit(1);
  }
  console.log('Broadcasted transaction:', broadcasted);
}

console.log('Delegations:', await getHypeDelegations('mainnet', address));
