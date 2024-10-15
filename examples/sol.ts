import { Kiln, solToLamports } from "../src/kiln";
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
    '/v1/sol/transaction/stake',
    {
      body: {
        account_id: 'd3f1b917-72b1-4982-a4dd-93fce579a708',
        wallet: 'E9qDxpwuPFeFB7vDdDibdCbWwHy867eYz3rV29bAevuC',
        amount_lamports: solToLamports('0.01').toString(),
        vote_account_address: 'FwR3PbjS5iyqzLiLugrBqKSa5EKZ4vK9SKs7eQXtT59f'
      }
    }
  );
  console.log('signing...');
  if(!tx.data) throw new Error('No data in response');
  const signResponse = await k.fireblocks.signSolTx(vault, tx.data.data, "SOL_TEST");
  if(!signResponse.signed_tx?.data.signed_tx_serialized) throw new Error('No signed_tx in response');
  console.log('broadcasting...');
  const broadcastedTx = await k.client.POST("/v1/sol/transaction/broadcast", {
    body: {
      tx_serialized: signResponse.signed_tx.data.signed_tx_serialized
    }
  });
  console.log(broadcastedTx);

} catch (err) {
  console.log(err);
}