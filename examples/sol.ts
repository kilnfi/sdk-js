import { Kiln } from "../src/kiln";
import { Integration } from '../lib/types/integrations';
const fs = require('fs');

const apiSecret = fs.readFileSync(__dirname + '/fireblocks_secret.key', 'utf8');

const f = async () => {
  const k = new Kiln({
    testnet: true,
    apiToken: 'kiln_dTkxUTFRdHBMZm9vNFFycFhDSTZCdlJsbjJZang5VnY6cS01ZkhkV3ZrZnZ5cjVZQXk1czl1M29SeXBoeEV0U01wczVpWm1zNTlXSkdjLUkyR1ZIeWpyc291a3pWbEl0MQ',
  });
  
  const vault: Integration = {
    name: 'vault-1',
    provider: 'fireblocks',
    fireblocksApiKey: '53aee35e-04b7-9314-8f28-135a66c8af2c',
    fireblocksSecretKey: apiSecret,
    vaultId: 7
  };

  try {
    console.log('crafting tx...');
    const amount = k.sol.solToLamports('0.1');
    const tx = await k.sol.craftStakeTx(
      '5dcd8897-4fe7-401a-9ad8-3a15dae1fbe8',
      '4icse2mPXNgyxxn11tVM7sTnSqDqwJSEzdnaCQnRzvA9',
      'FwR3PbjS5iyqzLiLugrBqKSa5EKZ4vK9SKs7eQXtT59f',
      amount,
    );
    // const tx = await k.sol.craftDeactivateStakeTx(
    //   '3M7sFDMdUxfNNSmKk2ZmDKgKJFzuLvxpuXKDTLRGXpcK',
    //   '4icse2mPXNgyxxn11tVM7sTnSqDqwJSEzdnaCQnRzvA9',
    // );
    // const tx = await k.sol.craftWithdrawStakeTx(
    //   '3M7sFDMdUxfNNSmKk2ZmDKgKJFzuLvxpuXKDTLRGXpcK',
    //   '4icse2mPXNgyxxn11tVM7sTnSqDqwJSEzdnaCQnRzvA9',
    // );
    // const tx = await k.sol.craftMergeStakesTx(
    //   'HQQkoFXHz1XemQHFhC3mN1CGdfH8Pokw2DfFUmwZCRWb',
    //   'GyPnKF88P8c3jESicELWLrxAmeF9PoaKzqYGREDuEAMx',
    //   '4icse2mPXNgyxxn11tVM7sTnSqDqwJSEzdnaCQnRzvA9',
    // );
    // const tx = await k.sol.craftSplitStakeAccountTx(
    //   'd3f1b917-72b1-4982-a4dd-93fce579a708',
    //   'GyPnKF88P8c3jESicELWLrxAmeF9PoaKzqYGREDuEAMx',
    //   '4icse2mPXNgyxxn11tVM7sTnSqDqwJSEzdnaCQnRzvA9',
    //   '200000000'
    // );
    console.log('signing tx...');
    const txSigned = await k.sol.sign(vault, tx);
    console.log('broadcasting tx...');
    const txHash = await k.sol.broadcast(txSigned);
    console.log(txHash);

    // const stakes = await k.sol.getStakesByAccounts(['771254de-ac5a-4911-afdf-1d5b7e802dc9']);
    // const stakes = await k.sol.getStakesByStakeAccounts(['22njeUeaSxRL9RUf6cFrn5BMBGhpotAgVvjfnWfh2qsm']);
    // const stakes = await k.sol.getStakesByWallets(['c5oiYqNcFYVMvWvQ8ifLTjZTsJ8s3X9gitRHFaNi2rk']);
    // console.log(stakes);

    // const rewards = await k.sol.getRewardsByAccounts(['771254de-ac5a-4911-afdf-1d5b7e802dc9']);
    // const rewards = await k.sol.getRewardsByStakeAccounts(['22njeUeaSxRL9RUf6cFrn5BMBGhpotAgVvjfnWfh2qsm']);
    // const rewards = await k.sol.getRewardsByWallets(['c5oiYqNcFYVMvWvQ8ifLTjZTsJ8s3X9gitRHFaNi2rk']);
    // console.log(rewards);

    // const accounts = await k.sol.getAccountsRewards(['771254de-ac5a-4911-afdf-1d5b7e802dc9']);
    // console.log(accounts);
    // const txStatus = await k.sol.getTxStatus(txHash.data.tx_hash);
    // console.log(tx);
  } catch (err){
    console.log(err);
  }
};

f();