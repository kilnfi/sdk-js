import { Kiln, tonToNanoton } from "../src/kiln";
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
  vaultId: 17
};

try {
  console.log('crafting...');
  // const tx = await k.client.POST(
  //   '/v1/ton/transaction/stake-from-vesting-contract',
  //   {
  //     body: {
  //       account_id: process.env.KILN_ACCOUNT_ID as string,
  //       wallet: 'UQAd57R6nYTCpgo1OxSmpbFRsIO6HIIfO2SW6WcfCe5qIo08',
  //       destination_address: 'EQBXDSbE9s03Waq62YuGdtqe-bcjsN6K9fi64eUy9M8H_Yhf',
  //       vesting_contract_address: 'EQBdL-upJbGStg4MF8acfEfilqd34cfoHe_k2E-yecki3yS6',
  //       amount_nanoton: tonToNanoton('1.5').toString(),
  //     }
  //   }
  // );
  const tx = await k.client.POST(
    '/v1/ton/transaction/unstake-from-vesting-contract',
    {
      body: {
        wallet: 'UQAd57R6nYTCpgo1OxSmpbFRsIO6HIIfO2SW6WcfCe5qIo08',
        pool_address: 'EQBXDSbE9s03Waq62YuGdtqe-bcjsN6K9fi64eUy9M8H_Yhf',
        vesting_contract_address: 'EQBdL-upJbGStg4MF8acfEfilqd34cfoHe_k2E-yecki3yS6',
        amount_nanoton: tonToNanoton('1.5').toString(),
      }
    }
  );
  // const tx = await k.client.POST(
  //   '/v1/ton/transaction/stake-nomination-pool',
  //   {
  //     body: {
  //       account_id: process.env.KILN_ACCOUNT_ID as string,
  //       wallet: 'UQAd57R6nYTCpgo1OxSmpbFRsIO6HIIfO2SW6WcfCe5qIo08',
  //       pool_address: 'EQBXDSbE9s03Waq62YuGdtqe-bcjsN6K9fi64eUy9M8H_Yhf',
  //       // vesting_contract_address: 'EQBdL-upJbGStg4MF8acfEfilqd34cfoHe_k2E-yecki3yS6',
  //       amount_nanoton: tonToNanoton('1.5').toString(),
  //     }
  //   }
  // );
  console.log(tx);
  console.log('signing...');
  if(!tx.data?.data) throw new Error('No data in response');
  const signResponse = await k.fireblocks.signTonTx(vault, tx.data.data, "TON");
  console.log('broadcasting...');
  if(!signResponse.signed_tx?.data?.signed_tx_serialized) throw new Error('No signed_tx in response');
  const broadcastedTx = await k.client.POST("/v1/ton/transaction/broadcast", {
    body: {
      tx_serialized: signResponse.signed_tx.data.signed_tx_serialized,
    }
  });
  console.log(broadcastedTx);

} catch (err) {
  console.log(err);
}