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
    // const tx = await k.sol.craftStakeTx(
    //   '771254de-ac5a-4911-afdf-1d5b7e802dc9',
    //   '4icse2mPXNgyxxn11tVM7sTnSqDqwJSEzdnaCQnRzvA9',
    //   0.12
    // );
    // const tx = await k.sol.craftMergeStakeAccountsTx(
    //   'Atms8wevMwkrMy7Nb5uqftayQSzxLHP2zNXq9gBS7vWB',
    //   '2ax6R5pHCS4hLC4q6xfrqToQ36hyy5PofUDodCGWkNtJ',
    //   '4icse2mPXNgyxxn11tVM7sTnSqDqwJSEzdnaCQnRzvA9',
    // );
    // const tx = await k.sol.craftSplitStakeAccountTx(
    //   '771254de-ac5a-4911-afdf-1d5b7e802dc9',
    //   '2ax6R5pHCS4hLC4q6xfrqToQ36hyy5PofUDodCGWkNtJ',
    //   '4icse2mPXNgyxxn11tVM7sTnSqDqwJSEzdnaCQnRzvA9',
    //   0.1
    // );
    // const signedTx = await k.sol.sign('vault1', tx);
    // const hash = await k.sol.broadcast(signedTx);
    // console.log(hash);

    // const accounts = await k.sol.getAccountsRewards(['771254de-ac5a-4911-afdf-1d5b7e802dc9']);
    // console.log(accounts);
    const tx = await k.sol.getTxStatus('26GZcovnvTGvf5fXFysbtJkNob5r4K9v4H8ZU9tSm8oF5hgUuUm231cabS8LCiC1cqQMFiRkNRNEgqtiVwpr2Bek');
    console.log(tx);
  } catch (err){
    console.log(err);
  }
};

f();