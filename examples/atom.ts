import { Kiln } from "../src/kiln";
const fs = require('fs');

const apiSecretPath = fs.readFileSync(__dirname + '/fireblocks_secret.key', 'utf8');

const f = async () => {
  const k = new Kiln({
    testnet: true,
    apiToken: 'kiln_dTkxUTFRdHBMZm9vNFFycFhDSTZCdlJsbjJZang5VnY6bVE3bUYyUExZeDd3LUM2Ty01THJ2QTlyMmVtUG92NzI5ejRqU19FVzQ3UFdkUFdZTmgyMHJ2VWcxcUdjWXNsMg',
    integrations: [
      {
        name: 'vault1',
        provider: 'fireblocks',
        fireblocksApiKey: '53aee35e-04b7-9314-8f28-135a66c8af2c',
        fireblocksSecretKeyPath: apiSecretPath,
        vaultAccountId: '7'
      }
    ],
  });

  try {
    // const tx = await k.atom.craftStakeTx(
    //   '376acfff-e35d-4b7c-90da-c6acb8ea7197',
    //   'cosmos19c9fdh488vqjclltwp68jm50ydwyh36jqeatev',
    //   0.1,
    //   {
    //     validatorAddress: 'cosmosvaloper17hskshytlrepzhas628uk00jvvppg7yfj3wpqz'
    //   }
    // );
    const tx = await k.atom.craftUnstakeTx(
      'cosmos19c9fdh488vqjclltwp68jm50ydwyh36jqeatev',
      'cosmosvaloper17hskshytlrepzhas628uk00jvvppg7yfj3wpqz',
    );

    const signedTx = await k.atom.sign('vault1', tx);
    const hash = await k.atom.broadcast(signedTx);
    console.log(hash);
  } catch (err){
    console.log(err);
  }
};

f();