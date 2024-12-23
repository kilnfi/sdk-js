import {
  type AssetTypeResponse,
  FireblocksSDK,
  type PublicKeyResponse,
  type SDKOptions,
  SigningAlgorithm,
  type TransactionResponse,
} from 'fireblocks-sdk';
import type { IAuthProvider } from 'fireblocks-sdk/dist/src/iauth-provider.js';
import type { Client } from 'openapi-fetch';
import { FireblocksSigner } from './fireblocks_signer.js';
import type { components, paths } from './openapi/schema.js';
import { sha256 } from 'viem';

export type FireblocksIntegration = {
  provider: 'fireblocks';
  fireblocksApiKey: string;
  fireblocksSecretKey: string;
  vaultId: number;
  name?: string;
  fireblocksDestinationId?: string;
  fireblocksApiBaseUrl?: string;
  fireblocksAuthProvider?: IAuthProvider;
  fireblocksSdkOptions?: SDKOptions;
};

export class FireblocksService {
  client: Client<paths>;

  constructor(client: Client<paths>) {
    this.client = client;
  }

  /**
   * Retrieve a fireblocks SDK from a Fireblocks integration
   */
  getSdk(integration: FireblocksIntegration): FireblocksSDK {
    return new FireblocksSDK(
      integration.fireblocksSecretKey,
      integration.fireblocksApiKey,
      integration.fireblocksApiBaseUrl,
      integration.fireblocksAuthProvider,
      integration.fireblocksSdkOptions,
    );
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
  async getPubkey(integration: FireblocksIntegration, assetId: string): Promise<PublicKeyResponse> {
    const fbSdk = this.getSdk(integration);
    const data = await fbSdk.getPublicKeyInfoForVaultAccount({
      assetId: assetId,
      vaultAccountId: integration.vaultId,
      change: 0,
      addressIndex: 0,
      compressed: true,
    });
    return data;
  }

  /**
   * List Fireblocks supported assets
   */
  async getAssets(integration: FireblocksIntegration): Promise<AssetTypeResponse[]> {
    const fbSdk = this.getSdk(integration);
    return await fbSdk.getSupportedAssets();
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
      ?.filter((signedMessage) => signedMessage.derivationPath[3] === 0)
      .map((signedMessage) => signedMessage.signature.fullSig);
    if (!signatures) {
      throw new Error('Fireblocks signature is missing');
    }

    const preparedTx = await this.client.POST('/sol/transaction/prepare', {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        signatures: signatures,
      },
    });

    if (preparedTx.error) {
      throw new Error('Failed to prepare transaction');
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
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
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
          },
          {
            content: tx.unsigned_tx_hash,
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
    const fbTx = await fbSigner.sign(payload, 'ADA', fbNote);

    const signedMessages = fbTx.signedMessages?.map((message) => {
      return {
        pubkey: message.publicKey,
        signature: message.signature.fullSig,
      };
    });
    if (!signedMessages) {
      throw new Error('Fireblocks signature is missing');
    }

    const preparedTx = await this.client.POST('/ada/transaction/prepare', {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        signed_messages: signedMessages,
      },
    });

    if (preparedTx.error) {
      throw new Error('Failed to prepare transaction');
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a ATOM transaction on Fireblocks
   */
  async signAtomTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['ATOMUnsignedTx'] | components['schemas']['ATOMStakeUnsignedTx'],
    assetId: 'ATOM_COS' | 'ATOM_COS_TEST',
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['ATOMSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
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
    const fbTx = await fbSigner.sign(payload, assetId, fbNote);
    const signature = fbTx.signedMessages?.[0]?.signature.fullSig;

    if (!signature) {
      throw new Error('Fireblocks signature is missing');
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
      throw new Error('Failed to prepare transaction');
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a DYDX transaction on Fireblocks
   */
  async signDydxTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['DYDXUnsignedTx'] | components['schemas']['DYDXStakeUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['DYDXSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
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
    const fbTx = await fbSigner.sign(payload, 'DYDX_DYDX', fbNote);
    const signature = fbTx.signedMessages?.[0]?.signature.fullSig;

    if (!signature) {
      throw new Error('Fireblocks signature is missing');
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
      throw new Error('Failed to prepare transaction');
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a FET transaction on Fireblocks
   */
  async signFetTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['FETUnsignedTx'] | components['schemas']['FETStakeUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['FETSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
            derivationPath: [44, 118, integration.vaultId, 0, 0],
            preHash: {
              content: tx.unsigned_tx_serialized,
              hashAlgorithm: 'SHA256',
            },
          },
        ],
        algorithm: SigningAlgorithm.MPC_ECDSA_SECP256K1,
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'FET tx from @kilnfi/sdk';
    const fbTx = await fbSigner.sign(payload, undefined, fbNote);
    const signature = fbTx.signedMessages?.[0]?.signature.fullSig;

    if (!signature) {
      throw new Error('Fireblocks signature is missing');
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
      throw new Error('Failed to prepare transaction');
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a INJ transaction on Fireblocks
   */
  async signInjTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['INJUnsignedTx'] | components['schemas']['INJStakeUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['INJSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
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
    const fbTx = await fbSigner.sign(payload, 'INJ_INJ', fbNote);
    const signature = fbTx.signedMessages?.[0]?.signature.fullSig;

    if (!signature) {
      throw new Error('Fireblocks signature is missing');
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
      throw new Error('Failed to prepare transaction');
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a KAVA transaction on Fireblocks
   */
  async signKavaTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['KAVAUnsignedTx'] | components['schemas']['KAVAStakeUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['KAVASignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
            derivationPath: [44, 459, integration.vaultId, 0, 0],
            preHash: {
              content: tx.unsigned_tx_serialized,
              hashAlgorithm: 'SHA256',
            },
          },
        ],
        algorithm: SigningAlgorithm.MPC_ECDSA_SECP256K1,
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'KAVA tx from @kilnfi/sdk';
    const fbTx = await fbSigner.sign(payload, undefined, fbNote);
    const signature = fbTx.signedMessages?.[0]?.signature.fullSig;

    if (!signature) {
      throw new Error('Fireblocks signature is missing');
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
      throw new Error('Failed to prepare transaction');
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a NOBLE transaction on Fireblocks
   */
  async signNobleTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['DYDXUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['DYDXSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
            derivationPath: [44, 118, integration.vaultId, 0, 0],
            preHash: {
              content: tx.unsigned_tx_serialized,
              hashAlgorithm: 'SHA256',
            },
          },
        ],
        algorithm: SigningAlgorithm.MPC_ECDSA_SECP256K1,
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'NOBLE tx from @kilnfi/sdk';
    const fbTx = await fbSigner.sign(payload, undefined, fbNote);
    const signature = fbTx.signedMessages?.[0]?.signature.fullSig;

    if (!signature) {
      throw new Error('Fireblocks signature is missing');
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
      throw new Error('Failed to prepare transaction');
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a OSMO transaction on Fireblocks
   */
  async signOsmoTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['OSMOUnsignedTx'] | components['schemas']['OSMOStakeUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['OSMOSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
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
    const fbTx = await fbSigner.sign(payload, 'OSMO', fbNote);
    const signature = fbTx.signedMessages?.[0]?.signature.fullSig;

    if (!signature) {
      throw new Error('Fireblocks signature is missing');
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
      throw new Error('Failed to prepare transaction');
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a TIA transaction on Fireblocks
   */
  async signTiaTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['TIAUnsignedTx'] | components['schemas']['TIAStakeUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['TIASignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
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
    const fbTx = await fbSigner.sign(payload, 'CELESTIA', fbNote);
    const signature = fbTx.signedMessages?.[0]?.signature.fullSig;

    if (!signature) {
      throw new Error('Fireblocks signature is missing');
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
      throw new Error('Failed to prepare transaction');
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a ZETA transaction on Fireblocks
   */
  async signZetaTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['ZETAUnsignedTx'] | components['schemas']['ZETAStakeUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['ZETASignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
    const payload = {
      rawMessageData: {
        messages: [
          {
            content: tx.unsigned_tx_hash,
            derivationPath: [44, 118, integration.vaultId, 0, 0],
            preHash: {
              content: tx.unsigned_tx_serialized,
              hashAlgorithm: 'SHA256',
            },
          },
        ],
        algorithm: SigningAlgorithm.MPC_ECDSA_SECP256K1,
      },
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'ZETA tx from @kilnfi/sdk';
    const fbTx = await fbSigner.sign(payload, undefined, fbNote);
    const signature = fbTx.signedMessages?.[0]?.signature.fullSig;

    if (!signature) {
      throw new Error('Fireblocks signature is missing');
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
      throw new Error('Failed to prepare transaction');
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
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
    const fbTx = await fbSigner.sign(payload, 'DOT', fbNote);
    const signature = `0x00${fbTx.signedMessages?.[0]?.signature.fullSig}`;

    const preparedTx = await this.client.POST('/dot/transaction/prepare', {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        signature: signature,
      },
    });

    if (preparedTx.error) {
      throw new Error('Failed to prepare transaction');
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
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
    const fbTx = await fbSigner.sign(payload, 'KSM', fbNote);
    const signature = `0x00${fbTx.signedMessages?.[0]?.signature.fullSig}`;

    const preparedTx = await this.client.POST('/ksm/transaction/prepare', {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        signature: signature,
      },
    });

    if (preparedTx.error) {
      throw new Error('Failed to prepare transaction');
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign an ETH transaction with given integration using Fireblocks raw signing
   */
  async signEthTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['ETHUnsignedTx'],
    assetId: 'ETH_TEST6' | 'ETH',
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
      throw new Error('Fireblocks signature is missing');
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
      throw new Error('Failed to prepare transaction');
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
    assetId: 'ETH_TEST6' | 'ETH',
    note?: string,
  ) {
    if (!integration.fireblocksDestinationId) {
      throw new Error('Fireblocks destination id is missing');
    }
    const payload = {
      contractCallData: tx.contract_call_data,
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'ETH tx from @kilnfi/sdk';
    return await fbSigner.signAndBroadcastWith(payload, assetId, tx, integration.fireblocksDestinationId, true, fbNote);
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
      throw new Error('Fireblocks signature is missing');
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
      throw new Error('Failed to prepare transaction');
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
    note?: string,
  ) {
    if (!integration.fireblocksDestinationId) {
      throw new Error('Fireblocks destination id is missing');
    }
    const payload = {
      contractCallData: tx.contract_call_data,
    };

    const fbSigner = this.getSigner(integration);
    const fbNote = note ? note : 'POL tx from @kilnfi/sdk';
    return await fbSigner.signAndBroadcastWith(payload, assetId, tx, integration.fireblocksDestinationId, true, fbNote);
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
    const fbNote = note ? note : 'TON tx from @kilnfi/sdk';
    const fbTx = await fbSigner.sign(payload, assetId, fbNote);
    const signature = fbTx.signedMessages?.[0]?.signature.fullSig;

    if (!signature) {
      throw new Error('Fireblocks signature is missing');
    }

    const preparedTx = await this.client.POST('/ton/transaction/prepare', {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        signature: signature,
        from: tx.from,
      },
    });

    if (preparedTx.error) {
      throw new Error('Failed to prepare transaction');
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a XTZ transaction on Fireblocks
   */
  async signXtzTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['XTZUnsignedTx'],
    assetId: 'XTZ_TEST' | 'XTZ',
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
    const fbTx = await fbSigner.sign(payload, assetId, fbNote);
    const signature = fbTx.signedMessages?.[0]?.signature.fullSig;

    if (!signature) {
      throw new Error('Fireblocks signature is missing');
    }

    const preparedTx = await this.client.POST('/xtz/transaction/prepare', {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        signature: signature,
      },
    });

    if (preparedTx.error) {
      throw new Error('Failed to prepare transaction');
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a Near transaction on Fireblocks
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
    const fbNote = note ? note : 'NEAR tx from @kilnfi/sdk';
    const fbTx = await fbSigner.sign(payload, assetId, fbNote);
    const signature = fbTx.signedMessages?.[0]?.signature.fullSig;

    if (!signature) {
      throw new Error('Fireblocks signature is missing');
    }

    const preparedTx = await this.client.POST('/near/transaction/prepare', {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        signature: signature,
      },
    });

    if (preparedTx.error) {
      throw new Error('Failed to prepare transaction');
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a Trx transaction on Fireblocks
   */
  async signTrxTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['TRXUnsignedTx'],
    note?: string,
  ): Promise<{
    signed_tx: { data: components['schemas']['TRXSignedTx'] };
    fireblocks_tx: TransactionResponse;
  }> {
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
    const fbTx = await fbSigner.sign(payload, 'TRX', fbNote);

    if (!fbTx.signedMessages?.[0]?.signature) {
      throw new Error('Fireblocks signature is missing');
    }

    const signature = `${fbTx.signedMessages[0].signature.fullSig}0${fbTx.signedMessages[0].signature.v}`;

    const preparedTx = await this.client.POST('/trx/transaction/prepare', {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        signature: signature,
      },
    });

    if (preparedTx.error) {
      throw new Error('Failed to prepare transaction');
    }

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }
}
