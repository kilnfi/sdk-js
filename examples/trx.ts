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
  const tx = await k.client.POST('/trx/stake' as '/trx/transaction/stake', {
    body: {
      account_id: '',
      owner_address: 'TAERHY5gyzDRmAaeqqa6C4Fuyc9HLnnHx7',
      amount_sun: trxToSun('1').toString(),
      // amount_sun: '1000000',
      resource: 'BANDWIDTH',
    },
  });

  // const toto = await fetch('http://localhost:8080/v1/trx/stake', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     owner_address: 'TAERHY5gyzDRmAaeqqa6C4Fuyc9HLnnHx7',
  //     amount_sun: '1000000',
  //     resource: 'BANDWIDTH',
  //   }),
  // });

  // const tx = { data: await toto.json() };
  console.log(tx);

  // const tx = {
  //   data: {
  //     data: {
  //       unsigned_tx_serialized:
  //         '0a020c7922089ceb6747a56b0ab140c89ffbb5be325a57083612530a34747970652e676f6f676c65617069732e636f6d2f70726f746f636f6c2e467265657a6542616c616e63655632436f6e7472616374121b0a154102e07e61860efd34e1bdedcb5b485da75407d8f110c0843d70e8ed9bb4be32',
  //     },
  //   },
  // };

  if (!tx.data) throw new Error('No data in response');

  console.log('signing...');
  const signResponse = await k.fireblocks.signTrxTx(vault, tx.data.data);

  console.log('signResponse', signResponse);

  console.log('broadcasting...');
  const broadcastedTx = await k.client.POST('/trx/broadcast' as '/trx/transaction/broadcast', {
    body: {
      tx_serialized: signResponse.signed_tx.data.signed_tx_serialized,
    },
  });
  console.dir(broadcastedTx, { depth: Infinity });
} catch (err) {
  console.log(err);
}
