// import {
//   FireblocksSDK,
//   PeerType, RawMessageData,
//   TransactionArguments,
//   TransactionOperation,
// } from "fireblocks-sdk";
// import type { Signer, SignerResult } from "@polkadot/api/types";
// import type { SignerPayloadRaw } from "@polkadot/types/types";
// import type { HexString } from "@polkadot/util/types";
// import { blake2AsHex } from '@polkadot/util-crypto';
// import { FbSigner } from "./fb_signer";
//
// type AssetId = 'WND' | 'DOT';
//
// export class DotFbSigner extends FbSigner implements Signer {
//   protected assetId: AssetId;
//   protected note?: string;
//
//   constructor(fireblocks: FireblocksSDK, vaultId: number, assetId: AssetId, note?: string) {
//     super(fireblocks, vaultId);
//     this.assetId = assetId;
//     this.note = note;
//   };
//
//   public async signRaw({ data }: SignerPayloadRaw): Promise<SignerResult> {
//     data = (data.length > (256 + 1) * 2) ? blake2AsHex(data) : data;
//
//     const rawMessageData: RawMessageData = {
//       messages: [{
//         content: data.substring(2)
//       }]
//     };
//
//     const tx: TransactionArguments = {
//       operation: TransactionOperation.RAW,
//       source: {
//         type: PeerType.VAULT_ACCOUNT,
//         id: this.vaultId.toString()
//       },
//       assetId: this.assetId,
//       extraParameters: { rawMessageData },
//       note: this.note,
//     };
//
//     const fbTx = await this.fireblocks.createTransaction(tx);
//     let signedTx = await this.waitForTxCompletion(fbTx);
//
//     const signature: HexString = `0x00${signedTx.signedMessages![0].signature.fullSig}`;
//     return {
//       id: 1,
//       signature,
//     };
//   }
// }
//
