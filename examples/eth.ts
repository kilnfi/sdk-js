import { Kiln } from "../src/kiln";

const fs = require('fs');

const apiSecretPath = fs.readFileSync(__dirname + '/fireblocks_secret.key', 'utf8');

const f = async () => {
  const k = new Kiln({
    testnet: true,
    apiToken: 'kiln_dTkxUTFRdHBMZm9vNFFycFhDSTZCdlJsbjJZang5VnY6bVE3bUYyUExZeDd3LUM2Ty01THJ2QTlyMmVtUG92NzI5ejRqU19FVzQ3UFdkUFdZTmgyMHJ2VWcxcUdjWXNsMg',
    integrations: [
      {
        name: 'fireblocks',
        fireblocksApiKey: '53aee35e-04b7-9314-8f28-135a66c8af2c',
        fireblocksSecretKeyPath: apiSecretPath,
        vaultAccountId: '7'
      }
    ],
  });

  try {
    const tx = await k.eth.craftStakeTx(
      '376acfff-e35d-4b7c-90da-c6acb8ea7197',
      '0x9cE658155A6f05FE4aef83b7Fa8F431D5e8CcB55',
      32
    );
    const txSigned = await k.eth.sign('fireblocks', tx);
    const receipt = await k.eth.broadcast(txSigned);
    console.log(receipt);
  } catch (err) {
    console.log(err);
  }
};

f();
