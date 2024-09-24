import { Kiln } from "../src/kiln";
import type { Integration } from "../lib/types/integrations";
import fs from "node:fs";
import 'dotenv/config'


const apiSecret = fs.readFileSync(`${__dirname}/fireblocks_secret.key`, 'utf8');

const f = async () => {
  const k = new Kiln({
    baseUrl: 'https://api.testnet.kiln.fi',
    apiToken: process.env.KILN_API_KEY,
  });

  const vault: Integration = {
    provider: 'fireblocks',
    fireblocksApiKey: process.env.FIREBLOCKS_API_KEY,
    fireblocksSecretKey: apiSecret,
    vaultId: 14
  };

  try {
    console.log('crafting...');
    const tx = await k.client.POST(
      '/v1/near/transaction/stake',
      {
        body: {
          account_id: 'd3f1b917-72b1-4982-a4dd-93fce579a708',
          wallet: 'c36b1a5da2e60d1fd5d3a6b46f7399eb26571457f3272f3c978bc9527ad2335f',
          pool_id: 'kiln.pool.f863973.m0',
          amount_yocto: '1000000000000000000000000',
        }
      }
    );
    console.log('signing...');
    const signResponse = await k.fireblocks.signNearTx(vault, tx.data.data, "NEAR_TEST");
    console.log('broadcasting...');
    const broadcastedTx = await k.client.POST("/v1/near/transaction/broadcast", {
      body: {
        signed_tx_serialized: signResponse.signed_tx.data.signed_tx_serialized,
      }
    });
    console.log(broadcastedTx);

  } catch (err) {
    console.log(err);
  }
};

f();