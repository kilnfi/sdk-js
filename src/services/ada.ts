import {
  Address,
  BigNum,
  Certificate,
  Certificates,
  Ed25519KeyHash,
  Ed25519Signature,
  hash_transaction,
  LinearFee,
  PublicKey,
  RewardAddress,
  StakeCredential,
  StakeDelegation,
  StakeDeregistration,
  StakeRegistration,
  Transaction,
  TransactionBuilder,
  TransactionBuilderConfigBuilder,
  TransactionHash,
  TransactionInput,
  TransactionOutput,
  TransactionOutputs,
  TransactionWitnessSet,
  Value,
  Vkey,
  Vkeywitness,
  Vkeywitnesses,
  Withdrawals,
} from '@emurgo/cardano-serialization-lib-nodejs';
import { Service } from "./service";
import { AdaStakeOptions, InternalAdaConfig, UTXO } from "../types/ada";
import {
  BlockFrostAPI,
  BlockfrostServerError,
} from "@blockfrost/blockfrost-js";
import { InvalidIntegration, InvalidSignature } from "../errors/integrations";
import { ADDRESSES } from "../globals";
import {
  CouldNotFetchSlot,
  CouldNotFetchStakeAddress,
  CouldNotHashStakeKey, NoRewardAddressFound,
  NoStakeAddressFound, NotEnoughFunds,
} from "../errors/ada";

const CARDANO_PARAMS = {
  COINS_PER_UTXO_WORD: '34482',
  MAX_TX_SIZE: 16384,
  MAX_VALUE_SIZE: 5000,
  MIN_FEE_A: '44',
  MIN_FEE_B: '155381',
  POOL_DEPOSIT: '500000000',
  KEY_DEPOSIT: '2000000',
  MIN_UTXO_VALUE_ADA_ONLY: 1000000,
  DEFAULT_NATIVE_FEES: 300000, // Over-estimate (0.3 ADA)
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
    const poolId = options?.poolId ? options.poolId :
      this.testnet ? ADDRESSES.ada.testnet.poolId :
        ADDRESSES.ada.mainnet.poolId;

    try {
      const utxos = await this.getUtxos(walletAddress);
      const address = await this.client.addresses(walletAddress);
      if (!address.stake_address) {
        throw new CouldNotFetchStakeAddress('Could not fetch stake address');
      }

      const stakeKeyHash = await this.getStakeKeyHash(address.stake_address);
      if (!stakeKeyHash) {
        throw new CouldNotHashStakeKey('Could not hash stake key');
      }
      const certificates = Certificates.new();

      const registrations = await this.client.accountsRegistrationsAll(address.stake_address);
      const lastRegistration = registrations.length > 0 ? registrations[registrations.length - 1] : undefined;
      const pool = await this.client.poolsById(poolId);
      const poolKeyHash = Ed25519KeyHash.from_hex(pool.hex);

      // Register stake key if not done already or if last registration was a deregister action
      if (!lastRegistration || lastRegistration.action === 'deregistered') {
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

      const walletBalance = this.getWalletBalance(utxos);
      const outAmount = (walletBalance - CARDANO_PARAMS.DEFAULT_NATIVE_FEES - Number(CARDANO_PARAMS.KEY_DEPOSIT)).toString();
      const outputs = this.prepareTx(outAmount, walletAddress);
      return await this.buildTx(walletAddress, utxos, outputs, certificates);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Craft ada withdraw rewards transaction
   * @param walletAddress wallet delegating that will receive the rewards
   * @param amountAda amount of rewards to withdraw in ada, if not provided all rewards are withdrawn
   */
  async craftWithdrawRewardsTx(
    walletAddress: string,
    amountAda?: number,
  ): Promise<Transaction> {


    try {
      const utxos = await this.getUtxos(walletAddress);
      const address = await this.client.addresses(walletAddress);
      if (!address.stake_address) {
        throw new NoStakeAddressFound('No stake address');
      }

      const stakeKeyHash = await this.getStakeKeyHash(address.stake_address);
      if (!stakeKeyHash) {
        throw new CouldNotHashStakeKey('Could not hash stake key');
      }

      const withdrawals = Withdrawals.new();
      const rewardAddress = RewardAddress.from_address(Address.from_bech32(address.stake_address));

      if (!rewardAddress) {
        throw new NoRewardAddressFound('Could not retrieve rewards address');
      }

      const availableRewards = await this.getAvailableRewards(address.stake_address);
      const amountToWithdrawLovelace = amountAda ? this.adaToLovelace(amountAda.toString()) : availableRewards.toString();
      withdrawals.insert(rewardAddress, BigNum.from_str(amountToWithdrawLovelace));

      const walletBalance = this.getWalletBalance(utxos);
      const outAmount = (walletBalance - CARDANO_PARAMS.DEFAULT_NATIVE_FEES + availableRewards).toString();
      const outputs = this.prepareTx(outAmount, walletAddress);

      return await this.buildTx(walletAddress, utxos, outputs, null, withdrawals);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Craft ada undelegate transaction
   * @param walletAddress wallet delegating that will receive the rewards
   */
  async craftUnstakeTx(
    walletAddress: string,
  ): Promise<Transaction> {


    try {
      const utxos = await this.getUtxos(walletAddress);
      const address = await this.client.addresses(walletAddress);
      if (!address.stake_address) {
        throw new NoStakeAddressFound('No stake address');
      }

      const stakeKeyHash = await this.getStakeKeyHash(address.stake_address);
      if (!stakeKeyHash) {
        throw new CouldNotHashStakeKey('Could not hash stake key');
      }

      const withdrawals = Withdrawals.new();
      const rewardAddress = RewardAddress.from_address(Address.from_bech32(address.stake_address));

      if (!rewardAddress) {
        throw new NoRewardAddressFound('Could not retrieve rewards address');
      }


      const availableRewards = await this.getAvailableRewards(address.stake_address);
      withdrawals.insert(rewardAddress, BigNum.from_str(availableRewards.toString()));

      const walletBalance = this.getWalletBalance(utxos);
      const outAmount = (walletBalance - CARDANO_PARAMS.DEFAULT_NATIVE_FEES + Number(CARDANO_PARAMS.KEY_DEPOSIT) + availableRewards).toString();
      const outputs = this.prepareTx(outAmount, walletAddress);

      // Deregister certificate
      const certificates = Certificates.new();
      certificates.add(
        Certificate.new_stake_deregistration(
          StakeDeregistration.new(
            StakeCredential.from_keyhash(
              Ed25519KeyHash.from_bytes(stakeKeyHash),
            ),
          ),
        ),
      );

      return await this.buildTx(walletAddress, utxos, outputs, certificates, withdrawals);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Prepare outputs (destination addresses and amounts) for a transaction
   * @param lovelaceValue
   * @param toAddress
   * @private
   */
  private prepareTx(lovelaceValue: string, toAddress: string): TransactionOutputs {
    const outputs = TransactionOutputs.new();

    outputs.add(
      TransactionOutput.new(
        Address.from_bech32(toAddress),
        Value.new(BigNum.from_str(lovelaceValue)),
      ),
    );

    return outputs;
  }

  /**
   * Build transaction with correct fees, inputs, outputs and certificates
   * @param inputAddress
   * @param utxos
   * @param outputs
   * @param certificates
   * @param withdrawals
   * @private
   */
  private async buildTx(
    inputAddress: string,
    utxos: UTXO,
    outputs: TransactionOutputs,
    certificates: Certificates | null = null,
    withdrawals: Withdrawals | null = null,
  ): Promise<Transaction> {
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

    if (withdrawals) {
      txBuilder.set_withdrawals(withdrawals);
    }

    // Inputs
    const lovelaceUtxos = utxos.filter(
      (u: any) => !u.amount.find((a: any) => a.unit !== 'lovelace'),
    );

    for (const utxo of lovelaceUtxos) {
      const amount = utxo.amount.find(a => a.unit === 'lovelace')?.quantity;
      if (!amount) continue;

      const inputValue = Value.new(
        BigNum.from_str(amount.toString()),
      );

      const input = TransactionInput.new(
        TransactionHash.from_bytes(Buffer.from(utxo.tx_hash, 'hex')),
        utxo.output_index,
      );
      txBuilder.add_input(Address.from_bech32(inputAddress), input, inputValue);
    }

    // Outputs
    txBuilder.add_output(outputs.get(0));

    const latestBlock = await this.client.blocksLatest();
    const currentSlot = latestBlock.slot;
    if (!currentSlot) {
      throw new CouldNotFetchSlot('Failed to fetch slot number');
    }
    // Current slot + 2h
    const ttl = currentSlot + 7200;
    txBuilder.set_ttl(ttl);

    txBuilder.set_fee(BigNum.from_str(CARDANO_PARAMS.DEFAULT_NATIVE_FEES.toString()));

    return txBuilder.build_tx();
  }

  private adaToLovelace(value: string) {
    return (parseFloat(value || '1') * 1000000).toFixed();
  }

  /**
   * Get addresses to spend from wallet
   * @param walletAddress
   * @private
   */
  private async getUtxos(walletAddress: string): Promise<UTXO> {
    let utxo: UTXO = [];
    try {
      utxo = await this.client.addressesUtxos(walletAddress);
    } catch (error) {
      if (error instanceof BlockfrostServerError && error.status_code === 404) {
        throw new NotEnoughFunds(`You should send ADA to ${walletAddress} to have enough funds to sent a transaction`);
      } else {
        throw error;
      }
    }
    return utxo;
  }

  /**
   * Calculate wallet total balance from given utxo
   * @param utxos
   * @private
   */
  private getWalletBalance(utxos: UTXO): number {
    let walletBalance = 0;
    for (const utxo of utxos) {
      if (utxo.amount.length > 0 && utxo.amount[0].unit === 'lovelace') {
        walletBalance += Number(utxo.amount[0].quantity);
      }
    }
    return walletBalance;
  }

  /**
   * Get available rewards for given stake address
   * @param stakeAddress
   * @private
   */
  private async getAvailableRewards(stakeAddress: string): Promise<number> {
    let availableRewards = 0;
    const rewardsHistory = await this.client.accountsRewardsAll(stakeAddress);
    for (const rewards of rewardsHistory) {
      availableRewards += Number(rewards.amount);
    }

    const withdrawalsHistory = await this.client.accountsWithdrawalsAll(stakeAddress);
    for (const withdrawal of withdrawalsHistory) {
      availableRewards -= Number(withdrawal.amount);
    }
    return availableRewards;
  }

  /**
   * Get stake key keyhash
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
          {
            "content": message,
            "bip44change": 2,
          },
        ],
      },
      inputsSelection: {
        inputsToSpend: JSON.parse(transaction.body().inputs().to_json()),
      },
    };

    const fbTx = await this.fbSigner.signWithFB(payload, this.testnet ? 'ADA_TEST' : 'ADA');

    if (!fbTx.signedMessages) {
      throw new InvalidSignature(`Could not sign the transaction.`);
    }

    // Add signatures
    const witnesses = TransactionWitnessSet.new();
    const vkeyWitnesses = Vkeywitnesses.new();

    for (const signedMessage of fbTx.signedMessages) {
      const pubKey = PublicKey.from_hex(signedMessage.publicKey);
      const vKey = Vkey.new(pubKey);
      const signature = Ed25519Signature.from_hex(signedMessage.signature.fullSig);
      const vkeyWitness = Vkeywitness.new(vKey, signature);
      vkeyWitnesses.add(vkeyWitness);
    }

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
