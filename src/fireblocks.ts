import { type AssetTypeResponse, FireblocksSDK, type PublicKeyResponse, SigningAlgorithm } from 'fireblocks-sdk';
import type { Client } from 'openapi-fetch';
import { FireblocksSigner } from './fireblocks_signer';
import type { components, paths } from './openapi/schema';

type FireblocksIntegration = {
  provider: 'fireblocks';
  fireblocksApiKey: string;
  fireblocksSecretKey: string;
  vaultId: number;
  name?: string;
  fireblocksDestinationId?: string;
};

export class FireblocksService {
  client: Client<paths>;

  constructor(client: Client<paths>) {
    this.client = client;
  }

  /**
   * Retrieve a fireblocks SDK from a Fireblocks integration
   * @param integration
   */
  getSdk(integration: FireblocksIntegration): FireblocksSDK {
    return new FireblocksSDK(integration.fireblocksSecretKey, integration.fireblocksApiKey);
  }

  /**
   * Retrieve a fireblocks signer from a Fireblocks integration
   * @param integration
   */
  getSigner(integration: FireblocksIntegration): FireblocksSigner {
    const sdk = this.getSdk(integration);
    return new FireblocksSigner(sdk, integration.vaultId);
  }
  /**
   * Get fireblocks wallet pubkey compressed
   * @param integration
   * @param assetId
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
   * @param integration
   */
  async getAssets(integration: FireblocksIntegration): Promise<AssetTypeResponse[]> {
    const fbSdk = this.getSdk(integration);
    return await fbSdk.getSupportedAssets();
  }

  /**
   * Sign a Solana transaction on Fireblocks
   * @param integration
   * @param tx
   * @param assetId
   * @param note
   */
  async signSolTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['SOLStakeTx'],
    assetId: 'SOL_TEST' | 'SOL',
    note?: string,
  ) {
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

    const preparedTx = await this.client.POST('/v1/sol/transaction/prepare', {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        signatures: signatures,
      },
    });

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a Cardano transaction on Fireblocks
   * @param integration
   * @param tx
   * @param note
   */
  async signAdaTx(integration: FireblocksIntegration, tx: components['schemas']['ADAUnsignedTx'], note?: string) {
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

    const preparedTx = await this.client.POST('/v1/ada/transaction/prepare', {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        signed_messages: signedMessages,
      },
    });

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a ATOM transaction on Fireblocks
   * @param integration
   * @param tx
   * @param assetId
   * @param note
   */
  async signAtomTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['ATOMUnsignedTx'] | components['schemas']['ATOMStakeUnsignedTx'],
    assetId: 'ATOM_COS' | 'ATOM_COS_TEST',
    note?: string,
  ) {
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
    const signature = fbTx.signedMessages?.[0].signature.fullSig;
    if (!signature) {
      throw new Error('Fireblocks signature is missing');
    }

    const preparedTx = await this.client.POST('/v1/atom/transaction/prepare', {
      body: {
        pubkey: tx.pubkey,
        tx_body: tx.tx_body,
        tx_auth_info: tx.tx_auth_info,
        signature: signature,
      },
    });

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a DYDX transaction on Fireblocks
   * @param integration
   * @param tx
   * @param note
   */
  async signDydxTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['DYDXUnsignedTx'] | components['schemas']['DYDXStakeUnsignedTx'],
    note?: string,
  ) {
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
    const signature = fbTx.signedMessages?.[0].signature.fullSig;
    if (!signature) {
      throw new Error('Fireblocks signature is missing');
    }

    const preparedTx = await this.client.POST('/v1/dydx/transaction/prepare', {
      body: {
        pubkey: tx.pubkey,
        tx_body: tx.tx_body,
        tx_auth_info: tx.tx_auth_info,
        signature: signature,
      },
    });

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a FET transaction on Fireblocks
   * @param integration
   * @param tx
   * @param note
   */
  async signFetTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['FETUnsignedTx'] | components['schemas']['FETStakeUnsignedTx'],
    note?: string,
  ) {
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
    const signature = fbTx.signedMessages?.[0].signature.fullSig;
    if (!signature) {
      throw new Error('Fireblocks signature is missing');
    }

    const preparedTx = await this.client.POST('/v1/fet/transaction/prepare', {
      body: {
        pubkey: tx.pubkey,
        tx_body: tx.tx_body,
        tx_auth_info: tx.tx_auth_info,
        signature: signature,
      },
    });

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a INJ transaction on Fireblocks
   * @param integration
   * @param tx
   * @param note
   */
  async signInjTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['INJUnsignedTx'] | components['schemas']['INJStakeUnsignedTx'],
    note?: string,
  ) {
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
    const signature = fbTx.signedMessages?.[0].signature.fullSig;
    if (!signature) {
      throw new Error('Fireblocks signature is missing');
    }

    const preparedTx = await this.client.POST('/v1/inj/transaction/prepare', {
      body: {
        pubkey: tx.pubkey,
        tx_body: tx.tx_body,
        tx_auth_info: tx.tx_auth_info,
        signature: signature,
      },
    });

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a KAVA transaction on Fireblocks
   * @param integration
   * @param tx
   * @param note
   */
  async signKavaTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['KAVAUnsignedTx'] | components['schemas']['KAVAStakeUnsignedTx'],
    note?: string,
  ) {
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
    const fbNote = note ? note : 'KAVA tx from @kilnfi/sdk';
    const fbTx = await fbSigner.sign(payload, 'KAVA_KAVA', fbNote);
    const signature = fbTx.signedMessages?.[0].signature.fullSig;
    if (!signature) {
      throw new Error('Fireblocks signature is missing');
    }

    const preparedTx = await this.client.POST('/v1/kava/transaction/prepare', {
      body: {
        pubkey: tx.pubkey,
        tx_body: tx.tx_body,
        tx_auth_info: tx.tx_auth_info,
        signature: signature,
      },
    });

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a OSMO transaction on Fireblocks
   * @param integration
   * @param tx
   * @param note
   */
  async signOsmoTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['OSMOUnsignedTx'] | components['schemas']['OSMOStakeUnsignedTx'],
    note?: string,
  ) {
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
    const signature = fbTx.signedMessages?.[0].signature.fullSig;
    if (!signature) {
      throw new Error('Fireblocks signature is missing');
    }

    const preparedTx = await this.client.POST('/v1/osmo/transaction/prepare', {
      body: {
        pubkey: tx.pubkey,
        tx_body: tx.tx_body,
        tx_auth_info: tx.tx_auth_info,
        signature: signature,
      },
    });

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a TIA transaction on Fireblocks
   * @param integration
   * @param tx
   * @param note
   */
  async signTiaTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['TIAUnsignedTx'] | components['schemas']['TIAStakeUnsignedTx'],
    note?: string,
  ) {
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
    const signature = fbTx.signedMessages?.[0].signature.fullSig;
    if (!signature) {
      throw new Error('Fireblocks signature is missing');
    }

    const preparedTx = await this.client.POST('/v1/tia/transaction/prepare', {
      body: {
        pubkey: tx.pubkey,
        tx_body: tx.tx_body,
        tx_auth_info: tx.tx_auth_info,
        signature: signature,
      },
    });

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a ZETA transaction on Fireblocks
   * @param integration
   * @param tx
   * @param note
   */
  async signZetaTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['ZETAUnsignedTx'] | components['schemas']['ZETAStakeUnsignedTx'],
    note?: string,
  ) {
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
    const signature = fbTx.signedMessages?.[0].signature.fullSig;
    if (!signature) {
      throw new Error('Fireblocks signature is missing');
    }

    const preparedTx = await this.client.POST('/v1/zeta/transaction/prepare', {
      body: {
        pubkey: tx.pubkey,
        tx_body: tx.tx_body,
        tx_auth_info: tx.tx_auth_info,
        signature: signature,
      },
    });

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a DOT transaction on Fireblocks
   * @param integration
   * @param tx
   * @param note
   */
  async signDotTx(integration: FireblocksIntegration, tx: components['schemas']['DOTUnsignedTx'], note?: string) {
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
    const signature = `0x00${fbTx.signedMessages?.[0].signature.fullSig}`;

    const preparedTx = await this.client.POST('/v1/dot/transaction/prepare', {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        signature: signature,
      },
    });

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a KSM transaction on Fireblocks
   * @param integration
   * @param tx
   * @param note
   */
  async signKsmTx(integration: FireblocksIntegration, tx: components['schemas']['KSMUnsignedTx'], note?: string) {
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
    const signature = `0x00${fbTx.signedMessages?.[0].signature.fullSig}`;

    const preparedTx = await this.client.POST('/v1/ksm/transaction/prepare', {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        signature: signature,
      },
    });

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign and broadcast an ETH transaction with given integration using Fireblocks contract call feature
   * @param integration
   * @param tx
   * @param assetId
   * @param note
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
   * Sign and broadcast a POL transaction with given integration using Fireblocks contract call feature
   * @param integration
   * @param tx
   * @param assetId
   * @param note
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
   * @param integration
   * @param tx
   * @param assetId
   * @param note
   */
  async signTonTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['TONTx'],
    assetId: 'TON_TEST' | 'TON',
    note?: string,
  ) {
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
    const signature = fbTx.signedMessages?.[0].signature.fullSig;

    const preparedTx = await this.client.POST('/v1/ton/transaction/prepare', {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        signature: signature,
        from: tx.from,
      },
    });

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a XTZ transaction on Fireblocks
   * @param integration
   * @param tx
   * @param assetId
   * @param note
   */
  async signXtzTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['XTZUnsignedTx'],
    assetId: 'XTZ_TEST' | 'XTZ',
    note?: string,
  ) {
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
    const signature = fbTx.signedMessages?.[0].signature.fullSig;

    if (!signature) {
      throw new Error('Fireblocks signature is missing');
    }

    const preparedTx = await this.client.POST('/v1/xtz/transaction/prepare', {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        signature: signature,
      },
    });

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }

  /**
   * Sign a NEAR transaction on Fireblocks
   * @param integration
   * @param tx
   * @param assetId
   * @param note
   */
  async signNearTx(
    integration: FireblocksIntegration,
    tx: components['schemas']['NEARTx'],
    assetId: 'NEAR_TEST' | 'NEAR',
    note?: string,
  ) {
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
    const signature = fbTx.signedMessages?.[0].signature.fullSig;

    if (!signature) {
      throw new Error('Fireblocks signature is missing');
    }

    const preparedTx = await this.client.POST('/v1/near/transaction/prepare', {
      body: {
        unsigned_tx_serialized: tx.unsigned_tx_serialized,
        signature: signature,
      },
    });

    return {
      signed_tx: preparedTx.data,
      fireblocks_tx: fbTx,
    };
  }
}
