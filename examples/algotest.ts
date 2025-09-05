import { loadEnv } from './env.ts';
import algosdk from 'algosdk';
import { AlgorandClient, microAlgo } from '@algorandfoundation/algokit-utils';
import { Fireblocks } from '@fireblocks/ts-sdk';
import { FireblocksSigner } from '../src/fireblocks_signer.ts';
import nacl from 'tweetnacl';

const { fireblocksApiKey, fireblocksApiSecret, fireblocksVaultId } = await loadEnv();

const vault = {
  config: {
    apiKey: fireblocksApiKey,
    secretKey: fireblocksApiSecret,
    basePath: 'https://api.fireblocks.io/v1',
  },
  vaultId: fireblocksVaultId,
};

const fireblocks = new Fireblocks(vault.config);

//
// Get the wallet address from Fireblocks
//
const fireblocksWallet = (
  await fireblocks.vaults.getVaultAccountAssetAddressesPaginated({
    vaultAccountId: vault.vaultId,
    assetId: 'ALGO',
    limit: 1,
  })
).data.addresses?.[0].address;

if (!fireblocksWallet) {
  console.log('Failed to get fireblocks wallet');
  process.exit(0);
}

//
// Craft the transaction
//
console.log('Crafting transaction...');
const sender_address = fireblocksWallet;
const RETI_APP_ADDRESS = '5Y2WY2NT3XWORLDCN7XXS4IOKXWZHZ2EUWU7DUA65DYCRMLR5NK4KADA6Y';
const algorandClient = AlgorandClient.mainNet();
const gasMethod = algosdk.ABIMethod.fromSignature('gas()void');
const addStakeMethod = algosdk.ABIMethod.fromSignature('addStake(pay,uint64,uint64)(uint64,uint64,uint64)');
const removeStakeMethod = algosdk.ABIMethod.fromSignature('removeStake(address,uint64)void');
const validatorAppId = 2714516089n;
const poolAppId = 2725738169n;

/**
 * SEND TXs
 */
// const composer = algorandClient
//   .newGroup()
//   .addPayment({
//     sender: sender_address,
//     receiver: sender_address,
//     amount: microAlgo(Number(10000)),
//   })
//   .addPayment({
//     sender: sender_address,
//     receiver: sender_address,
//     amount: microAlgo(Number(20000)),
//   });

/**
 * STAKE TXs
 */

const stakeTransferTx = algorandClient.createTransaction.payment({
  sender: sender_address,
  receiver: RETI_APP_ADDRESS,
  amount: microAlgo(Number(10000)),
});

const composer = algorandClient
  .newGroup()
  .addAppCallMethodCall({
    sender: sender_address,
    appId: validatorAppId,
    method: gasMethod,
    args: [],
    note: '1',
  })
  .addAppCallMethodCall({
    sender: sender_address,
    appId: validatorAppId,
    method: gasMethod,
    args: [],
    note: '2',
  })
  .addAppCallMethodCall({
    sender: sender_address,
    appId: validatorAppId,
    method: addStakeMethod,
    args: [stakeTransferTx, 45n, 0n],
    extraFee: microAlgo(5000),
  });

/**
 * UNSTAKE TXs
 */
// const STAKERS = new TextEncoder().encode('stakers');

// const boxReferences = [
//   { appId: poolAppId, name: STAKERS },
//   { appId: poolAppId, name: STAKERS },
//   { appId: poolAppId, name: STAKERS },
//   { appId: poolAppId, name: STAKERS },
//   { appId: poolAppId, name: STAKERS },
//   { appId: poolAppId, name: STAKERS },
//   { appId: poolAppId, name: STAKERS },
// ];

// const composer = algorandClient
//   .newGroup()
//   .addAppCallMethodCall({
//     sender: sender_address,
//     appId: 2725738169n,
//     method: gasMethod,
//     args: [],
//     note: '1',
//     boxReferences,
//   })
//   .addAppCallMethodCall({
//     sender: sender_address,
//     appId: 2725738169n,
//     method: gasMethod,
//     args: [],
//     note: '2',
//     boxReferences,
//   })
//   .addAppCallMethodCall({
//     sender: sender_address,
//     appId: 2725738169n,
//     method: removeStakeMethod,
//     args: [sender_address.toString(), 10000n],
//     extraFee: microAlgo(5000),
//     appReferences: [2714516089n],
//   });

// const txs = algosdk.assignGroupID((await composer.buildTransactions()).transactions);
const txs = (await composer.simulate({ skipSignatures: true, allowUnnamedResources: true })).transactions;

const tx_hashs = txs.map((tx) => Buffer.from(tx.bytesToSign()).toString('hex'));

//
// Sign the transaction
//
console.log('Signing transaction...');

const fbSigner = new FireblocksSigner(fireblocks, vault.vaultId);

const fbTx = await fbSigner.sign(
  {
    rawMessageData: {
      messages: tx_hashs.map((hash: string) => ({
        content: hash,
      })),
    },
  },
  'ALGO',
  'ALGO tx from @kilnfi/sdk',
);

const signedTxs = txs.map((tx, index) => {
  const sig = fbTx.signedMessages?.[index]?.signature?.fullSig;
  if (!sig) {
    throw new Error(`Missing signature for transaction at index ${index}`);
  }

  const msg = tx.bytesToSign();
  const s = Uint8Array.from(Buffer.from(sig, 'hex'));
  const pk = algosdk.decodeAddress(sender_address).publicKey;
  if (!nacl.sign.detached.verify(msg, s, pk)) {
    console.log(`${index}: Local Ed25519 verify failed (key mismatch or bad decoding).`);
  }

  return tx.attachSignature(tx.sender, Uint8Array.from(Buffer.from(sig, 'hex')));
});

//
// Broadcast the transaction
//
console.log('Broadcasting transaction...');

const simulate = await algorandClient.client.algod.simulateRawTransactions(signedTxs).do();
console.log('simulate', simulate);

// const result = await algorandClient.client.algod.sendRawTransaction(signedTxs).do();

// console.log('result', result);
