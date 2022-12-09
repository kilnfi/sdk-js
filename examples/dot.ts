import { Kiln } from "../src/kiln";

const fs = require('fs');

const apiSecret = fs.readFileSync(__dirname + '/fireblocks_secret.key', 'utf8');

const f = async () => {
  const k = new Kiln({
    testnet: true,
    apiToken: 'kiln_dTkxUTFRdHBMZm9vNFFycFhDSTZCdlJsbjJZang5VnY6ZjF1SUw4d3R1ZDRxYUdreEwtV2sxcjdmbVFJYlhuMWFGUVduRjBkVFJscFdCaUc5bkV2WmpyTU9xb19pSjlsWg',
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

  try {
    // const tx = await k.dot.craftBondTx(
    //   '376acfff-e35d-4b7c-90da-c6acb8ea7197',
    //   '5DK8ShqtyuVk2w4qrF9HwaBJoiZV1byQs5ARZ3df2Pt8V6Vj',
    //   1,
    // );
    // const tx = await k.dot.craftRebondTx(
    //   '5DK8ShqtyuVk2w4qrF9HwaBJoiZV1byQs5ARZ3df2Pt8V6Vj',
    //   1,
    // );

    // const tx = await k.dot.craftNominateTx(
    //   '5DK8ShqtyuVk2w4qrF9HwaBJoiZV1byQs5ARZ3df2Pt8V6Vj',
    // );

    // const tx = await k.dot.craftUnbondTx(
    //   '5DK8ShqtyuVk2w4qrF9HwaBJoiZV1byQs5ARZ3df2Pt8V6Vj',
    //   1,
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
    //
    // const signedTx = await k.dot.sign('vault1', tx);
    // const hash = await k.dot.broadcast(signedTx);
    // console.log(hash);

    const status = await k.dot.getTxStatus(
      {
        blockHash: '0x62ea99ad580e8bfa9d4c79b61b9867838d7086e8c0c8c2ae70226ea37279fc47',
        hash: '0x6c6654109e448117ffb021fba07d38d1b41c6927da465ddc3de7af49760f0bae'
      },
    );

    console.log(status);
  } catch (err) {
    console.log(err);
  }
};

f();