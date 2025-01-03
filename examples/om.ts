import { omToUom, Kiln } from '../src/kiln.ts';
import fs from 'node:fs';
import 'dotenv/config';
import type { FireblocksIntegration } from '../src/fireblocks.ts';

const apiSecret = fs.readFileSync(`${__dirname}/fireblocks_secret_prod.key`, 'utf8');

const k = new Kiln({
  baseUrl: process.env.KILN_API_URL as string,
  apiToken: process.env.KILN_API_KEY as string,
});

const vault: FireblocksIntegration = {
  provider: 'fireblocks',
  fireblocksApiKey: process.env.FIREBLOCKS_API_KEY as string,
  fireblocksSecretKey: apiSecret,
  vaultId: 17,
};

try {
  console.log('crafting...');
  const tx = await k.client.POST('/om/transaction/stake', {
    body: {
      account_id: process.env.KILN_ACCOUNT_ID as string,
      pubkey: '028dfa6f41c655e38a0f8f2e3f3aa3e1246907a9bb299933f11996e2a345a21e10',
      validator: 'mantravaloper146mj09yzu3mvz7pmy4dvs4z9wr2mst7ram37xw',
      amount_uom: omToUom('0.01').toString(),
      restake_rewards: false,
    },
  });

  console.log(tx);
  console.log('signing...');
  if (!tx.data?.data) throw new Error('No data in response');
  const signResponse = await k.fireblocks.signOmTx(vault, tx.data.data);
  console.log('broadcasting...');
  if (!signResponse.signed_tx?.data?.signed_tx_serialized) throw new Error('No signed_tx in response');
  const broadcastedTx = await k.client.POST('/om/transaction/broadcast', {
    body: {
      tx_serialized: signResponse.signed_tx.data.signed_tx_serialized,
    },
  });
  console.log(broadcastedTx);
} catch (err) {
  console.log(err);
}
