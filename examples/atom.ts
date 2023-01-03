import { Kiln } from "../src/kiln";
const fs = require('fs');

const apiSecret = fs.readFileSync(__dirname + '/fireblocks_secret.key', 'utf8');

const f = async () => {
  const k = new Kiln({
    testnet: false,
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
    // const tx = await k.atom.craftStakeTx(
    //   '376acfff-e35d-4b7c-90da-c6acb8ea7197',
    //   'cosmos19c9fdh488vqjclltwp68jm50ydwyh36jqeatev',
    //   0.1,
    // );
    // const tx = await k.atom.craftUnstakeTx(
    //   'cosmos19c9fdh488vqjclltwp68jm50ydwyh36jqeatev',
    //   'cosmosvaloper17hskshytlrepzhas628uk00jvvppg7yfj3wpqz',
    //   0.1
    // );

    // const signedTx = await k.atom.sign('vault1', tx);
    // const hash = await k.atom.broadcast(signedTx);
    // console.log(hash);
    const tx = await k.atom.getTxStatus('D43C977E0A969B00CB79CFAC45F147C9C7DE5B6B735CFDA685EE3CFCE1DE5B33');
    console.log(tx);
  } catch (err){
    console.log(err);
  }
};

f();