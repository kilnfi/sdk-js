import { Kiln } from "../src/kiln";
import { Integration } from '../lib/types/integrations';

const fs = require('fs');

const apiSecret = fs.readFileSync(__dirname + '/fireblocks_secret.key', 'utf8');

const f = async () => {
  try {
    const k = new Kiln({
      testnet: true,
      apiToken: 'kiln_dTkxUTFRdHBMZm9vNFFycFhDSTZCdlJsbjJZang5VnY6cS01ZkhkV3ZrZnZ5cjVZQXk1czl1M29SeXBoeEV0U01wczVpWm1zNTlXSkdjLUkyR1ZIeWpyc291a3pWbEl0MQ',
    });

    const vault: Integration = {
      name: 'vault-1',
      provider: 'fireblocks',
      fireblocksApiKey: '53aee35e-04b7-9314-8f28-135a66c8af2c',
      fireblocksSecretKey: apiSecret,
      vaultId: 7
    };

    // console.log('crafting...');
    // const tx = await k.xtz.craftStakeTx(
    //   '5dcd8897-4fe7-401a-9ad8-3a15dae1fbe8',
    //   'tz1TX3Nh6h6js1VxXCuQ7rAF7LoGpd81FSw3',
    //   'tz3btDQsDkqq2G7eBdrrLqetaAfLVw6BnPez'
    // );
    // // const tx = await k.xtz.craftUnStakeTx('tz1TX3Nh6h6js1VxXCuQ7rAF7LoGpd81FSw3');
    // console.log('signing...');
    // const txSigned = await k.xtz.sign(vault, tx);
    // console.log('broadcasting...');
    // const txHash = await k.xtz.broadcast(txSigned);
    // console.log(txHash);
    // const status = await k.xtz.getTxStatus(2145148, 'opN2rgbvxyu5dQPPU8G7jZUPeK5aBPeqzaPaDfksry34hFLx31N');
    // console.log(status);
    // const stakes = await k.xtz.getStakesByAccounts(['5dcd8897-4fe7-401a-9ad8-3a15dae1fbe8']);
    // const stakes = await k.xtz.getStakesByWallets(['tz1TX3Nh6h6js1VxXCuQ7rAF7LoGpd81FSw3']);
    // console.log(stakes);
    // const rewards = await k.xtz.getRewardsByAccounts(['5dcd8897-4fe7-401a-9ad8-3a15dae1fbe8'], '2022-10-30', '2022-10-31');
    // const rewards = await k.xtz.getRewardsByWallets(['tz1TX3Nh6h6js1VxXCuQ7rAF7LoGpd81FSw3'], '2023-03-13', '2023-03-14');
    // console.log(rewards);
    const stats = await k.xtz.getNetworkStats();
    console.log(stats);
  } catch (err) {
    console.log(err);
  }
};

f();