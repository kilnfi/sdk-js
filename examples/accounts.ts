import { Kiln } from "../src/kiln";

const f = async () => {
  const k = new Kiln({
    testnet: true,
    apiToken: 'kiln_dTkxUTFRdHBMZm9vNFFycFhDSTZCdlJsbjJZang5VnY6bVE3bUYyUExZeDd3LUM2Ty01THJ2QTlyMmVtUG92NzI5ejRqU19FVzQ3UFdkUFdZTmgyMHJ2VWcxcUdjWXNsMg',
  });

  try {
    const account = await k.accounts.get('3c60e9e8-dc15-423b-9ee6-ea94cc4ea0e7');
    console.log(account);
  } catch (err) {
    console.log(err);
  }
};

f();
