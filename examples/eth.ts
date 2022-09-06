import { Kiln } from "../src/kiln";

const fs = require('fs');

const apiSecret = fs.readFileSync(__dirname + '/fireblocks_secret.key', 'utf8');

const f = async () => {
  const k = new Kiln({
    testnet: true,
    // apiToken: 'kiln_dTkxUTFRdHBMZm9vNFFycFhDSTZCdlJsbjJZang5VnY6ejJoV3FCSTlyZlBtM2ZIM0RFRVVaM3NwTkZReHJXTDZWZUxJMWtWWlVrb3VNYUVzcE9Lakt4ZVplOG9vd1oyVw',
    apiToken: 'kiln_V1JKOW55SkZMOFZvMzBJYmw0aGQ3bkM3UFpIM2IzeXA6YkN6VG9BZW56OWQtUVlGRjNqRW10c1E3R0w2YkRKdjAxQW1Cem5ONnF4Sm1WLUx6STNoRWE2XzdXSVZIc2s0Ug',
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
    console.log(tx);
    const txSigned = await k.eth.sign('vault1', tx);
    const receipt = await k.eth.broadcast(txSigned);
    console.log(receipt);

    const rewards = await k.eth.getStakesRewards(['0xb15c8670d36abe47f03acaa3ba901ac433973048d43df4d2086de4c422ea4d3d0a6b63702d253c15712d3c85997f0071', 'a262bbe9197b0fe7ced73f8af4b13813e0e03a42d62bd223e96b31c8ba379d6c56835c6729647139963f3fade95f52f6']);
    console.log(rewards);
  } catch (err) {
    console.log(err);
  }
};

f();
