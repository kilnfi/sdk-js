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
    console.log('crafting...');
    const tx = await k.near.craftStakeTx(
      '5dcd8897-4fe7-401a-9ad8-3a15dae1fbe8',
      '373c6f8e84c6822a9f87035f65cccf899eef3fcdee61077041a93e1805bab24e',
      'kiln.pool.f863973.m0',
      0.1,
    );

    // const tx = await k.near.craftUnstakeTx(
    //   '373c6f8e84c6822a9f87035f65cccf899eef3fcdee61077041a93e1805bab24e',
    //   'kiln.pool.f863973.m0',
    //   amountYocto,
    // );
    // const tx = await k.near.craftWithdrawTx(
    //   '373c6f8e84c6822a9f87035f65cccf899eef3fcdee61077041a93e1805bab24e',
    //   'kiln.pool.f863973.m0',
    //   amountYocto,
    // );
    // console.log('signing...');
    // const signedTx = await k.near.sign(vault, tx);
    // console.log('broadcasting...');
    // const hash = await k.near.broadcast(signedTx);
    // console.log(hash);
    // const tx = await k.near.getTxStatus('GXVzCja4BpAaHFRGPkQvR3p7pix2CzAyu3DM2FvdBrNb', 'kiln.pool.f863973.m0');
    // console.log(tx);
    // const stakes = await k.near.getStakesByAccounts(['5dcd8897-4fe7-401a-9ad8-3a15dae1fbe8']);
    // const stakes = await k.near.getStakesByStakeAccounts(['kiln.pool.f863973.m0_373c6f8e84c6822a9f87035f65cccf899eef3fcdee61077041a93e1805bab24e']);
    // const stakes = await k.near.getStakesByWallets(['373c6f8e84c6822a9f87035f65cccf899eef3fcdee61077041a93e1805bab24e']);
    // console.log(stakes);
    // const rewards = await k.near.getRewardsByAccounts(['5dcd8897-4fe7-401a-9ad8-3a15dae1fbe8'], '2022-12-24', '2022-12-25');
    // const rewards = await k.near.getRewardsByStakeAccounts(['kiln.pool.f863973.m0_373c6f8e84c6822a9f87035f65cccf899eef3fcdee61077041a93e1805bab24e'], '2022-12-24', '2022-12-25');
    // const rewards = await k.near.getRewardsByWallets(['373c6f8e84c6822a9f87035f65cccf899eef3fcdee61077041a93e1805bab24e'], '2022-12-24', '2022-12-25');
    // console.log(rewards);
    const stats = await k.near.getNetworkStats();
    console.log(stats);
  } catch (err) {
    console.log(err);
  }
};

f();