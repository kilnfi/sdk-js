import { kavaToUkava, Kiln } from "../src/kiln";
import fs from "node:fs";
import 'dotenv/config'
import type { FireblocksIntegration } from "../src/fireblocks.ts";


const apiSecret = fs.readFileSync(`${__dirname}/fireblocks_secret_prod.key`, 'utf8');

const k = new Kiln({
  baseUrl: process.env.KILN_API_URL as string,
  apiToken: process.env.KILN_API_KEY as string,
});

const vault: FireblocksIntegration = {
  provider: 'fireblocks',
  fireblocksApiKey: process.env.FIREBLOCKS_API_KEY as string,
  fireblocksSecretKey: apiSecret,
  vaultId: 37
};

try {
  console.log('crafting...');
  const tx = await k.client.POST(
    '/kava/transaction/stake',
    {
      body: {
        account_id: process.env.KILN_ACCOUNT_ID as string,
        pubkey: '0233335b6c68a85e01b85055d0e8c2fcef42fed977898422ef3a5f6baf9a9a413e',
        validator: 'kavavaloper1djqecw6nn5tydxq0shan7srv8j65clsf79myt8',
        amount_ukava: kavaToUkava('0.01').toString(),
      }
    }
  );
  console.log('signing...');
  if(!tx.data?.data) throw new Error('No data in response');
  const signResponse = await k.fireblocks.signKavaTx(vault, tx.data.data);
  console.log('broadcasting...');
  if(!signResponse.signed_tx?.data?.signed_tx_serialized) throw new Error('No signed_tx in response');
  const broadcastedTx = await k.client.POST("/kava/transaction/broadcast", {
    body: {
      tx_serialized: signResponse.signed_tx.data.signed_tx_serialized,
    }
  });
  console.log(broadcastedTx);

} catch (err) {
  console.log(err);
}