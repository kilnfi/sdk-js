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
    const amountWei = k.matic.maticToWei('0.2');
    console.log('crafting...');
    // const tx = await k.matic.craftApproveTx(
    //   '0x9ce658155a6f05fe4aef83b7fa8f431d5e8ccb55',
    //   '0x00200eA4Ee292E253E6Ca07dBA5EdC07c8Aa37A3',
    //   amountWei,
    // );
    const tx = await k.matic.craftBuyVoucherTx(
      '5dcd8897-4fe7-401a-9ad8-3a15dae1fbe8',
      '0x9ce658155a6f05fe4aef83b7fa8f431d5e8ccb55',
      '0xc8A5dF49EF9D12B41Ecd9DA0DA864e87FD1e1257',
      amountWei,
    );
    // const tx = await k.matic.craftSellVoucherTx(
    //   '0x9ce658155a6f05fe4aef83b7fa8f431d5e8ccb55',
    //   '0xc8A5dF49EF9D12B41Ecd9DA0DA864e87FD1e1257',
    //   amountWei,
    // );
    // const tx = await k.matic.craftUnstakeClaimTokensTx(
    //   '0x9ce658155a6f05fe4aef83b7fa8f431d5e8ccb55',
    //   '0xc8A5dF49EF9D12B41Ecd9DA0DA864e87FD1e1257'
    // );
    // const tx = await k.matic.craftWithdrawRewardsTx(
    //   '0x9ce658155a6f05fe4aef83b7fa8f431d5e8ccb55',
    //   '0xc8A5dF49EF9D12B41Ecd9DA0DA864e87FD1e1257'
    // );
    // const tx = await k.matic.craftRestakeRewardsTx(
    //   '0x9ce658155a6f05fe4aef83b7fa8f431d5e8ccb55',
    // );
    console.log('signing...');
    const txSigned2 = await k.matic.sign(vault, tx);
    console.log('broadcasting...');
    const hash2 = await k.matic.broadcast(txSigned2);
    console.log(hash2);
  } catch (err) {
    console.log(err);
  }
};

f();
