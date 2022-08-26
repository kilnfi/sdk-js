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
    const tx = await k.sol.craftStakeTx(
      '376acfff-e35d-4b7c-90da-c6acb8ea7197',
      '4icse2mPXNgyxxn11tVM7sTnSqDqwJSEzdnaCQnRzvA9',
      0.1,
    );
    const signedTx = await k.sol.sign('vault1', tx);
    const hash = await k.sol.broadcast(signedTx);
    console.log(hash);
  } catch (err){
    console.log(err);
  }
};

f();