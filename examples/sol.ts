import Kiln from "../src/kiln";

const f = async () => {
  const k = new Kiln({
    testnet: false,
    apiToken: '',
  });

  try {
    const tx = await k.sol.craftStakeTx(
      'gjhg',
      'Fhe9DYMVa2ikhBZSXYzCnvBritms6e6qcsHnTMEym3yv',
      2
    );
    console.log(tx);
  } catch (err){
    console.log(err);
  }
};

f();