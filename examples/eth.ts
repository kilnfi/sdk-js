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
        vaultAccountId: '7'
      }
    ],
  });

  try {
    const tx = await k.eth.craftStakeTx(
      '376acfff-e35d-4b7c-90da-c6acb8ea7197',
      '0x9cE658155A6f05FE4aef83b7Fa8F431D5e8CcB55',
      32,
    );
    const txSigned = await k.eth.sign('vault1', tx);
    const hash = await k.eth.broadcast(txSigned);
    //
    // const rewards = await k.eth.getStakesRewards(['0xb15c8670d36abe47f03acaa3ba901ac433973048d43df4d2086de4c422ea4d3d0a6b63702d253c15712d3c85997f0071', 'a262bbe9197b0fe7ced73f8af4b13813e0e03a42d62bd223e96b31c8ba379d6c56835c6729647139963f3fade95f52f6']);
    // console.log(rewards);
    if(hash){
      console.log(hash);
      const status = await k.eth.getTxStatus(hash);
      console.log(status);
    }
  } catch (err) {
    console.log(err);
  }
};

f();
