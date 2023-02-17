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
    const tx = await k.eth.craftStakeTx(
      'd3f1b917-72b1-4982-a4dd-93fce579a708',
      '0x9cE658155A6f05FE4aef83b7Fa8F431D5e8CcB55',
      '32000000000000000000',
    );
    console.log('signing tx...');
    const txSigned = await k.eth.sign('vault1', tx);
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
    //   const status = await k.eth.getTxStatus(hash);
    //   console.log(status);
    // }
  } catch (err) {
    console.log(err);
  }
};

f();
