import { formatUnits, parseUnits } from 'viem';

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
 * Convert uKAVA to KAVA
 */
export const ukavaToKava = (ukava: bigint): string => {
  return formatUnits(ukava, 6);
};
