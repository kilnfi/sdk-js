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
    // const tx = await k.sol.craftStakeTx(
    //   'd3f1b917-72b1-4982-a4dd-93fce579a708',
    //   '4icse2mPXNgyxxn11tVM7sTnSqDqwJSEzdnaCQnRzvA9',
    //   '200000000',
    // );
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
    // const signedTx = await k.sol.sign('vault1', tx);
    // const hash = await k.sol.broadcast(signedTx);
    // console.log(hash);

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
    const tx = await k.sol.getTxStatus('569uGMNQR4vVeukdSTmLtrzs5ZSiAFTk3tPTBavJjZ1H7b3be2EB8ZjRcfhTA6gBApien2tbJgKYayDVtRKFRfUu');
    console.log(tx);
  } catch (err){
    console.log(err);
  }
};

f();