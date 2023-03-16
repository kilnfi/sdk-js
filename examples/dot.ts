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
    const amountPlanck = k.dot.wndToPlanck('0.5');
    // const tx = await k.dot.craftBondTx(
    //   '5dcd8897-4fe7-401a-9ad8-3a15dae1fbe8',
    //   '5DK8ShqtyuVk2w4qrF9HwaBJoiZV1byQs5ARZ3df2Pt8V6Vj',
    //   amountPlanck,
    // );
    // const tx = await k.dot.craftBondExtraTx(
    //   '5DK8ShqtyuVk2w4qrF9HwaBJoiZV1byQs5ARZ3df2Pt8V6Vj',
    //   amountPlanck,
    // );
    // const tx = await k.dot.craftRebondTx(
    //   '5DK8ShqtyuVk2w4qrF9HwaBJoiZV1byQs5ARZ3df2Pt8V6Vj',
    //   amountPlanck,
    // );

    const tx = await k.dot.craftNominateTx(
      '5DK8ShqtyuVk2w4qrF9HwaBJoiZV1byQs5ARZ3df2Pt8V6Vj',
      ['5GR6UNoUW3VsXTqwDuMzRpZpeA7pmH3VtZNCaSGp2RGz8p6g']
    );

    // const tx = await k.dot.craftUnbondTx(
    //   '5DK8ShqtyuVk2w4qrF9HwaBJoiZV1byQs5ARZ3df2Pt8V6Vj',
    //   amountPlanck,
    // );

    // const tx = await k.dot.craftWithdrawUnbondedTx(
    //   '5DK8ShqtyuVk2w4qrF9HwaBJoiZV1byQs5ARZ3df2Pt8V6Vj',
    // );

    // const tx = await k.dot.craftChillTx(
    //   '5DK8ShqtyuVk2w4qrF9HwaBJoiZV1byQs5ARZ3df2Pt8V6Vj',
    // );

    // const tx = await k.dot.craftSetControllerTx(
    //   '5DK8ShqtyuVk2w4qrF9HwaBJoiZV1byQs5ARZ3df2Pt8V6Vj',
    //   '5DK8ShqtyuVk2w4qrF9HwaBJoiZV1byQs5ARZ3df2Pt8V6Vj',
    // );

    // const tx = await k.dot.craftSetPayeeTx(
    //   '5DK8ShqtyuVk2w4qrF9HwaBJoiZV1byQs5ARZ3df2Pt8V6Vj',
    //   'Staked',
    // );
    console.log('signing...');
    const signedTx = await k.dot.sign(vault, tx);
    console.log('broadcasting...');
    const hash = await k.dot.broadcast(signedTx);
    console.log(hash);

    // const status = await k.dot.getTxStatus(
    //   {
    //     blockHash: '0x62ea99ad580e8bfa9d4c79b61b9867838d7086e8c0c8c2ae70226ea37279fc47',
    //     hash: '0x6c6654109e448117ffb021fba07d38d1b41c6927da465ddc3de7af49760f0bae'
    //   },
    // );
    //
    // console.log(status);
  } catch (err) {
    console.log(err);
  }
};

f();