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
  const tx = await k.client.POST('/trx/transaction/stake', {
    body: {
      account_id: '9d7b0e32-203d-4b1d-9ff1-99ccae420c7f',
      owner_address: 'TAERHY5gyzDRmAaeqqa6C4Fuyc9HLnnHx7',
      amount_sun: Number(trxToSun('1')),
      resource: 'BANDWIDTH',
    },
  });

  if (!tx.data) throw new Error('No data in response');

  console.log('signing...');
  const signResponse = await k.fireblocks.signTrxTx(vault, tx.data.data);

  console.log('broadcasting...');
  const broadcastedTx = await k.client.POST('/trx/transaction/broadcast', {
    body: {
      tx_serialized: signResponse.signed_tx.data.signed_tx_serialized,
    },
  });
  console.log(broadcastedTx);
} catch (err) {
  console.log(err);
}
