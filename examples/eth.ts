import Kiln from "../src/kiln";

const f = async () => {
  const k = new Kiln({
    testnet: true,
    apiToken: 'kiln_dTkxUTFRdHBMZm9vNFFycFhDSTZCdlJsbjJZang5VnY6SkV4T2NLeUV2Y0J0dmhRVHk2VEZjQVpYblFELTMxOVF4Zi1hcktJMEUwakYtTGoxUzgyYk1Rd3U5bWNzMlE1SQ',
  });

  try {
    const tx = await k.eth.craftStakeTx(
      '376acfff-e35d-4b7c-90da-c6acb8ea7197',
      '0xBC86717BaD3F8CcF86d2882a6bC351C94580A994',
      32
    );
    console.log(tx);
  } catch (err) {
    console.log(err);
  }
};

f();
