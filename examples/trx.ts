import { Kiln, trxToSun } from '../src/kiln';
import type { FireblocksIntegration } from '../src/fireblocks';
import fs from 'node:fs';
import 'dotenv/config';

const apiSecret = fs.readFileSync(`${__dirname}/fireblocks_secret_prod.key`, 'utf8');

const k = new Kiln({
  baseUrl: process.env.KILN_API_URL as string,
  apiToken: process.env.KILN_API_KEY,
});

const vault: FireblocksIntegration = {
  provider: 'fireblocks',
  fireblocksApiKey: process.env.FIREBLOCKS_API_KEY as string,
  fireblocksSecretKey: apiSecret,
  vaultId: 17,
};

try {
  console.log('crafting...');
  // const tx = await k.client.POST('/trx/transaction/stake', {
  const tx = await k.client.POST('/trx/stake', {
    body: {
      owner_address: 'TAERHY5gyzDRmAaeqqa6C4Fuyc9HLnnHx7',
      amount_sun: trxToSun('1').toString(),
      resource: 'BANDWIDTH',
    },
  });
  console.log('signing...');
  const signResponse = await k.fireblocks.signTrxTx(vault, tx.data.data);
  console.log('broadcasting...');
  // const broadcastedTx = await k.client.POST('/near/transaction/broadcast', {
  const broadcastedTx = await k.client.POST('/trx/broadcast', {
    body: {
      tx_serialized: signResponse.signed_tx,
    },
  });
  console.log(broadcastedTx);
} catch (err) {
  console.log(err);
}
