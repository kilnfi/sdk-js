import { Kiln } from "../src/kiln";

const fs = require('fs');

const apiSecret = fs.readFileSync(__dirname + '/fireblocks_secret.key', 'utf8');

const f = async () => {
  try {
    const k = new Kiln({
      testnet: true,
      apiToken: 'kiln_Q3VFTHU0WW85Q2Z1dXJqMUFYSmtFYnFIZElpM3dwbFE6WWhxNGlobEJEbzktMm1zUm4tdUJhUDdPZml0NTdxdTIxVEVYczZlaDVQVTlEVk9TM1B5N0J6UV9xSFJVRzJKTg',
      integrations: [
        {
          name: 'vault1',
          provider: 'fireblocks',
          fireblocksApiKey: '53aee35e-04b7-9314-8f28-135a66c8af2c',
          fireblocksSecretKey: apiSecret,
          vaultAccountId: '7',
        },
      ],
    });

    const tx = await k.xtz.craftStakeTx('d3f1b917-72b1-4982-a4dd-93fce579a708', 'tz1TX3Nh6h6js1VxXCuQ7rAF7LoGpd81FSw3');
    // const tx = await k.xtz.craftUnStakeTx('tz1TX3Nh6h6js1VxXCuQ7rAF7LoGpd81FSw3');
    const txSigned = await k.xtz.sign('vault1', tx);
    const txHash = await k.xtz.broadcast(txSigned);
    console.log(txHash);
    const status = await k.xtz.getTxStatus(1992906, txHash.data.tx_hash);
    // console.log(status);
  } catch (err) {
    console.log(err);
  }
};

f();