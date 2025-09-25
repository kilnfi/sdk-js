import { loadEnv } from './env.ts';
import algosdk from 'algosdk';
import { AlgorandClient, microAlgo, populateAppCallResources } from '@algorandfoundation/algokit-utils';
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
const validatorAppId = 2714516089n;
const validatorId = 45n;

/**
 * STAKE TXs
 */

// Create individual payment transaction first with extended validity
const paymentTxn = await algorandClient.createTransaction.payment({
  sender: sender_address,
  receiver: RETI_APP_ADDRESS,
  amount: microAlgo(Number(10000)),
});

const simulateComposer = algorandClient
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
    args: [paymentTxn, validatorId, 0n],
    extraFee: microAlgo(240000),
  });

// First simulate to calculate the required fee based on app budget
const simulateResult = await simulateComposer.simulate({
  skipSignatures: true,
  allowUnnamedResources: true,
});

console.log('Simulation completed. Calculating required fee based on app budget.');

const appBudgetAdded = simulateResult.simulateResponse.txnGroups[0].appBudgetAdded || 0;
// Algorand fee calculation: 1000 microAlgo base fee + 1000 microAlgo per 700 opcode units
// Math.ceil(appBudgetAdded / 700) calculates how many 700-opcode chunks are needed
const calculatedFee = microAlgo(1000 * Math.ceil(appBudgetAdded / 700));

console.log(`App budget added: ${appBudgetAdded}, calculated fee: ${calculatedFee.microAlgos} microAlgos`);

algorandClient.setDefaultValidityWindow(200);
const suggestedParams = await algorandClient.client.algod.getTransactionParams().do();
const signer = algosdk.makeEmptyTransactionSigner();

const paymentTx = await algorandClient.createTransaction.payment({
  sender: sender_address,
  receiver: RETI_APP_ADDRESS,
  amount: microAlgo(10000),
});

const atc = new algosdk.AtomicTransactionComposer();

atc.addMethodCall({
  appID: validatorAppId,
  method: gasMethod,
  methodArgs: [],
  sender: sender_address,
  signer,
  suggestedParams,
  note: new Uint8Array(Buffer.from('1')),
});

// Add gas method call 2
atc.addMethodCall({
  appID: validatorAppId,
  method: gasMethod,
  methodArgs: [],
  sender: sender_address,
  suggestedParams,
  signer,
  note: new Uint8Array(Buffer.from('2')),
});

// Add the addStake method call
atc.addMethodCall({
  appID: validatorAppId,
  method: addStakeMethod,
  methodArgs: [
    {
      txn: paymentTx,
      signer,
    },
    validatorId,
    0n,
  ],
  sender: sender_address,
  suggestedParams: {
    ...suggestedParams,
    fee: calculatedFee.microAlgos,
    flatFee: true,
  },
  signer,
});

console.log('Populating app call resources...');

// Populate app call resources automatically
const populatedAtc = await populateAppCallResources(atc, algorandClient.client.algod);

// Get the transactions with populated resources
const populatedTxs = populatedAtc
  .clone()
  .buildGroup()
  .map((tx) => tx.txn);

const tx_hashs = populatedTxs.map((tx) => Buffer.from(tx.bytesToSign()).toString('hex'));

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

const signedTxs = populatedTxs.map((tx, index) => {
  console.log('tx id', tx.txID());
  console.log('note', Buffer.from(tx.note).toString());
  console.log('\n');

  const txHash = Buffer.from(tx.bytesToSign()).toString('hex');

  // Find the matching signature from Fireblocks response
  const matchingSignedMessage = fbTx.signedMessages?.find((sm) => sm.content === txHash);

  if (!matchingSignedMessage?.signature?.fullSig) {
    throw new Error(`No matching signature found for transaction ${index} with hash ${txHash}`);
  }

  const sig = matchingSignedMessage.signature.fullSig;

  // Verify signature locally
  const msg = tx.bytesToSign();
  const s = Uint8Array.from(Buffer.from(sig, 'hex'));
  const pk = algosdk.decodeAddress(sender_address).publicKey;

  if (!nacl.sign.detached.verify(msg, s, pk)) {
    console.log(`Transaction ${index}: Local Ed25519 verify failed`);
  } else {
    console.log(`Transaction ${index}: Local Ed25519 verify SUCCESS!`);
  }

  return tx.attachSignature(tx.sender, Uint8Array.from(Buffer.from(sig, 'hex')));
});

//
// Broadcast the transaction
//
// console.log('Broadcasting transaction...');

// const simulate = await algorandClient.client.algod.simulateRawTransactions(signedTxs).do();
// console.log('simulate result:', simulate);

// console.log('Simulation successful! Transaction is properly signed and ready to submit.');

// Submit the properly signed transactions to the network
console.log('Submitting transaction group to network...');
try {
  // Use the AlgorandClient's sendGroupOfTransactions which might support resource population better
  const result = await algorandClient.client.algod.sendRawTransaction(signedTxs).do();
  console.log('Transaction group submitted successfully:', result);
} catch (error) {
  console.error('Transaction submission failed:', error);

  // Try alternative submission with simulation
  console.log('Attempting alternative submission method...');
  try {
    // First simulate the signed transactions to populate resources
    const simulateResult = await algorandClient.client.algod.simulateRawTransactions(signedTxs).do();

    console.log('Simulation succeeded, but need different submission approach');
    console.log('Simulate result:', simulateResult);
  } catch (simError) {
    console.error('Simulation also failed:', simError);
  }
}
