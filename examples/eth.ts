import { Kiln } from "../src/kiln";
import { Integration } from "../lib/types/integrations";

const fs = require('fs');

const apiSecret = fs.readFileSync(__dirname + '/fireblocks_secret.key', 'utf8');

const f = async () => {
  const k = new Kiln({
    testnet: true,
    apiToken: 'kiln_dTkxUTFRdHBMZm9vNFFycFhDSTZCdlJsbjJZang5VnY6cS01ZkhkV3ZrZnZ5cjVZQXk1czl1M29SeXBoeEV0U01wczVpWm1zNTlXSkdjLUkyR1ZIeWpyc291a3pWbEl0MQ',
  });

  const vault: Integration = {
    provider: 'fireblocks',
    fireblocksApiKey: '53aee35e-04b7-9314-8f28-135a66c8af2c',
    fireblocksSecretKey: apiSecret,
    vaultId: 7
  };

  try {
    console.log('crafting tx...');
    const amountWei = k.eth.ethToWei('32');
    const tx = await k.eth.craftStakeTx(
      '5dcd8897-4fe7-401a-9ad8-3a15dae1fbe8',
      '0x9cE658155A6f05FE4aef83b7Fa8F431D5e8CcB55',
      amountWei,
    );
    console.log('signing tx...');
    const txSigned = await k.eth.sign(vault, tx);
    console.log('broadcasting tx...');
    const hash = await k.eth.broadcast(txSigned);
    console.log(hash);

    // const stakes = await k.eth.getStakesByAccounts(['771254de-ac5a-4911-afdf-1d5b7e802dc9']);
    // const stakes = await k.eth.getStakesByValidators(['0xb682de189fd7e6c0e719ba4fcafa1f2ef878824df995617c11a656b99e88fdaf0bd696f48baf35ea8114dfaa67c9bf54']);
    // const stakes = await k.eth.getStakesByWallets(['0xbc86717BaD3F8CcF86D2882A6bC351C94580a994']);
    // const stats = await k.eth.getNetworkStats();
    // console.log(stakes);

    // const rewards = await k.eth.getRewardsByAccounts(['771254de-ac5a-4911-afdf-1d5b7e802dc9'], '2022-11-10', '2022-11-12');
    // const rewards = await k.eth.getRewardsByValidators(['0xb682de189fd7e6c0e719ba4fcafa1f2ef878824df995617c11a656b99e88fdaf0bd696f48baf35ea8114dfaa67c9bf54']);
    // const rewards = await k.eth.getRewardsByWallets(['0xbc86717BaD3F8CcF86D2882A6bC351C94580a994']);
    // console.log(rewards);
    // if(hash){
    //   console.log(hash);
    //   const status = await k.eth.getTxStatus(hash.data.tx_hash);
    //   console.log(status);
    // }
  } catch (err) {
    console.log(err);
  }
};

f();
