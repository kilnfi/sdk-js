import { Kiln } from "../src/kiln";
import fs from "node:fs";
import 'dotenv/config'
import type { FireblocksIntegration } from "../src/fireblocks.ts";


const apiSecret = fs.readFileSync(`${__dirname}/fireblocks_secret.key`, 'utf8');

const k = new Kiln({
  baseUrl: process.env.KILN_API_URL as string,
  apiToken: process.env.KILN_API_KEY as string,
});

const vault: FireblocksIntegration = {
  provider: 'fireblocks',
  fireblocksApiKey: process.env.FIREBLOCKS_API_KEY as string,
  fireblocksSecretKey: apiSecret,
  vaultId: 14
};

try {
  console.log('crafting...');
  const tx = await k.client.POST(
    '/xtz/transaction/delegate',
    {
      body: {
        account_id: 'd3f1b917-72b1-4982-a4dd-93fce579a708',
        wallet: 'tz1WmYmabzcmguEiJzZyL4rKDhBdgfa1bLod',
        baker_address: 'tz1YgDUQV2eXm8pUWNz3S5aWP86iFzNp4jnD'
      }
    }
  );
  console.log('signing...');
  if(!tx.data) throw new Error('No data in response');
  const signResponse = await k.fireblocks.signXtzTx(vault, tx.data.data, "XTZ_TEST");
  if(!signResponse.signed_tx?.data.signed_tx_serialized) throw new Error('No signed_tx in response');
  console.log('broadcasting...');
  const broadcastedTx = await k.client.POST("/xtz/transaction/broadcast", {
    body: {
      tx_serialized: signResponse.signed_tx.data.signed_tx_serialized
    }
  });
  console.log(broadcastedTx);

} catch (err) {
  console.log(err);
}