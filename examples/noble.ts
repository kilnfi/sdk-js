import { Kiln, usdcToUusdc } from "../src/kiln";
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
  // const s = await k.fireblocks.getSdk(vault);
  // const p = await s.getPublicKeyInfoForVaultAccount({
  //   assetId: "DYDX_DYDX",
  //   compressed: true,
  //   vaultAccountId: 37,
  //   change: 0,
  //   addressIndex: 0,
  // });
  // console.log(getCosmosAddress('02d92b48d3e9ef34f2016eac7857a02768c88e30aea7a2366bc5ba032a22eceb8b', 'noble'));
  const tx = await k.client.POST(
    '/noble/transaction/burn-usdc',
    {
      body: {
        pubkey: '02d92b48d3e9ef34f2016eac7857a02768c88e30aea7a2366bc5ba032a22eceb8b',
        recipient: '0xBC86717BaD3F8CcF86d2882a6bC351C94580A994',
        amount_uusdc: usdcToUusdc('0.01').toString(),
      }
    }
  );
  console.log('signing...');
  if(!tx.data?.data) throw new Error('No data in response');
  const signResponse = await k.fireblocks.signNobleTx(vault, tx.data.data);
  console.log('broadcasting...');
  if(!signResponse.signed_tx?.data?.signed_tx_serialized) throw new Error('No signed_tx in response');
  const broadcastedTx = await k.client.POST("/noble/transaction/broadcast", {
    body: {
      tx_serialized: signResponse.signed_tx.data.signed_tx_serialized,
    }
  });
  console.log(broadcastedTx);

} catch (err) {
  console.log(err);
}