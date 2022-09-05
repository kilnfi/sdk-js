import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import { Transaction } from '@emurgo/cardano-serialization-lib-nodejs';
import { mnemonicToEntropy } from 'bip39';
import { Service } from "./service";
import { InternalAdaConfig, UTXO } from "../types/ada";
import {
  BlockFrostAPI,
  BlockfrostServerError,
} from "@blockfrost/blockfrost-js";
import { InvalidIntegration } from "../errors/integrations";
import { PeerType, TransactionOperation } from "fireblocks-sdk";

const CARDANO_PARAMS = {
  COINS_PER_UTXO_WORD: '34482',
  MAX_TX_SIZE: 16384,
  MAX_VALUE_SIZE: 5000,
};

export class AdaService extends Service {
  private client: BlockFrostAPI;

  constructor({ testnet, integrations }: InternalAdaConfig) {
    super({ testnet, integrations });
    this.client = new BlockFrostAPI({ projectId: 'testnetQMV4zxv1wbnSaqTFWuW3tVVOGA9noUkZ' });
  }

  /**
   * Craft ada delegate transaction
   * @param accountId id of the kiln account to use for the stake transaction
   * @param walletAddress withdrawal creds /!\ losing it => losing the ability to withdraw
   */
  async craftStakeTx(
    accountId: string,
    walletAddress: string,
  ): Promise<Transaction> {

    let utxo: UTXO = [];
    try {
      utxo = await this.client.addressesUtxosAll(walletAddress);
    } catch (error) {
      if (error instanceof BlockfrostServerError && error.status_code === 404) {
        // Address derived from the seed was not used yet
        // In this case Blockfrost API will return 404
        utxo = [];
      } else {
        throw error;
      }
    }

    if (utxo.length === 0) {
      throw new Error(`You should send ADA to ${walletAddress} to have enough funds to sent a transaction`);
    }

    // Get current blockchain slot from latest block
    const latestBlock = await this.client.blocksLatest();
    const currentSlot = latestBlock.slot;
    if (!currentSlot) {
      throw Error('Failed to fetch slot number');
    }

    return this.composeTransaction(
      walletAddress,
      'addr_test1qqh2fphcgd0qsmwsqf4v8v9z2w3cpmzw5y9nx6h8z9v85qj7mjg5eydjgyvn3md3fwlyt2e4veynlwutp7u99m4l6q2sp3rdkv',
      '1000000',
      utxo,
      currentSlot,
    );
  }

  /**
   * Sign transaction with given integration
   * @param integration
   * @param transaction
   */
  async sign(integration: string, transaction: Transaction): Promise<Transaction> {
    const currentIntegration = this.integrations?.find(int => int.name === integration);
    if (!currentIntegration) {
      throw new InvalidIntegration(`Unknown integration, please provide an integration name that matches one of the integrations provided in the config.`);
    }

    // We only support fireblocks integration for now
    if (currentIntegration.provider !== 'fireblocks') {
      throw new InvalidIntegration(`Unsupported integration provider: ${currentIntegration.provider}`);
    }

    if (!this.fbSigner) {
      throw new InvalidIntegration(`Could not retrieve fireblocks signer.`);
    }

    const message = transaction.to_hex();

    const payload = {
      rawMessageData: {
        messages: [
          {
            "content": message,
          },
        ]
      },
      inputsSelection: {
        inputsToSpend: JSON.parse(transaction.body().inputs().to_json()),
      }
    };

    const tx = await this.fbSigner.signWithFB(payload, 'ADA_TEST');
    const sigBuffer = Buffer.from(tx.signedMessages![0].signature.fullSig, 'hex');
    console.log(tx.signedMessages);
    // // transaction.set_is_valid(true);
    //
    // const txHash = CardanoWasm.hash_transaction(transaction.body());
    // const witnesses = CardanoWasm.TransactionWitnessSet.new();
    // const vkeyWitnesses = CardanoWasm.Vkeywitnesses.new();
    // const MNEMONIC = 'word 1 word 2';
    // const bip32PrvKey = this.mnemonicToPrivateKey(MNEMONIC);
    // const { signKey } = this.deriveAddressPrvKey(bip32PrvKey, this.testnet);
    // vkeyWitnesses.add(CardanoWasm.make_vkey_witness(txHash, signKey));
    // witnesses.set_vkeys(vkeyWitnesses);
    // console.log(witnesses);
    // const tx = CardanoWasm.Transaction.new(transaction.body(), witnesses);

    return transaction;

  }

  /**
   * Broadcast transaction to the network
   * @param transaction
   */
  async broadcast(transaction: Transaction): Promise<string | undefined> {
    try {
      return await this.client.txSubmit(transaction.to_bytes());
    } catch (error) {
      // submit could fail if the transactions is rejected by cardano node
      if (error instanceof BlockfrostServerError && error.status_code === 400) {
        console.log(error.message);
      } else {
        // rethrow other errors
        throw error;
      }
    }
  }

  private composeTransaction (
    address: string,
    outputAddress: string,
    outputAmount: string,
    utxos: UTXO,
    currentSlot: number,
  ): Transaction {
    if (!utxos || utxos.length === 0) {
      throw Error(`No utxo on address ${address}`);
    }

    const txBuilder = CardanoWasm.TransactionBuilder.new(
      CardanoWasm.TransactionBuilderConfigBuilder.new()
        .fee_algo(
          CardanoWasm.LinearFee.new(
            CardanoWasm.BigNum.from_str('44'),
            CardanoWasm.BigNum.from_str('155381'),
          ),
        )
        .pool_deposit(CardanoWasm.BigNum.from_str('500000000'))
        .key_deposit(CardanoWasm.BigNum.from_str('2000000'))
        .coins_per_utxo_word(
          CardanoWasm.BigNum.from_str(CARDANO_PARAMS.COINS_PER_UTXO_WORD),
        )
        .max_value_size(CARDANO_PARAMS.MAX_VALUE_SIZE)
        .max_tx_size(CARDANO_PARAMS.MAX_TX_SIZE)
        .build(),
    );

    const outputAddr = CardanoWasm.Address.from_bech32(outputAddress);
    const changeAddr = CardanoWasm.Address.from_bech32(address);

    // Set TTL to +2h from currentSlot
    // If the transaction is not included in a block before that slot it will be cancelled.
    const ttl = currentSlot + 7200;
    txBuilder.set_ttl(ttl);

    // Add output to the tx
    txBuilder.add_output(
      CardanoWasm.TransactionOutput.new(
        outputAddr,
        CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(outputAmount)),
      ),
    );

    // Filter out multi asset utxo to keep this simple
    const lovelaceUtxos = utxos.filter(
      (u: any) => !u.amount.find((a: any) => a.unit !== 'lovelace'),
    );

    // Create TransactionUnspentOutputs from utxos fetched from Blockfrost
    const unspentOutputs = CardanoWasm.TransactionUnspentOutputs.new();
    for (const utxo of lovelaceUtxos) {
      const amount = utxo.amount.find(
        (a: any) => a.unit === 'lovelace',
      )?.quantity;

      if (!amount) continue;

      const inputValue = CardanoWasm.Value.new(
        CardanoWasm.BigNum.from_str(amount.toString()),
      );

      const input = CardanoWasm.TransactionInput.new(
        CardanoWasm.TransactionHash.from_bytes(Buffer.from(utxo.tx_hash, 'hex')),
        utxo.output_index,
      );
      const output = CardanoWasm.TransactionOutput.new(changeAddr, inputValue);
      unspentOutputs.add(CardanoWasm.TransactionUnspentOutput.new(input, output));
    }

    txBuilder.add_inputs_from(
      unspentOutputs,
      CardanoWasm.CoinSelectionStrategyCIP2.LargestFirst,
    );

    // Adds a change output if there are more ADA in utxo than we need for the transaction,
    // these coins will be returned to change address
    txBuilder.add_change_if_needed(changeAddr);

    // Build transaction
    return txBuilder.build_tx();
  };

  private harden (num: number): number {
    return 0x80000000 + num;
  };

  private deriveAddressPrvKey (
    bipPrvKey: CardanoWasm.Bip32PrivateKey,
    testnet: boolean,
  ): {
    signKey: CardanoWasm.PrivateKey;
    address: string;
  } {
    const networkId = testnet
      ? CardanoWasm.NetworkInfo.testnet().network_id()
      : CardanoWasm.NetworkInfo.mainnet().network_id();
    const accountIndex = 0;
    const addressIndex = 0;

    const accountKey = bipPrvKey
      .derive(this.harden(1852)) // purpose
      .derive(this.harden(1815)) // coin type
      .derive(this.harden(accountIndex)); // account #

    const utxoKey = accountKey
      .derive(0) // external
      .derive(addressIndex);

    const stakeKey = accountKey
      .derive(2) // chimeric
      .derive(0)
      .to_public();

    const baseAddress = CardanoWasm.BaseAddress.new(
      networkId,
      CardanoWasm.StakeCredential.from_keyhash(
        utxoKey.to_public().to_raw_key().hash(),
      ),
      CardanoWasm.StakeCredential.from_keyhash(stakeKey.to_raw_key().hash()),
    );

    const address = baseAddress.to_address().to_bech32();

    return { signKey: utxoKey.to_raw_key(), address: address };
  };

  private mnemonicToPrivateKey (
    mnemonic: string,
  ): CardanoWasm.Bip32PrivateKey {
    const entropy = mnemonicToEntropy(mnemonic);

    const rootKey = CardanoWasm.Bip32PrivateKey.from_bip39_entropy(
      Buffer.from(entropy, 'hex'),
      Buffer.from(''),
    );

    return rootKey;
  };
}
