import {
  Address,
  BigNum,
  Certificate,
  Certificates,
  CoinSelectionStrategyCIP2,
  Ed25519KeyHash,
  Ed25519Signature,
  hash_transaction,
  LinearFee,
  PublicKey,
  RewardAddress,
  StakeCredential,
  StakeDelegation,
  StakeRegistration,
  Transaction,
  TransactionBuilder,
  TransactionBuilderConfigBuilder,
  TransactionHash,
  TransactionInput,
  TransactionOutput,
  TransactionOutputs,
  TransactionUnspentOutput,
  TransactionUnspentOutputs,
  TransactionWitnessSet,
  Value,
  Vkey, Vkeywitness, Vkeywitnesses,
} from '@emurgo/cardano-serialization-lib-nodejs';
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
  MIN_FEE_A: '44',
  MIN_FEE_B: '155381',
  POOL_DEPOSIT: '500000000',
  KEY_DEPOSIT: '2000000',
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
    const poolId = this.testnet ? 'pool1xjt9ylq7rvsd2mxf6njkzhrkhgjzrtflz039vxs66ntvv82rdky' : 'pool10rdglgh4pzvkf936p2m669qzarr9dusrhmmz9nultm3uvq4eh5k';
    const poolHash = this.testnet ? '3496527c1e1b20d56cc9d4e5615c76ba2421ad3f13e2561a1ad4d6c6' : '78da8fa2f5089964963a0ab7ad1402e8c656f203bef622cf9f5ee3c6';
    const poolKeyHash = Ed25519KeyHash.from_hex(poolHash);

    try {
      const utxos = await this.getUtxos(walletAddress);
      const outputs = this.prepareTx(CARDANO_PARAMS.KEY_DEPOSIT, walletAddress);
      const address = await this.client.addresses(walletAddress);
      if (!address.stake_address) {
        throw Error('No stake address');
      }
      const stakeKeyHash = await this.getStakeKeyHash(address.stake_address);
      if (!stakeKeyHash) {
        throw Error('Could not hash stake key');
      }
      const certificates = Certificates.new();

      const registrations = await this.client.accountsRegistrations(address.stake_address);
      // const pool = await this.client.poolsById(poolId);

      // Register stake key if not done already
      if (registrations.length === 0) {
        certificates.add(
          Certificate.new_stake_registration(
            StakeRegistration.new(
              StakeCredential.from_keyhash(
                Ed25519KeyHash.from_bytes(stakeKeyHash),
              ),
            ),
          ),
        );
      }
      certificates.add(
        Certificate.new_stake_delegation(
          StakeDelegation.new(
            StakeCredential.from_keyhash(
              Ed25519KeyHash.from_bytes(stakeKeyHash),
            ),
            poolKeyHash,
          ),
        ),
      );
      return await this.buildTx(walletAddress, utxos, outputs, certificates);
    } catch (error) {
      throw error;
    }
  }

  private prepareTx(lovelaceValue: string, paymentAddress: string): TransactionOutputs {
    const outputs = TransactionOutputs.new();

    outputs.add(
      TransactionOutput.new(
        Address.from_bech32(paymentAddress),
        Value.new(BigNum.from_str(lovelaceValue)),
      ),
    );

    return outputs;
  }

  private async buildTx(changeAddress: string, utxos: UTXO, outputs: TransactionOutputs, certificates: Certificates | null = null) {
    const txBuilder = TransactionBuilder.new(
      TransactionBuilderConfigBuilder.new()
        .fee_algo(
          LinearFee.new(
            BigNum.from_str(CARDANO_PARAMS.MIN_FEE_A),
            BigNum.from_str(CARDANO_PARAMS.MIN_FEE_B),
          ),
        )
        .pool_deposit(BigNum.from_str(CARDANO_PARAMS.POOL_DEPOSIT))
        .key_deposit(BigNum.from_str(CARDANO_PARAMS.KEY_DEPOSIT))
        .coins_per_utxo_word(
          BigNum.from_str(CARDANO_PARAMS.COINS_PER_UTXO_WORD),
        )
        .max_value_size(CARDANO_PARAMS.MAX_VALUE_SIZE)
        .max_tx_size(CARDANO_PARAMS.MAX_TX_SIZE)
        .build(),
    );

    if (certificates) {
      txBuilder.set_certs(certificates);
    }

    // Inputs
    const lovelaceUtxos = utxos.filter(
      (u: any) => !u.amount.find((a: any) => a.unit !== 'lovelace'),
    );

    const unspentOutputs = TransactionUnspentOutputs.new();
    for (const utxo of lovelaceUtxos) {
      const amount = utxo.amount.find(
        (a: any) => a.unit === 'lovelace',
      )?.quantity;

      if (!amount) continue;

      const inputValue = Value.new(
        BigNum.from_str(amount.toString()),
      );

      const input = TransactionInput.new(
        TransactionHash.from_bytes(Buffer.from(utxo.tx_hash, 'hex')),
        utxo.output_index,
      );
      const output = TransactionOutput.new(Address.from_bech32(changeAddress), inputValue);
      unspentOutputs.add(TransactionUnspentOutput.new(input, output));
    }

    txBuilder.add_inputs_from(
      unspentOutputs,
      CoinSelectionStrategyCIP2.LargestFirst,
    );

    // Outputs
    txBuilder.add_output(outputs.get(0));


    const latestBlock = await this.client.blocksLatest();
    const currentSlot = latestBlock.slot;
    if (!currentSlot) {
      throw Error('Failed to fetch slot number');
    }
    // Current slot + 2h
    const ttl = currentSlot + 7200;
    txBuilder.set_ttl(ttl);

    // Adds a change output if there are more ADA in utxo than we need for the transaction,
    // these coins will be returned to change address
    txBuilder.add_change_if_needed(Address.from_bech32(changeAddress));

    return txBuilder.build_tx();
  }

  private adaToLovelace(value: string) {
    return (parseFloat(value || '1') * 1000000).toFixed();
  }

  private hexToBytes(string: string) {
    return Buffer.from(string, 'hex');
  }

  private hexToBech32(address: string) {
    return Address.from_bytes(this.hexToBytes(address)).to_bech32();
  }

  private async getUtxos(walletAddress: string) {
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
    return utxo;
  }

  /**
   * Get
   * @param stakeKey
   * @private
   */
  private getStakeKeyHash(stakeKey: string): Uint8Array | undefined {
    const rewardAddress = RewardAddress.from_address(Address.from_bech32(stakeKey));
    const paymentCred = rewardAddress?.payment_cred();
    const hash = paymentCred?.to_keyhash();
    return hash?.to_bytes();
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

    const message = hash_transaction(transaction.body()).to_hex();

    const payload = {
      rawMessageData: {
        messages: [
          {
            "content": message,
          },
        ],
      },
      inputsSelection: {
        inputsToSpend: JSON.parse(transaction.body().inputs().to_json()),
      },
    };

    const fbTx = await this.fbSigner.signWithFB(payload, this.testnet ? 'ADA_TEST' : 'ADA');

    const pubKey = PublicKey.from_hex(fbTx.signedMessages![0].publicKey);
    const vKey = Vkey.new(pubKey);
    const signature = Ed25519Signature.from_hex(fbTx.signedMessages![0].signature.fullSig);
    const witnesses = TransactionWitnessSet.new();
    const vkeyWitnesses = Vkeywitnesses.new();
    const vkeyWitness = Vkeywitness.new(vKey, signature);
    vkeyWitnesses.add(vkeyWitness);
    witnesses.set_vkeys(vkeyWitnesses);
    return Transaction.new(transaction.body(), witnesses);
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
        console.log(error.stack, error.error);
      } else {
        // rethrow other errors
        throw error;
      }
    }
  }
}
