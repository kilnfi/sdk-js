const { Kiln } = require('../src/kiln');

const f = async () => {
  const k = new Kiln({
    testnet: false,
    apiToken: '',
  });

  const tx = await k.sol.craftStakeTx(
    'yoyo',
    'Fhe9DYMVa2ikhBZSXYzCnvBritms6e6qcsHnTMEym3yv',
    2
  );
  console.log(tx);
};

f();