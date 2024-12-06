import { Kiln } from "../src/kiln";
import type { Integration } from "../lib/types/integrations";
import fs from "node:fs";
import 'dotenv/config'


const apiSecret = fs.readFileSync(`${__dirname}/fireblocks_secret.key`, 'utf8');

const k = new Kiln({
  baseUrl: process.env.KILN_API_URL,
  apiToken: process.env.KILN_API_KEY,
});

const vault: Integration = {
  provider: 'fireblocks',
  fireblocksApiKey: process.env.FIREBLOCKS_API_KEY,
  fireblocksSecretKey: apiSecret,
  vaultId: 14,
  fireblocksDestinationId: '07df91b4-7788-4833-a8f4-428facef68cc',
};

try {
  console.log('crafting...');
  const tx = await k.client.POST(
    '/eth/transaction/stake',
    {
      body: {
        account_id: process.env.KILN_ACCOUNT_ID,
        wallet: '0x91CcA1b774350232391d337213C0dE544DF1Ed75',
        amount_wei: '32000000000000000000'
      }
    }
  );
  // Sign and broadcast using Fireblocks contract calls
  // console.log('signing and broadcasting...');
  // const res = await k.fireblocks.signAndBroadcastEthTx(vault, tx.data.data, 'ETH_TEST6');
  // console.log(res);

  // Sign and broadcast using Fireblocks raw signing and Kiln Connect to broadcast
  console.log('signing...');
  const signResponse = await k.fireblocks.signEthTx(vault, tx.data.data, "ETH_TEST6");
  console.log('broadcasting...');
  const broadcastedTx = await k.client.POST("/eth/transaction/broadcast", {
    body: {
      tx_serialized: signResponse.signed_tx.data.signed_tx_serialized,
    }
  });
  console.log(broadcastedTx);

} catch (err) {
  console.log(err);
}