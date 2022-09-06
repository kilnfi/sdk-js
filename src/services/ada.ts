import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import { Transaction } from '@emurgo/cardano-serialization-lib-nodejs';
import { mnemonicToEntropy, generateMnemonic } from 'bip39';
import { Service } from "./service";
import { AdaStakeOptions, InternalAdaConfig, UTXO } from "../types/ada";
import {
  BlockFrostAPI,
  BlockfrostServerError,
} from "@blockfrost/blockfrost-js";
import { InvalidIntegration } from "../errors/integrations";

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
   * Craft ada delegate transaction, all the wallet's balance will be delegated to the pool
   * @param accountId id of the kiln account to use for the stake transaction
   * @param walletAddress withdrawal creds /!\ losing it => losing the ability to withdraw
   * @param options
   */
  async craftStakeTx(
    accountId: string,
    walletAddress: string,
    options?: AdaStakeOptions,
  ): Promise<Transaction> {

    let utxo: UTXO = [];
    try {
      utxo = await this.client.addressesUtxosAll(walletAddress);
    } catch (error) {
      if (error instanceof BlockfrostServerError && error.status_code === 404) {
        throw new Error(`You should send ADA to ${walletAddress} to have enough funds to sent a transaction`);
      } else {
        throw error;
      }
    }

    const latestBlock = await this.client.blocksLatest();
    const currentSlot = latestBlock.slot;
    if (!currentSlot) {
      throw Error('Failed to fetch slot number');
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

    const poolHash = this.testnet ? '3496527c1e1b20d56cc9d4e5615c76ba2421ad3f13e2561a1ad4d6c6' : '78da8fa2f5089964963a0ab7ad1402e8c656f203bef622cf9f5ee3c6';
    const wasmWalletAddress = CardanoWasm.Address.from_bech32(walletAddress);
    const baseWalletAddress = CardanoWasm.BaseAddress.from_address(wasmWalletAddress);


    // Set TTL to +2h from currentSlot
    // If the transaction is not included in a block before that slot it will be cancelled.
    const ttl = currentSlot + 7200;
    txBuilder.set_ttl(ttl);

    // Add delegation
    const poolKeyHash = CardanoWasm.Ed25519KeyHash.from_hex(poolHash);
    const stakeCredentials = baseWalletAddress?.stake_cred();
    if(!stakeCredentials){
      throw new Error('Could not generate stake credentials');
    }

    const certificates = CardanoWasm.Certificates.new();
    const stakeRegistration = CardanoWasm.StakeRegistration.new(stakeCredentials);
    const stakeDelegation = CardanoWasm.StakeDelegation.new(stakeCredentials, poolKeyHash);
    const stakeRegistrationCertificate = CardanoWasm.Certificate.new_stake_registration(stakeRegistration);
    const delegationCertificate = CardanoWasm.Certificate.new_stake_delegation(stakeDelegation);
    certificates.add(stakeRegistrationCertificate);
    certificates.add(delegationCertificate);
    txBuilder.set_certs(certificates);

    // Filter out multi asset utxo to keep this simple
    const lovelaceUtxos = utxo.filter(
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
      const output = CardanoWasm.TransactionOutput.new(wasmWalletAddress, inputValue);
      unspentOutputs.add(CardanoWasm.TransactionUnspentOutput.new(input, output));
    }

    txBuilder.add_inputs_from(
      unspentOutputs,
      CardanoWasm.CoinSelectionStrategyCIP2.LargestFirst,
    );

    // Adds a change output if there are more ADA in utxo than we need for the transaction,
    // these coins will be returned to change address
    txBuilder.add_change_if_needed(wasmWalletAddress);

    // Build transaction
    return txBuilder.build_tx();
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

    const message = CardanoWasm.hash_transaction(transaction.body()).to_hex();

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

    const fbTx = await this.fbSigner.signWithFB(payload, 'ADA_TEST');

    const pubKey = CardanoWasm.PublicKey.from_hex(fbTx.signedMessages![0].publicKey);
    const vKey = CardanoWasm.Vkey.new(pubKey);
    const signature = CardanoWasm.Ed25519Signature.from_hex(fbTx.signedMessages![0].signature.fullSig);
    const witnesses = CardanoWasm.TransactionWitnessSet.new();
    const vkeyWitnesses = CardanoWasm.Vkeywitnesses.new();
    const vkeyWitness = CardanoWasm.Vkeywitness.new(vKey, signature);
    vkeyWitnesses.add(vkeyWitness);
    witnesses.set_vkeys(vkeyWitnesses);
    return CardanoWasm.Transaction.new(transaction.body(), witnesses);
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
