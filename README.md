<p align="center">
  <a href="https://skillz.io/" target="blank"><img src="https://www.skillz.io/wp-content/uploads/2021/07/LOGO_skillz-02.svg" width="200" alt="SkillZ logo" /></a>
</p>

## Description

SkillZ JS SDK makes it easy to use SkillZ API in your JavaScript applications.

## Installation

You can install the JS SDK with npm:

```sh
npm install --save @skillz-blockchain/sdk
```

## Example

```js
import { SkillZ } from '@skillz-blockchain/sdk';

apiToken = 'skillz_XXXXXX';
keystore = 'b64=';
password = 'password';

const s = new SkillZ('prater', apiToken);

s.validators.deployValidator(keystore, password)
  .then((validator) => console.log(`${validator.publicKey} deployed!`));
```

