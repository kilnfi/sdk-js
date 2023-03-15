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
    const amountUatom = k.atom.atomToUatom('0.5');
    const tx = await k.atom.craftStakeTx(
      '376acfff-e35d-4b7c-90da-c6acb8ea7197',
      'cosmos19c9fdh488vqjclltwp68jm50ydwyh36jqeatev',
      amountUatom,
    );
    // const tx = await k.atom.craftWithdrawRewardsTx(
    //   'cosmos19c9fdh488vqjclltwp68jm50ydwyh36jqeatev',
    // );
    // const tx = await k.atom.craftUnstakeTx(
    //   'cosmos19c9fdh488vqjclltwp68jm50ydwyh36jqeatev',
    //   'cosmosvaloper178h4s6at5v9cd8m9n7ew3hg7k9eh0s6wptxpcn',
    //   amountUatom
    // );

    console.log('signing...');
    const signedTx = await k.atom.sign(vault, tx);
    console.log('broadcasting...');
    const hash = await k.atom.broadcast(signedTx);
    console.log(hash);
    // const tx = await k.atom.getTxStatus('D43C977E0A969B00CB79CFAC45F147C9C7DE5B6B735CFDA685EE3CFCE1DE5B33');
    // console.log(tx);
  } catch (err){
    console.log(err);
  }
};

f();