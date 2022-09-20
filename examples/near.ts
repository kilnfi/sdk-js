import { Kiln } from "../src/kiln";
const fs = require('fs');

const apiSecret = fs.readFileSync(__dirname + '/fireblocks_secret.key', 'utf8');

const f = async () => {
  const k = new Kiln({
    testnet: true,
    apiToken: 'kiln_dTkxUTFRdHBMZm9vNFFycFhDSTZCdlJsbjJZang5VnY6ZjF1SUw4d3R1ZDRxYUdreEwtV2sxcjdmbVFJYlhuMWFGUVduRjBkVFJscFdCaUc5bkV2WmpyTU9xb19pSjlsWg',
    integrations: [
      {
        name: 'vault1',
        provider: 'fireblocks',
        fireblocksApiKey: '53aee35e-04b7-9314-8f28-135a66c8af2c',
        fireblocksSecretKey: apiSecret,
        vaultAccountId: '7'
      }
    ],
  });

  try {
    const tx = await k.near.craftStakeTx(
      '771254de-ac5a-4911-afdf-1d5b7e802dc9',
      '373c6f8e84c6822a9f87035f65cccf899eef3fcdee61077041a93e1805bab24e',
      0.1
    );

    const signedTx = await k.near.sign('vault1', tx);
    const hash = await k.near.broadcast(signedTx);
    console.log(hash);
  } catch (err){
    console.log(err);
  }
};

f();