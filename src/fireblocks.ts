import {
  type AssetTypeResponse,
  type ConfigurationOptions,
  Fireblocks,
  type PublicKeyInformation,
  SignedMessageAlgorithmEnum,
  type TransactionResponse,
} from '@fireblocks/ts-sdk';

import type { Client } from 'openapi-fetch';
import { type FireblocksAssetId, FireblocksSigner } from './fireblocks_signer.js';
import type { components, paths } from './openapi/schema.js';

export type FireblocksIntegration = (
  | { config?: never; instance: Fireblocks }
  | { config: ConfigurationOptions; instance?: never }
) & {
  vaultId: `${number}`;
};

const ERRORS = {
  MISSING_SIGNATURE: 'An error occurred while attempting to retrieve the signature from Fireblocks.',
  FAILED_TO_PREPARE: 'An error occurred while attempting to add the signature to the transaction.',
  MISSING_PUBLIC_KEY: 'An error occurred while attempting to retrieve the public key from Fireblocks.',
};

export class FireblocksService {
  client: Client<paths>;

  constructor(client: Client<paths>) {
    this.client = client;
  }

  /**
   * Retrieve a fireblocks SDK from a Fireblocks integration
   */
  getSdk(integration: FireblocksIntegration): Fireblocks {
    if (integration.instance) {
      return integration.instance;
    }
    return new Fireblocks(integration.config);
  }

  /**
   * Retrieve a fireblocks signer from a Fireblocks integration
   */
  getSigner(integration: FireblocksIntegration): FireblocksSigner {
    const sdk = this.getSdk(integration);
    return new FireblocksSigner(sdk, integration.vaultId);
  }

  /**
   * Get fireblocks wallet pubkey compressed
   */
  async getPubkey(
    integration: FireblocksIntegration,
    assetId: (string & {}) | FireblocksAssetId,
  ): Promise<PublicKeyInformation> {
    const fbSdk = this.getSdk(integration);
    const data = await fbSdk.vaults.getPublicKeyInfoForAddress({
      assetId: assetId,
      vaultAccountId: integration.vaultId,
      change: 0,
      addressIndex: 0,
      compressed: true,
    });
    return data.data;
  }

  /**
   * List Fireblocks supported assets
   */
  async getAssets(integration: FireblocksIntegration): Promise<AssetTypeResponse[]> {
    const fbSdk = this.getSdk(integration);
    return (await fbSdk.blockchainsAssets.getSupportedAssets()).data;
  }

  /**
   * Sign a Solana transaction on Fireblocks
   */
  async signSolTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['SOLStakeTx'],
    assetId: 'SOL_TEST' | 'SOL',
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['SOLPreparedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
          },
        ],
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'SOL tx from @kilnfi/sdk';
    const fbTx = await fbSigner.sign(payload, assetId, fbNote);

    const signatures = fbTx.signedMessages
      ?.filter((signedMessage) => signedMessage.derivationPath?.[3] === 0)
      .map((signedMessage) => signedMessage.signature?.fullSig)
      .filter((s) => s !== undefined);
    if (!signatures) {
      throw new Error(ERRORS.MISSING_SIGNATURE);
    }

    const preparedTx = await this.client.POST('/sol/transaction/prepare', {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        signatures: signatures,
      },
    });

    if (preparedTx.error) {
      throw new Error(ERRORS.FAILED_TO_PREPARE);
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Create a Cardano transaction in Fireblocks without waiting for completion
   */
  async createAdaTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['ADAUnsignedTx'],
    note?: string,
  ): Promise<TransactionResponse> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
            preHash: {
              content: tx.unsigned_tx_body_serialized,
              hashAlgorithm: 'BLAKE2',
            },
          },
          {
            content: tx.unsigned_tx_hash,
            preHash: {
              content: tx.unsigned_tx_body_serialized,
              hashAlgorithm: 'BLAKE2',
            },
            bip44change: 2,
          },
        ],
      },
      inputsSelection: {
        inputsToSpend: tx.inputs,
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'ADA tx from @kilnfi/sdk';
    return await fbSigner.createTransaction(payload, 'ADA', fbNote);
  }

  /**
   * Wait for a Cardano transaction to complete and prepare it for broadcast
   */
  async waitForAdaTxCompletion(
    integration: FireblocksIntegration,
    tx: components['schemas']['ADAUnsignedTx'],
    fbTx: TransactionResponse,
  ): Promise<{
    signed_tx: { data: components['schemas']['ADASignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbSigner = this.getSigner(integration);
    const completedTx = await fbSigner.waitForTxCompletion(fbTx);
    const signedMessages = completedTx.signedMessages?.map((message) => ({
      pubkey: message.publicKey as string,
      signature: message.signature?.fullSig as string,
    }));

    if (!signedMessages) {
      throw new Error(ERRORS.MISSING_SIGNATURE);
    }

    const preparedTx = await this.client.POST('/ada/transaction/prepare', {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        signed_messages: signedMessages,
      },
    });

    if (preparedTx.error) {
      throw new Error(ERRORS.FAILED_TO_PREPARE);
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: completedTx,
    };
  }

  /**
   * Sign a Cardano transaction on Fireblocks
   */
  async signAdaTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['ADAUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['ADASignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbTx = await this.createAdaTx(integration, tx, note);
    return await this.waitForAdaTxCompletion(integration, tx, fbTx);
  }

  /**
   * Create an ATOM transaction in Fireblocks without waiting for completion
   */
  async createAtomTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['ATOMUnsignedTx'] | components['schemas']['ATOMStakeUnsignedTx'],
    note?: string,
  ): Promise<TransactionResponse> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
            preHash: {
              content: tx.unsigned_tx_serialized,
              hashAlgorithm: 'SHA256',
            },
          },
        ],
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'ATOM tx from @kilnfi/sdk';
    return await fbSigner.createTransaction(payload, 'ATOM_COS', fbNote);
  }

  /**
   * Wait for an ATOM transaction to complete and prepare it for broadcast
   */
  async waitForAtomTxCompletion(
    integration: FireblocksIntegration,
    tx: components['schemas']['ATOMUnsignedTx'] | components['schemas']['ATOMStakeUnsignedTx'],
    fbTx: TransactionResponse,
  ): Promise<{
    signed_tx: { data: components['schemas']['ATOMSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbSigner = this.getSigner(integration);
    const completedTx = await fbSigner.waitForTxCompletion(fbTx);
    const signature = completedTx.signedMessages?.[0]?.signature?.fullSig;

    if (!signature) {
      throw new Error(ERRORS.MISSING_SIGNATURE);
    }

    const preparedTx = await this.client.POST('/atom/transaction/prepare', {
      body: {
        pubkey: tx.pubkey,
        tx_body: tx.tx_body,
        tx_auth_info: tx.tx_auth_info,
        signature: signature,
      },
    });

    if (preparedTx.error) {
      throw new Error(ERRORS.FAILED_TO_PREPARE);
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: completedTx,
    };
  }

  /**
   * Sign an ATOM transaction on Fireblocks (combines createAtomTx and waitForAtomTxCompletion)
   */
  async signAtomTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['ATOMUnsignedTx'] | components['schemas']['ATOMStakeUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['ATOMSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbTx = await this.createAtomTx(integration, tx, note);
    return await this.waitForAtomTxCompletion(integration, tx, fbTx);
  }

  /**
   * Sign a DYDX transaction on Fireblocks
   */
  /**
   * Create a DYDX transaction in Fireblocks without waiting for completion
   */
  async createDydxTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['DYDXUnsignedTx'] | components['schemas']['DYDXStakeUnsignedTx'],
    note?: string,
  ): Promise<TransactionResponse> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
            preHash: {
              content: tx.unsigned_tx_serialized,
              hashAlgorithm: 'SHA256',
            },
          },
        ],
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'DYDX tx from @kilnfi/sdk';
    return await fbSigner.createTransaction(payload, 'DYDX_DYDX', fbNote);
  }

  /**
   * Wait for a DYDX transaction to complete and prepare it for broadcast
   */
  async waitForDydxTxCompletion(
    integration: FireblocksIntegration,
    tx: components['schemas']['DYDXUnsignedTx'] | components['schemas']['DYDXStakeUnsignedTx'],
    fbTx: TransactionResponse,
  ): Promise<{
    signed_tx: { data: components['schemas']['DYDXSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbSigner = this.getSigner(integration);
    const completedTx = await fbSigner.waitForTxCompletion(fbTx);
    const signature = completedTx.signedMessages?.[0]?.signature?.fullSig;

    if (!signature) {
      throw new Error(ERRORS.MISSING_SIGNATURE);
    }

    const preparedTx = await this.client.POST('/dydx/transaction/prepare', {
      body: {
        pubkey: tx.pubkey,
        tx_body: tx.tx_body,
        tx_auth_info: tx.tx_auth_info,
        signature: signature,
      },
    });

    if (preparedTx.error) {
      throw new Error(ERRORS.FAILED_TO_PREPARE);
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: completedTx,
    };
  }

  /**
   * Sign a DYDX transaction on Fireblocks (combines createDydxTx and waitForDydxTxCompletion)
   */
  async signDydxTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['DYDXUnsignedTx'] | components['schemas']['DYDXStakeUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['DYDXSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbTx = await this.createDydxTx(integration, tx, note);
    return await this.waitForDydxTxCompletion(integration, tx, fbTx);
  }

  /**
   * Sign a FET transaction on Fireblocks
   */
  /**
   * Create a FET transaction in Fireblocks without waiting for completion
   */
  async createFetTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['FETUnsignedTx'] | components['schemas']['FETStakeUnsignedTx'],
    note?: string,
  ): Promise<TransactionResponse> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
            derivationPath: [44, 118, Number(integration.vaultId), 0, 0],
            preHash: {
              content: tx.unsigned_tx_serialized,
              hashAlgorithm: 'SHA256',
            },
          },
        ],
        algorithm: SignedMessageAlgorithmEnum.EcdsaSecp256K1,
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'FET tx from @kilnfi/sdk';
    return await fbSigner.createTransaction(payload, undefined, fbNote);
  }

  /**
   * Wait for a FET transaction to complete and prepare it for broadcast
   */
  async waitForFetTxCompletion(
    integration: FireblocksIntegration,
    tx: components['schemas']['FETUnsignedTx'] | components['schemas']['FETStakeUnsignedTx'],
    fbTx: TransactionResponse,
  ): Promise<{
    signed_tx: { data: components['schemas']['FETSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbSigner = this.getSigner(integration);
    const completedTx = await fbSigner.waitForTxCompletion(fbTx);
    const signature = completedTx.signedMessages?.[0]?.signature?.fullSig;

    if (!signature) {
      throw new Error(ERRORS.MISSING_SIGNATURE);
    }

    const preparedTx = await this.client.POST('/fet/transaction/prepare', {
      body: {
        pubkey: tx.pubkey,
        tx_body: tx.tx_body,
        tx_auth_info: tx.tx_auth_info,
        signature: signature,
      },
    });

    if (preparedTx.error) {
      throw new Error(ERRORS.FAILED_TO_PREPARE);
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: completedTx,
    };
  }

  /**
   * Sign a FET transaction on Fireblocks (combines createFetTx and waitForFetTxCompletion)
   */
  async signFetTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['FETUnsignedTx'] | components['schemas']['FETStakeUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['FETSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbTx = await this.createFetTx(integration, tx, note);
    return await this.waitForFetTxCompletion(integration, tx, fbTx);
  }

  /**
   * Sign a OM transaction on Fireblocks
   */
  /**
   * Create a OM transaction in Fireblocks without waiting for completion
   */
  async createOmTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['OMUnsignedTx'] | components['schemas']['OMStakeUnsignedTx'],
    note?: string,
  ): Promise<TransactionResponse> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
            derivationPath: [44, 118, Number(integration.vaultId), 0, 0],
            preHash: {
              content: tx.unsigned_tx_serialized,
              hashAlgorithm: 'SHA256',
            },
          },
        ],
        algorithm: SignedMessageAlgorithmEnum.EcdsaSecp256K1,
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'OM tx from @kilnfi/sdk';
    return await fbSigner.createTransaction(payload, undefined, fbNote);
  }

  /**
   * Wait for a OM transaction to complete and prepare it for broadcast
   */
  async waitForOmTxCompletion(
    integration: FireblocksIntegration,
    tx: components['schemas']['OMUnsignedTx'] | components['schemas']['OMStakeUnsignedTx'],
    fbTx: TransactionResponse,
  ): Promise<{
    signed_tx: { data: components['schemas']['OMSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbSigner = this.getSigner(integration);
    const completedTx = await fbSigner.waitForTxCompletion(fbTx);
    const signature = completedTx.signedMessages?.[0]?.signature?.fullSig;

    if (!signature) {
      throw new Error(ERRORS.MISSING_SIGNATURE);
    }

    const preparedTx = await this.client.POST('/om/transaction/prepare', {
      body: {
        pubkey: tx.pubkey,
        tx_body: tx.tx_body,
        tx_auth_info: tx.tx_auth_info,
        signature: signature,
      },
    });

    if (preparedTx.error) {
      throw new Error(ERRORS.FAILED_TO_PREPARE);
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: completedTx,
    };
  }

  /**
   * Sign a OM transaction on Fireblocks (combines createOmTx and waitForOmTxCompletion)
   */
  async signOmTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['OMUnsignedTx'] | components['schemas']['OMStakeUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['OMSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbTx = await this.createOmTx(integration, tx, note);
    return await this.waitForOmTxCompletion(integration, tx, fbTx);
  }

  /**
   * Sign a INJ transaction on Fireblocks
   */
  /**
   * Create a INJ transaction in Fireblocks without waiting for completion
   */
  async createInjTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['INJUnsignedTx'] | components['schemas']['INJStakeUnsignedTx'],
    note?: string,
  ): Promise<TransactionResponse> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
            preHash: {
              content: tx.unsigned_tx_serialized,
              hashAlgorithm: 'SHA256',
            },
          },
        ],
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'INJ tx from @kilnfi/sdk';
    return await fbSigner.createTransaction(payload, 'INJ_INJ', fbNote);
  }

  /**
   * Wait for a INJ transaction to complete and prepare it for broadcast
   */
  async waitForInjTxCompletion(
    integration: FireblocksIntegration,
    tx: components['schemas']['INJUnsignedTx'] | components['schemas']['INJStakeUnsignedTx'],
    fbTx: TransactionResponse,
  ): Promise<{
    signed_tx: { data: components['schemas']['INJSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbSigner = this.getSigner(integration);
    const completedTx = await fbSigner.waitForTxCompletion(fbTx);
    const signature = completedTx.signedMessages?.[0]?.signature?.fullSig;

    if (!signature) {
      throw new Error(ERRORS.MISSING_SIGNATURE);
    }

    const preparedTx = await this.client.POST('/inj/transaction/prepare', {
      body: {
        pubkey: tx.pubkey,
        tx_body: tx.tx_body,
        tx_auth_info: tx.tx_auth_info,
        signature: signature,
      },
    });

    if (preparedTx.error) {
      throw new Error(ERRORS.FAILED_TO_PREPARE);
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: completedTx,
    };
  }

  /**
   * Sign a INJ transaction on Fireblocks (combines createInjTx and waitForInjTxCompletion)
   */
  async signInjTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['INJUnsignedTx'] | components['schemas']['INJStakeUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['INJSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbTx = await this.createInjTx(integration, tx, note);
    return await this.waitForInjTxCompletion(integration, tx, fbTx);
  }

  /**
   * Sign a KAVA transaction on Fireblocks
   */
  /**
   * Create a KAVA transaction in Fireblocks without waiting for completion
   */
  async createKavaTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['KAVAUnsignedTx'] | components['schemas']['KAVAStakeUnsignedTx'],
    note?: string,
  ): Promise<TransactionResponse> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
            derivationPath: [44, 459, Number(integration.vaultId), 0, 0],
            preHash: {
              content: tx.unsigned_tx_serialized,
              hashAlgorithm: 'SHA256',
            },
          },
        ],
        algorithm: SignedMessageAlgorithmEnum.EcdsaSecp256K1,
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'KAVA tx from @kilnfi/sdk';
    return await fbSigner.createTransaction(payload, undefined, fbNote);
  }

  /**
   * Wait for a KAVA transaction to complete and prepare it for broadcast
   */
  async waitForKavaTxCompletion(
    integration: FireblocksIntegration,
    tx: components['schemas']['KAVAUnsignedTx'] | components['schemas']['KAVAStakeUnsignedTx'],
    fbTx: TransactionResponse,
  ): Promise<{
    signed_tx: { data: components['schemas']['KAVASignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbSigner = this.getSigner(integration);
    const completedTx = await fbSigner.waitForTxCompletion(fbTx);
    const signature = completedTx.signedMessages?.[0]?.signature?.fullSig;

    if (!signature) {
      throw new Error(ERRORS.MISSING_SIGNATURE);
    }

    const preparedTx = await this.client.POST('/kava/transaction/prepare', {
      body: {
        pubkey: tx.pubkey,
        tx_body: tx.tx_body,
        tx_auth_info: tx.tx_auth_info,
        signature: signature,
      },
    });

    if (preparedTx.error) {
      throw new Error(ERRORS.FAILED_TO_PREPARE);
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: completedTx,
    };
  }

  /**
   * Sign a KAVA transaction on Fireblocks (combines createKavaTx and waitForKavaTxCompletion)
   */
  async signKavaTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['KAVAUnsignedTx'] | components['schemas']['KAVAStakeUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['KAVASignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbTx = await this.createKavaTx(integration, tx, note);
    return await this.waitForKavaTxCompletion(integration, tx, fbTx);
  }

  /**
   * Sign a CRO transaction on Fireblocks
   */
  /**
   * Create a CRO transaction in Fireblocks without waiting for completion
   */
  async createCroTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['CROUnsignedTx'] | components['schemas']['CROStakeUnsignedTx'],
    note?: string,
  ): Promise<TransactionResponse> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
            derivationPath: [44, 394, Number(integration.vaultId), 0, 0],
            preHash: {
              content: tx.unsigned_tx_serialized,
              hashAlgorithm: 'SHA256',
            },
          },
        ],
        algorithm: SignedMessageAlgorithmEnum.EcdsaSecp256K1,
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'CRO tx from @kilnfi/sdk';
    return await fbSigner.createTransaction(payload, undefined, fbNote);
  }

  /**
   * Wait for a CRO transaction to complete and prepare it for broadcast
   */
  async waitForCroTxCompletion(
    integration: FireblocksIntegration,
    tx: components['schemas']['CROUnsignedTx'] | components['schemas']['CROStakeUnsignedTx'],
    fbTx: TransactionResponse,
  ): Promise<{
    signed_tx: { data: components['schemas']['CROSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbSigner = this.getSigner(integration);
    const completedTx = await fbSigner.waitForTxCompletion(fbTx);
    const signature = completedTx.signedMessages?.[0]?.signature?.fullSig;

    if (!signature) {
      throw new Error(ERRORS.MISSING_SIGNATURE);
    }

    const preparedTx = await this.client.POST('/cro/transaction/prepare', {
      body: {
        pubkey: tx.pubkey,
        tx_body: tx.tx_body,
        tx_auth_info: tx.tx_auth_info,
        signature: signature,
      },
    });

    if (preparedTx.error) {
      throw new Error(ERRORS.FAILED_TO_PREPARE);
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: completedTx,
    };
  }

  /**
   * Sign a CRO transaction on Fireblocks (combines createCroTx and waitForCroTxCompletion)
   */
  async signCroTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['CROUnsignedTx'] | components['schemas']['CROStakeUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['CROSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbTx = await this.createCroTx(integration, tx, note);
    return await this.waitForCroTxCompletion(integration, tx, fbTx);
  }

  /**
   * Sign a NOBLE transaction on Fireblocks
   */
  /**
   * Create a NOBLE transaction in Fireblocks without waiting for completion
   */
  async createNobleTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['DYDXUnsignedTx'],
    note?: string,
  ): Promise<TransactionResponse> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
            derivationPath: [44, 118, Number(integration.vaultId), 0, 0],
            preHash: {
              content: tx.unsigned_tx_serialized,
              hashAlgorithm: 'SHA256',
            },
          },
        ],
        algorithm: SignedMessageAlgorithmEnum.EcdsaSecp256K1,
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'NOBLE tx from @kilnfi/sdk';
    return await fbSigner.createTransaction(payload, undefined, fbNote);
  }

  /**
   * Wait for a NOBLE transaction to complete and prepare it for broadcast
   */
  async waitForNobleTxCompletion(
    integration: FireblocksIntegration,
    tx: components['schemas']['DYDXUnsignedTx'],
    fbTx: TransactionResponse,
  ): Promise<{
    signed_tx: { data: components['schemas']['DYDXSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbSigner = this.getSigner(integration);
    const completedTx = await fbSigner.waitForTxCompletion(fbTx);
    const signature = completedTx.signedMessages?.[0]?.signature?.fullSig;

    if (!signature) {
      throw new Error(ERRORS.MISSING_SIGNATURE);
    }

    const preparedTx = await this.client.POST('/noble/transaction/prepare', {
      body: {
        pubkey: tx.pubkey,
        tx_body: tx.tx_body,
        tx_auth_info: tx.tx_auth_info,
        signature: signature,
      },
    });

    if (preparedTx.error) {
      throw new Error(ERRORS.FAILED_TO_PREPARE);
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: completedTx,
    };
  }

  /**
   * Sign a NOBLE transaction on Fireblocks (combines createNobleTx and waitForNobleTxCompletion)
   */
  async signNobleTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['DYDXUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['DYDXSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbTx = await this.createNobleTx(integration, tx, note);
    return await this.waitForNobleTxCompletion(integration, tx, fbTx);
  }

  /**
   * Sign a OSMO transaction on Fireblocks
   */
  /**
   * Create a OSMO transaction in Fireblocks without waiting for completion
   */
  async createOsmoTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['OSMOUnsignedTx'] | components['schemas']['OSMOStakeUnsignedTx'],
    note?: string,
  ): Promise<TransactionResponse> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
            preHash: {
              content: tx.unsigned_tx_serialized,
              hashAlgorithm: 'SHA256',
            },
          },
        ],
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'OSMO tx from @kilnfi/sdk';
    return await fbSigner.createTransaction(payload, 'OSMO', fbNote);
  }

  /**
   * Wait for a OSMO transaction to complete and prepare it for broadcast
   */
  async waitForOsmoTxCompletion(
    integration: FireblocksIntegration,
    tx: components['schemas']['OSMOUnsignedTx'] | components['schemas']['OSMOStakeUnsignedTx'],
    fbTx: TransactionResponse,
  ): Promise<{
    signed_tx: { data: components['schemas']['OSMOSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbSigner = this.getSigner(integration);
    const completedTx = await fbSigner.waitForTxCompletion(fbTx);
    const signature = completedTx.signedMessages?.[0]?.signature?.fullSig;

    if (!signature) {
      throw new Error(ERRORS.MISSING_SIGNATURE);
    }

    const preparedTx = await this.client.POST('/osmo/transaction/prepare', {
      body: {
        pubkey: tx.pubkey,
        tx_body: tx.tx_body,
        tx_auth_info: tx.tx_auth_info,
        signature: signature,
      },
    });

    if (preparedTx.error) {
      throw new Error(ERRORS.FAILED_TO_PREPARE);
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: completedTx,
    };
  }

  /**
   * Sign a OSMO transaction on Fireblocks (combines createOsmoTx and waitForOsmoTxCompletion)
   */
  async signOsmoTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['OSMOUnsignedTx'] | components['schemas']['OSMOStakeUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['OSMOSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbTx = await this.createOsmoTx(integration, tx, note);
    return await this.waitForOsmoTxCompletion(integration, tx, fbTx);
  }

  /**
   * Sign a TIA transaction on Fireblocks
   */
  /**
   * Create a TIA transaction in Fireblocks without waiting for completion
   */
  async createTiaTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['TIAUnsignedTx'] | components['schemas']['TIAStakeUnsignedTx'],
    note?: string,
  ): Promise<TransactionResponse> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
            preHash: {
              content: tx.unsigned_tx_serialized,
              hashAlgorithm: 'SHA256',
            },
          },
        ],
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'TIA tx from @kilnfi/sdk';
    return await fbSigner.createTransaction(payload, 'CELESTIA', fbNote);
  }

  /**
   * Wait for a TIA transaction to complete and prepare it for broadcast
   */
  async waitForTiaTxCompletion(
    integration: FireblocksIntegration,
    tx: components['schemas']['TIAUnsignedTx'] | components['schemas']['TIAStakeUnsignedTx'],
    fbTx: TransactionResponse,
  ): Promise<{
    signed_tx: { data: components['schemas']['TIASignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbSigner = this.getSigner(integration);
    const completedTx = await fbSigner.waitForTxCompletion(fbTx);
    const signature = completedTx.signedMessages?.[0]?.signature?.fullSig;

    if (!signature) {
      throw new Error(ERRORS.MISSING_SIGNATURE);
    }

    const preparedTx = await this.client.POST('/tia/transaction/prepare', {
      body: {
        pubkey: tx.pubkey,
        tx_body: tx.tx_body,
        tx_auth_info: tx.tx_auth_info,
        signature: signature,
      },
    });

    if (preparedTx.error) {
      throw new Error(ERRORS.FAILED_TO_PREPARE);
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: completedTx,
    };
  }

  /**
   * Sign a TIA transaction on Fireblocks (combines createTiaTx and waitForTiaTxCompletion)
   */
  async signTiaTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['TIAUnsignedTx'] | components['schemas']['TIAStakeUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['TIASignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbTx = await this.createTiaTx(integration, tx, note);
    return await this.waitForTiaTxCompletion(integration, tx, fbTx);
  }

  /**
   * Sign a ZETA transaction on Fireblocks
   */
  /**
   * Create a ZETA transaction in Fireblocks without waiting for completion
   */
  async createZetaTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['ZETAUnsignedTx'] | components['schemas']['ZETAStakeUnsignedTx'],
    note?: string,
  ): Promise<TransactionResponse> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
            derivationPath: [44, 118, Number(integration.vaultId), 0, 0],
            preHash: {
              content: tx.unsigned_tx_serialized,
              hashAlgorithm: 'SHA256',
            },
          },
        ],
        algorithm: SignedMessageAlgorithmEnum.EcdsaSecp256K1,
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'ZETA tx from @kilnfi/sdk';
    return await fbSigner.createTransaction(payload, undefined, fbNote);
  }

  /**
   * Wait for a ZETA transaction to complete and prepare it for broadcast
   */
  async waitForZetaTxCompletion(
    integration: FireblocksIntegration,
    tx: components['schemas']['ZETAUnsignedTx'] | components['schemas']['ZETAStakeUnsignedTx'],
    fbTx: TransactionResponse,
  ): Promise<{
    signed_tx: { data: components['schemas']['ZETASignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbSigner = this.getSigner(integration);
    const completedTx = await fbSigner.waitForTxCompletion(fbTx);
    const signature = completedTx.signedMessages?.[0]?.signature?.fullSig;

    if (!signature) {
      throw new Error(ERRORS.MISSING_SIGNATURE);
    }

    const preparedTx = await this.client.POST('/zeta/transaction/prepare', {
      body: {
        pubkey: tx.pubkey,
        tx_body: tx.tx_body,
        tx_auth_info: tx.tx_auth_info,
        signature: signature,
      },
    });

    if (preparedTx.error) {
      throw new Error(ERRORS.FAILED_TO_PREPARE);
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: completedTx,
    };
  }

  /**
   * Sign a ZETA transaction on Fireblocks (combines createZetaTx and waitForZetaTxCompletion)
   */
  async signZetaTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['ZETAUnsignedTx'] | components['schemas']['ZETAStakeUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['ZETASignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbTx = await this.createZetaTx(integration, tx, note);
    return await this.waitForZetaTxCompletion(integration, tx, fbTx);
  }

  /**
   * Create a DOT transaction in Fireblocks without waiting for completion
   */
  async createDotTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['DOTUnsignedTx'],
    note?: string,
  ): Promise<TransactionResponse> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_payload.substring(2),
          },
        ],
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'DOT tx from @kilnfi/sdk';
    return await fbSigner.createTransaction(payload, 'DOT', fbNote);
  }

  /**
   * Wait for a DOT transaction to complete and prepare it for broadcast
   */
  async waitForDotTxCompletion(
    integration: FireblocksIntegration,
    tx: components['schemas']['DOTUnsignedTx'],
    fbTx: TransactionResponse,
  ): Promise<{
    signed_tx: { data: components['schemas']['DOTSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbSigner = this.getSigner(integration);
    const completedTx = await fbSigner.waitForTxCompletion(fbTx);

    if (!completedTx.signedMessages?.[0]?.signature?.fullSig) {
      throw new Error(ERRORS.MISSING_SIGNATURE);
    }

    const signature = `0x00${completedTx.signedMessages?.[0]?.signature.fullSig}`;

    const preparedTx = await this.client.POST('/dot/transaction/prepare', {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        signature: signature,
      },
    });

    if (preparedTx.error) {
      throw new Error(ERRORS.FAILED_TO_PREPARE);
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: completedTx,
    };
  }

  /**
   * Sign a DOT transaction on Fireblocks
   */
  async signDotTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['DOTUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['DOTSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbTx = await this.createDotTx(integration, tx, note);
    return await this.waitForDotTxCompletion(integration, tx, fbTx);
  }

  /**
   * Create a KSM transaction in Fireblocks without waiting for completion
   */
  async createKsmTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['KSMUnsignedTx'],
    note?: string,
  ): Promise<TransactionResponse> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_payload.substring(2),
          },
        ],
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'KSM tx from @kilnfi/sdk';
    return await fbSigner.createTransaction(payload, 'KSM', fbNote);
  }

  /**
   * Wait for a KSM transaction to complete and prepare it for broadcast
   */
  async waitForKsmTxCompletion(
    integration: FireblocksIntegration,
    tx: components['schemas']['KSMUnsignedTx'],
    fbTx: TransactionResponse,
  ): Promise<{
    signed_tx: { data: components['schemas']['KSMSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbSigner = this.getSigner(integration);
    const completedTx = await fbSigner.waitForTxCompletion(fbTx);

    if (!completedTx.signedMessages?.[0]?.signature?.fullSig) {
      throw new Error(ERRORS.MISSING_SIGNATURE);
    }

    const signature = `0x00${completedTx.signedMessages?.[0]?.signature.fullSig}`;

    const preparedTx = await this.client.POST('/ksm/transaction/prepare', {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        signature: signature,
      },
    });

    if (preparedTx.error) {
      throw new Error(ERRORS.FAILED_TO_PREPARE);
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: completedTx,
    };
  }

  /**
   * Sign a KSM transaction on Fireblocks
   */
  async signKsmTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['KSMUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['KSMSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbTx = await this.createKsmTx(integration, tx, note);
    return await this.waitForKsmTxCompletion(integration, tx, fbTx);
  }

  /**
   * Sign an ETH transaction with given integration using Fireblocks raw signing
   */
  async signEthTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['ETHUnsignedTx'],
    assetId: 'ETH_TEST_HOODI' | 'ETH',
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['ETHSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
            preHash: {
              content: tx.unsigned_tx_serialized,
              hashAlgorithm: 'KECCAK256',
            },
          },
        ],
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'ETH tx from @kilnfi/sdk';
    const fbTx = await fbSigner.sign(payload, assetId, fbNote);

    const signature = fbTx?.signedMessages?.[0]?.signature;

    if (!signature) {
      throw new Error(ERRORS.MISSING_SIGNATURE);
    }

    const preparedTx = await this.client.POST('/eth/transaction/prepare', {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        r: `0x${signature.r}`,
        s: `0x${signature.s}`,
        v: signature.v ?? 0,
      },
    });

    if (preparedTx.error) {
      throw new Error(ERRORS.FAILED_TO_PREPARE);
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign and broadcast an ETH transaction with given integration using Fireblocks contract call feature
   */
  async signAndBroadcastEthTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['ETHUnsignedTx'],
    assetId: 'ETH_TEST_HOODI' | 'ETH',
    fireblocksDestinationId: string,
    note?: string,
  ) {
    const payload = {
      contractCallData: tx.contract_call_data,
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'ETH tx from @kilnfi/sdk';
    return await fbSigner.signAndBroadcastWith(payload, assetId, tx, fireblocksDestinationId, true, fbNote);
  }

  /**
   * Sign a POL transaction with given integration using Fireblocks raw signing
   */
  async signPolTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['POLUnsignedTx'],
    assetId: 'ETH_TEST5' | 'ETH',
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['POLSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
            preHash: {
              content: tx.unsigned_tx_serialized,
              hashAlgorithm: 'KECCAK256',
            },
          },
        ],
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'POL tx from @kilnfi/sdk';
    const fbTx = await fbSigner.sign(payload, assetId, fbNote);

    const signature = fbTx?.signedMessages?.[0]?.signature;

    if (!signature) {
      throw new Error(ERRORS.MISSING_SIGNATURE);
    }

    const preparedTx = await this.client.POST('/pol/transaction/prepare', {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        r: `0x${signature.r}`,
        s: `0x${signature.s}`,
        v: signature.v ?? 0,
      },
    });

    if (preparedTx.error) {
      throw new Error(ERRORS.FAILED_TO_PREPARE);
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign and broadcast a POL transaction with given integration using Fireblocks contract call feature
   */
  async signAndBroadcastPolTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['POLUnsignedTx'],
    assetId: 'ETH_TEST5' | 'ETH',
    fireblocksDestinationId: string,
    note?: string,
  ) {
    const payload = {
      contractCallData: tx.contract_call_data,
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'POL tx from @kilnfi/sdk';
    return await fbSigner.signAndBroadcastWith(payload, assetId, tx, fireblocksDestinationId, true, fbNote);
  }

  /**
   * Create a TON transaction in Fireblocks without waiting for completion
   */
  async createTonTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['TONTx'],
    assetId: 'TON_TEST' | 'TON',
    note?: string,
  ): Promise<TransactionResponse> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
            //TODO : ADD PREHASH LATER IF FB SUPPORT TON HASH ALGORITHM
          },
        ],
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'TON tx from @kilnfi/sdk';
    return await fbSigner.createTransaction(payload, assetId, fbNote);
  }

  /**
   * Wait for a TON transaction to complete and prepare it for broadcast
   */
  async waitForTonTxCompletion(
    integration: FireblocksIntegration,
    tx: components['schemas']['TONTx'],
    fbTx: TransactionResponse,
  ): Promise<{
    signed_tx: { data: components['schemas']['TONPreparedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbSigner = this.getSigner(integration);
    const completedTx = await fbSigner.waitForTxCompletion(fbTx);
    const signature = completedTx.signedMessages?.[0]?.signature?.fullSig;

    if (!signature) {
      throw new Error(ERRORS.MISSING_SIGNATURE);
    }

    const preparedTx = await this.client.POST('/ton/transaction/prepare', {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        signature: signature,
        from: tx.from,
      },
    });

    if (preparedTx.error) {
      throw new Error(ERRORS.FAILED_TO_PREPARE);
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: completedTx,
    };
  }

  /**
   * Sign a TON transaction on Fireblocks
   */
  async signTonTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['TONTx'],
    assetId: 'TON_TEST' | 'TON',
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['TONPreparedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbTx = await this.createTonTx(integration, tx, assetId, note);
    return await this.waitForTonTxCompletion(integration, tx, fbTx);
  }

  /**
   * Sign a XTZ transaction on Fireblocks
   */
  async signXtzTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['XTZUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['XTZSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
          },
        ],
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'XTZ tx from @kilnfi/sdk';
    const fbTx = await fbSigner.sign(payload, 'XTZ', fbNote);
    const signature = fbTx.signedMessages?.[0]?.signature?.fullSig;

    if (!signature) {
      throw new Error(ERRORS.MISSING_SIGNATURE);
    }

    const preparedTx = await this.client.POST('/xtz/transaction/prepare', {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        signature: signature,
      },
    });

    if (preparedTx.error) {
      throw new Error(ERRORS.FAILED_TO_PREPARE);
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Create a NEAR transaction in Fireblocks without waiting for completion
   */
  async createNearTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['NEARTx'],
    assetId: 'NEAR_TEST' | 'NEAR',
    note?: string,
  ): Promise<TransactionResponse> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
            preHash: {
              content: tx.unsigned_tx_serialized,
              hashAlgorithm: 'SHA256',
            },
          },
        ],
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'NEAR tx from @kilnfi/sdk';
    return await fbSigner.createTransaction(payload, assetId, fbNote);
  }

  /**
   * Wait for a NEAR transaction to complete and prepare it for broadcast
   */
  async waitForNearTxCompletion(
    integration: FireblocksIntegration,
    tx: components['schemas']['NEARTx'],
    fbTx: TransactionResponse,
  ): Promise<{
    signed_tx: { data: components['schemas']['NEARSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbSigner = this.getSigner(integration);
    const completedTx = await fbSigner.waitForTxCompletion(fbTx);
    const signature = completedTx.signedMessages?.[0]?.signature?.fullSig;

    if (!signature) {
      throw new Error(ERRORS.MISSING_SIGNATURE);
    }

    const preparedTx = await this.client.POST('/near/transaction/prepare', {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        signature: signature,
      },
    });

    if (preparedTx.error) {
      throw new Error(ERRORS.FAILED_TO_PREPARE);
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a NEAR transaction on Fireblocks (combines createNearTx and waitForNearTxCompletion)
   */
  async signNearTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['NEARTx'],
    assetId: 'NEAR_TEST' | 'NEAR',
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['NEARSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbTx = await this.createNearTx(integration, tx, assetId, note);
    return await this.waitForNearTxCompletion(integration, tx, fbTx);
  }

  /**
   * Sign a Trx transaction on Fireblocks
   */
  async createTrxTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['TRXUnsignedTx'],
    note?: string,
  ): Promise<TransactionResponse> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_id,
            preHash: {
              content: tx.unsigned_tx_serialized,
              hashAlgorithm: 'SHA256',
            },
          },
        ],
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'TRX tx from @kilnfi/sdk';
    return await fbSigner.createTransaction(payload, 'TRX', fbNote);
  }

  async waitForTrxTxCompletion(
    integration: FireblocksIntegration,
    tx: components['schemas']['TRXUnsignedTx'],
    fbTx: TransactionResponse,
  ): Promise<{
    signed_tx: { data: components['schemas']['TRXPreparedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbSigner = this.getSigner(integration);
    const completedTx = await fbSigner.waitForTxCompletion(fbTx);

    if (!completedTx.signedMessages?.[0]?.signature) {
      throw new Error(ERRORS.MISSING_SIGNATURE);
    }

    const signature = `${completedTx.signedMessages[0].signature.fullSig}0${completedTx.signedMessages[0].signature.v}`;

    const preparedTx = await this.client.POST('/trx/transaction/prepare', {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        signature: signature,
      },
    });

    if (preparedTx.error) {
      throw new Error(ERRORS.FAILED_TO_PREPARE);
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: completedTx,
    };
  }

  async signTrxTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['TRXUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['TRXPreparedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbTx = await this.createTrxTx(integration, tx, note);
    return await this.waitForTrxTxCompletion(integration, tx, fbTx);
  }

  /**
   * Sign a SEI transaction on Fireblocks
   */
  /**
   * Create a SEI transaction in Fireblocks without waiting for completion
   */
  async createSeiTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['SEIUnsignedTx'] | components['schemas']['SEIStakeUnsignedTx'],
    note?: string,
  ): Promise<TransactionResponse> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
            derivationPath: [44, 60, Number(integration.vaultId), 0, 0],
            preHash: {
              content: tx.unsigned_tx_serialized,
              hashAlgorithm: 'SHA256',
            },
          },
        ],
        algorithm: SignedMessageAlgorithmEnum.EcdsaSecp256K1,
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'SEI tx from @kilnfi/sdk';
    return await fbSigner.createTransaction(payload, undefined, fbNote);
  }

  /**
   * Wait for a SEI transaction to complete and prepare it for broadcast
   */
  async waitForSeiTxCompletion(
    integration: FireblocksIntegration,
    tx: components['schemas']['SEIUnsignedTx'] | components['schemas']['SEIStakeUnsignedTx'],
    fbTx: TransactionResponse,
  ): Promise<{
    signed_tx: { data: components['schemas']['SEISignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbSigner = this.getSigner(integration);
    const completedTx = await fbSigner.waitForTxCompletion(fbTx);
    const signature = completedTx.signedMessages?.[0]?.signature?.fullSig;

    if (!signature) {
      throw new Error(ERRORS.MISSING_SIGNATURE);
    }

    const preparedTx = await this.client.POST('/sei/transaction/prepare', {
      body: {
        pubkey: tx.pubkey,
        tx_body: tx.tx_body,
        tx_auth_info: tx.tx_auth_info,
        signature: signature,
      },
    });

    if (preparedTx.error) {
      throw new Error(ERRORS.FAILED_TO_PREPARE);
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: completedTx,
    };
  }

  /**
   * Sign a SEI transaction on Fireblocks (combines createSeiTx and waitForSeiTxCompletion)
   */
  async signSeiTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['SEIUnsignedTx'] | components['schemas']['SEIStakeUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['SEISignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const fbTx = await this.createSeiTx(integration, tx, note);
    return await this.waitForSeiTxCompletion(integration, tx, fbTx);
  }

  async signSuiTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['SUITx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['SUIBroadcastTxPayload'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash.substring(2),
          },
        ],
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'SUI tx from @kilnfi/sdk';
    const fbTx = await fbSigner.sign(payload, 'SUI', fbNote);
    const signature = fbTx.signedMessages?.[0]?.signature?.fullSig;
    const fbPubkey = fbTx.signedMessages?.[0]?.publicKey;

    if (!signature) {
      throw new Error(ERRORS.MISSING_SIGNATURE);
    }

    if (!fbPubkey) {
      throw new Error(ERRORS.MISSING_PUBLIC_KEY);
    }

    const preparedTx = await this.client.POST('/sui/transaction/prepare', {
      body: {
        pubkey: fbPubkey,
        signature: signature,
        tx_serialized: tx.unsigned_tx_serialized,
      },
    });

    if (preparedTx.error) {
      throw new Error(ERRORS.FAILED_TO_PREPARE);
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }
}
