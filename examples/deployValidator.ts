import { SkillZ } from "..";

const API_TOKEN = "skillz_XXXXXXX";
const keystore = "b64=";
const password = "password";

const s = new SkillZ("prater", API_TOKEN);

(async () => {
  const validator = await s.validators.deployValidator(keystore, password);
  console.log(`Successfully deployed ${validator.publicKey}`);

  const data = await s.validators.getValidatorData(validator.publicKey);
  console.log(`Validator is in state ${data.state}`);

  const all = await s.validators.getValidatorsData();
  console.log(`You already deployed ${all.length} validators`);
})();
