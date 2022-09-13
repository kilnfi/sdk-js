import { Kiln } from "../src/kiln";
const fs = require('fs');

const apiSecret = fs.readFileSync(__dirname + '/fireblocks_secret.key', 'utf8');

const f = async () => {
  const k = new Kiln({
    testnet: true,
    apiToken: 'kiln_V1JKOW55SkZMOFZvMzBJYmw0aGQ3bkM3UFpIM2IzeXA6Zi0zcUU3SHNIZTB6WDg2dkVUbUpWbmhLRFFyYmljdm1aQzFqOGcwOWFtY3U0Yk9fZHh6SkVweDJRcUxOVERWMA',
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
    const tx = await k.sol.craftDeactivateStakeTx(
      'AhymNaMJBxLCWRgrNb7Er4bUQoGWpYV2EG4qrGwqzemY',
      '4icse2mPXNgyxxn11tVM7sTnSqDqwJSEzdnaCQnRzvA9',
    );
    const signedTx = await k.sol.sign('vault1', tx);
    const hash = await k.sol.broadcast(signedTx);
    console.log(hash);
  } catch (err){
    console.log(err);
  }
};

f();