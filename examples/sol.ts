import { Kiln } from "../src/kiln";
const fs = require('fs');

const apiSecretPath = fs.readFileSync(__dirname + '/fireblocks_secret.key', 'utf8');

const f = async () => {
  const k = new Kiln({
    testnet: true,
    // apiToken: 'kiln_dTkxUTFRdHBMZm9vNFFycFhDSTZCdlJsbjJZang5VnY6bVE3bUYyUExZeDd3LUM2Ty01THJ2QTlyMmVtUG92NzI5ejRqU19FVzQ3UFdkUFdZTmgyMHJ2VWcxcUdjWXNsMg',
    apiToken: 'kiln_V1JKOW55SkZMOFZvMzBJYmw0aGQ3bkM3UFpIM2IzeXA6YkN6VG9BZW56OWQtUVlGRjNqRW10c1E3R0w2YkRKdjAxQW1Cem5ONnF4Sm1WLUx6STNoRWE2XzdXSVZIc2s0Ug',
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
      'ae6fbced-486c-4ebd-8cbf-c8173d21ea62',
      '4icse2mPXNgyxxn11tVM7sTnSqDqwJSEzdnaCQnRzvA9',
      0.11,
    );
    // const signedTx = await k.sol.sign('vault1', tx);
    // const hash = await k.sol.broadcast(signedTx);
    // console.log(hash);
    // const rewards = await k.sol.getStakesRewards(['4KQWpoTLNHU4Etv7f84dxrCRUFnmjAQAE1nCnymd5LpN', '4EdAdgoBVXGfpXCC3FjnD2ErddU715gyRgaNb1BoF5ra']);
    // console.log(rewards);
  } catch (err){
    console.log(err);
  }
};

f();