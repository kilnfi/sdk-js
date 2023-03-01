import { Kiln } from "../src/kiln";

const fs = require('fs');

const apiSecret = fs.readFileSync(__dirname + '/fireblocks_secret.key', 'utf8');

const f = async () => {
  const k = new Kiln({
    testnet: true,
    apiToken: 'kiln_Q3VFTHU0WW85Q2Z1dXJqMUFYSmtFYnFIZElpM3dwbFE6WWhxNGlobEJEbzktMm1zUm4tdUJhUDdPZml0NTdxdTIxVEVYczZlaDVQVTlEVk9TM1B5N0J6UV9xSFJVRzJKTg',
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
    console.log('crafting tx...');
    const amountWei = k.matic.maticToWei('0.01');
    const tx = await k.matic.craftStakeTx(
      'd3f1b917-72b1-4982-a4dd-93fce579a708',
      '0x9cE658155A6f05FE4aef83b7Fa8F431D5e8CcB55',
      amountWei,
    );
    console.log(tx);
    console.log('signing tx...');
    const txSigned = await k.matic.sign('vault1', tx);
    console.log(txSigned);
    console.log('broadcasting tx...');
    const hash = await k.eth.broadcast(txSigned);
    console.log(hash);
  } catch (err) {
    console.log(err);
  }
};

f();
