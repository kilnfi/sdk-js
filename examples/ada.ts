import { Kiln } from "../src/kiln";
const fs = require('fs');

const apiSecretPath = fs.readFileSync(__dirname + '/fireblocks_secret.key', 'utf8');

const f = async () => {
  try {
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

    const tx = await k.ada.craftStakeTx(
      '376acfff-e35d-4b7c-90da-c6acb8ea7197',
      'addr_test1qpy358g8glafrucevf0rjpmzx2k5esn5uvjh7dzuakpdhv4g2egyt3y3qw6jrguz0lmyhxygjdg2ytaf5z6ueaety7dsmpcee5',
    );

    const txSigned = await k.ada.sign('vault1', tx);
    // const hash = await k.ada.broadcast(txSigned);
    // console.log(hash);
  } catch (err){
    console.log(err);
  }
};

f();