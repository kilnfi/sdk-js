import { Kiln } from "../src/kiln";
import { Integration } from "../lib/types/integrations";

const fs = require('fs');

const apiSecret = fs.readFileSync(__dirname + '/fireblocks_secret.key', 'utf8');

const f = async () => {
  try {
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

    console.log('crafting...');
    // const tx = await k.ada.craftStakeTx(
    //   '5dcd8897-4fe7-401a-9ad8-3a15dae1fbe8',
    //   'addr_test1qpy358g8glafrucevf0rjpmzx2k5esn5uvjh7dzuakpdhv4g2egyt3y3qw6jrguz0lmyhxygjdg2ytaf5z6ueaety7dsmpcee5',
    // );
    // const tx = await k.ada.craftWithdrawRewardsTx(
    //   'addr_test1qpy358g8glafrucevf0rjpmzx2k5esn5uvjh7dzuakpdhv4g2egyt3y3qw6jrguz0lmyhxygjdg2ytaf5z6ueaety7dsmpcee5',
    // );

    const tx = await k.ada.craftUnstakeTx(
      'addr_test1qpy358g8glafrucevf0rjpmzx2k5esn5uvjh7dzuakpdhv4g2egyt3y3qw6jrguz0lmyhxygjdg2ytaf5z6ueaety7dsmpcee5',
    );
    console.log('signing...');
    const txSigned = await k.ada.sign(vault, tx);
    console.log('broadcasting...');
    const hash = await k.ada.broadcast(txSigned);
    console.log(hash);
    // const status = await k.ada.getTxStatus('aaa64683e93514ed7e7bbafade1ab1e226706fb65233b2f2bc37cb4005e62ed1');
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