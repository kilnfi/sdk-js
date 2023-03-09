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
    const amountWei = k.matic.maticToWei('0.4');
    console.log('crafting...');
    // const txApprove = await k.matic.craftApproveTx(
    //   '0x296a8F811Af114f43db2Bdb2cFB595Cc1Dc4176D',
    //   '0x00200eA4Ee292E253E6Ca07dBA5EdC07c8Aa37A3',
    //   amountWei,
    // );
    // const txStake = await k.matic.craftBuyVoucherTx(
    //   'd3f1b917-72b1-4982-a4dd-93fce579a708',
    //   '0x296a8F811Af114f43db2Bdb2cFB595Cc1Dc4176D',
    //   amountWei,
    // );
    // const txStake = await k.matic.craftSellVoucherTx(
    //   '0x9ce658155a6f05fe4aef83b7fa8f431d5e8ccb55',
    //   amountWei,
    // );
    // const txStake = await k.matic.craftUnstakeClaimTokensTx(
    //   '0x9ce658155a6f05fe4aef83b7fa8f431d5e8ccb55',
    // );
    // const txStake = await k.matic.craftWithdrawRewardsTx(
    //   '0x9ce658155a6f05fe4aef83b7fa8f431d5e8ccb55',
    // );
    const txStake = await k.matic.craftRestakeRewardsTx(
      '0x9ce658155a6f05fe4aef83b7fa8f431d5e8ccb55',
    );
    console.log('signing...');
    const txSigned2 = await k.matic.sign('vault1', txStake);
    console.log('broadcasting...');
    const hash2 = await k.matic.broadcast(txSigned2);
    console.log(hash2);
  } catch (err) {
    console.log(err);
  }
};

f();
