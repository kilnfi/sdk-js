import { bech32 } from 'bech32';
import { formatUnits, parseUnits, ripemd160, sha256 } from 'viem';

/**
 * Convert wei to ETH
 */
export const weiToEth = (wei: bigint): string => {
  return formatUnits(wei, 18);
};

/**
 * Convert wei to POL
 */
export const weiToPol = (wei: bigint): string => {
  return formatUnits(wei, 18);
};

/**
 * Convert lamports to SOL
 */
export const lamportsToSol = (lamports: bigint): string => {
  return formatUnits(lamports, 9);
};

/**
 * Convert SOL to lamports
 */
export const solToLamports = (sol: string): bigint => {
  return parseUnits(sol, 9);
};

/**
 * Convert XTZ to mutez
 */
export const xtzToMutez = (xtz: string): bigint => {
  return parseUnits(xtz, 6);
};

/**
 * Convert Cardano lovelace to ADA
 */
export const lovelaceToAda = (lovelace: bigint): string => {
  return formatUnits(lovelace, 6);
};

/**
 * Converts yocto to NEAR
 */
export const yoctoToNear = (yocto: bigint): string => {
  return formatUnits(yocto, 24);
};

/**
 * Convert nanoTON to TON
 */
export const nanotonToTon = (nanoton: bigint): string => {
  return formatUnits(nanoton, 9);
};

/**
 * Convert TON to nanoTON
 */
export const tonToNanoton = (ton: string): bigint => {
  return parseUnits(ton, 9);
};

/**
 * Convert KAVA to uKAVA
 */
export const kavaToUkava = (kava: string): bigint => {
  return parseUnits(kava, 6);
};

/**
 * Convert OM to uOM
 */
export const omToUom = (om: string): bigint => {
  return parseUnits(om, 6);
};

/**
 * Convert CRO to basecro
 */
export const croToBasecro = (cro: string): bigint => {
  return parseUnits(cro, 8);
};
/**
 * Convert uZETA to ZETA
 */
export const uzetaToZeta = (uzeta: bigint): string => {
  return formatUnits(uzeta, 6);
};

/**
 * Convert uINJ to INJ
 */
export const uinjToInj = (uinj: bigint): string => {
  return formatUnits(uinj, 6);
};

/**
 * Convert aFET to FET
 */
export const afetToFet = (afet: bigint): string => {
  return formatUnits(afet, 18);
};

/**
 * Convert uFET to FET
 */
export const ufetToFet = (ufet: bigint): string => {
  return formatUnits(ufet, 6);
};

/**
 * Convert mutez to XTZ
 */
export const mutezToXtz = (mutez: bigint): string => {
  return formatUnits(mutez, 6);
};

/**
 * Convert uDYDX to DYDX
 */
export const udydxToDydx = (udydx: bigint): string => {
  return formatUnits(udydx, 6);
};

/**
 * Convert planck to DOT
 */
export const planckToDot = (planck: bigint): string => {
  return formatUnits(planck, 10);
};

/**
 * Convert planck to KSM
 */
export const planckToKsm = (planck: bigint): string => {
  return formatUnits(planck, 12);
};

/**
 * Convert uATOM to ATOM
 */
export const uatomToAtom = (uatom: bigint): string => {
  return formatUnits(uatom, 6);
};

/**
 * Convert u{Cosmos chain token: ATOM, OSMO, etc...} to {Cosmos chain token: ATOM, OSMO, etc...}
 */
export const uunitToUnit = (uunit: bigint): string => {
  return formatUnits(uunit, 6);
};

/**
 * Convert Satoshi to BTC
 */
export const satToBtc = (sat: bigint): string => {
  return formatUnits(sat, 8);
};

/**
 * Convert BTC to Satoshi
 */
export const btcToSat = (btc: string): bigint => {
  return parseUnits(btc, 8);
};

/**
 * Convert uOSMO to OSMO
 */
export const uosmoToOsmo = (uosmo: bigint): string => {
  return formatUnits(uosmo, 6);
};

/**
 * Convert uTIA to TIA
 */
export const utiaToTia = (utia: bigint): string => {
  return formatUnits(utia, 6);
};

/**
 * Convert uusdc to USDC
 */
export const uusdcToUsdc = (uusdc: bigint): string => {
  return formatUnits(uusdc, 6);
};

/**
 * Convert USDC to uUSDC
 */
export const usdcToUusdc = (usdc: string): bigint => {
  return parseUnits(usdc, 6);
};

/**
 * Convert uKAVA to KAVA
 */
export const ukavaToKava = (ukava: bigint): string => {
  return formatUnits(ukava, 6);
};

/**
 * Convert uOM to OM
 */
export const uomToOm = (uom: bigint): string => {
  return formatUnits(uom, 6);
};

/**
 * Convert basecro to CRO
 */
export const basecroToCro = (basecro: bigint): string => {
  return formatUnits(basecro, 8);
};

/**
 * Get a cosmos address from its public key and prefix
 * @param pubkey
 * @param prefix
 */
export const getCosmosAddress = (pubkey: string, prefix: string): string => {
  const compressed_pubkey = compressPublicKey(pubkey);
  const hash = sha256(Uint8Array.from(Buffer.from(compressed_pubkey, 'hex')));
  const raw_addr = ripemd160(hash, 'bytes');
  return bech32.encode(prefix, bech32.toWords(raw_addr));
};

/**
 * Compress a cosmos public key
 * @param pubkey
 */
export const compressPublicKey = (pubkey: string): string => {
  const pub_key_buffer = new Uint8Array(Buffer.from(pubkey, 'hex'));
  if (pub_key_buffer.length !== 65) return pubkey;
  const x = pub_key_buffer.slice(1, 33);
  const y = pub_key_buffer.slice(33);
  // We will add 0x02 if the last bit isn't set, otherwise we will add 0x03
  // @ts-ignore
  const prefix = y[y.length - 1] & 1 ? '03' : '02';
  // Concatenate the prefix and the x value to get the compressed key
  const compressed_key = Buffer.concat([new Uint8Array(Buffer.from(prefix, 'hex')), x]);
  return compressed_key.toString('hex');
};

/**
 * Convert ATOM to uATOM
 */
export const atomToUatom = (atom: string): bigint => {
  return parseUnits(atom, 6);
};

/**
 * Convert DYDX to adydx
 */
export const dydxToAdydx = (dydx: string): bigint => {
  return parseUnits(dydx, 18); // adydx uses 18 decimals
};

/**
 * Convert ZETA to azeta
 */
export const zetaToAzeta = (zeta: string): bigint => {
  return parseUnits(zeta, 18); // azeta uses 18 decimals
};

/**
 * Convert OSMO to uosmo
 */
export const osmoToUosmo = (osmo: string): bigint => {
  return parseUnits(osmo, 6);
};

/**
 * Convert INJ to inj
 */
export const injToInj = (inj: string): bigint => {
  return parseUnits(inj, 18); // inj uses 18 decimals
};

/**
 * Convert TIA to utia
 */
export const tiaToUtia = (tia: string): bigint => {
  return parseUnits(tia, 6);
};

/**
 * Convert FET to afet
 */
export const fetToAfet = (fet: string): bigint => {
  return parseUnits(fet, 18); // afet uses 18 decimals
};

/**
 * Convert TRX to sun
 */
export const trxToSun = (trx: string): bigint => {
  return parseUnits(trx, 6);
};

/**
 * Convert sun to TRX
 */
export const sunToTrx = (trx: bigint): string => {
  return formatUnits(trx, 6);
};
