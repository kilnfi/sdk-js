import Kiln from "../src/kiln";

const f = async () => {
  const k = new Kiln({
    testnet: true,
    apiToken: 'kiln_dTkxUTFRdHBMZm9vNFFycFhDSTZCdlJsbjJZang5VnY6SkV4T2NLeUV2Y0J0dmhRVHk2VEZjQVpYblFELTMxOVF4Zi1hcktJMEUwakYtTGoxUzgyYk1Rd3U5bWNzMlE1SQ',
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