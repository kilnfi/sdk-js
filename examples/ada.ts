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

    const tx = await k.ada.craftStakeTx(
      'd3f1b917-72b1-4982-a4dd-93fce579a708',
      'addr_test1qpy358g8glafrucevf0rjpmzx2k5esn5uvjh7dzuakpdhv4g2egyt3y3qw6jrguz0lmyhxygjdg2ytaf5z6ueaety7dsmpcee5',
    );
    // const tx = await k.ada.craftWithdrawRewardsTx(
    //   'addr_test1qpy358g8glafrucevf0rjpmzx2k5esn5uvjh7dzuakpdhv4g2egyt3y3qw6jrguz0lmyhxygjdg2ytaf5z6ueaety7dsmpcee5',
    // );

    // const tx = await k.ada.craftUnstakeTx(
    //   'addr_test1qpy358g8glafrucevf0rjpmzx2k5esn5uvjh7dzuakpdhv4g2egyt3y3qw6jrguz0lmyhxygjdg2ytaf5z6ueaety7dsmpcee5',
    // );
    const txSigned = await k.ada.sign('vault1', tx);
    const hash = await k.ada.broadcast(txSigned);
    console.log(hash);
    // const status = await k.ada.getTxStatus('aad008eec08f606f763837144d18275203406bdada7fc2a429c656c15952dd9c');
    // console.log(status);

    // const stakes = await k.ada.getStakesByAccounts(['771254de-ac5a-4911-afdf-1d5b7e802dc9']);
    // const stakes = await k.ada.getStakesByStakeAddresses(['stake_test1uz59v5z9cjgs8dfp5wp8lajtnzyfx59z9756pdwv7u4j0xcvwv4gp']);
    // const stakes = await k.ada.getStakesByWallets(['addr_test1qpy358g8glafrucevf0rjpmzx2k5esn5uvjh7dzuakpdhv4g2egyt3y3qw6jrguz0lmyhxygjdg2ytaf5z6ueaety7dsmpcee5']);
    // console.log(stakes);

    // const rewards = await k.ada.getRewardsByAccounts(['771254de-ac5a-4911-afdf-1d5b7e802dc9']);
    // const rewards = await k.ada.getRewardsByStakeAddresses(['stake_test1uz59v5z9cjgs8dfp5wp8lajtnzyfx59z9756pdwv7u4j0xcvwv4gp']);
    // const rewards = await k.ada.getRewardsByWallets(['addr_test1qpy358g8glafrucevf0rjpmzx2k5esn5uvjh7dzuakpdhv4g2egyt3y3qw6jrguz0lmyhxygjdg2ytaf5z6ueaety7dsmpcee5']);
    // console.log(rewards);
  } catch (err) {
    console.log(err);
  }
};

f();