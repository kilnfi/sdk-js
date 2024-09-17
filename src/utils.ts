// Convert Ethereum wei to ETH
import { formatEther, formatUnits, parseUnits } from 'viem';

export const weiToEth = (wei: bigint): string => {
  return formatEther(BigInt(wei));
};

// Convert wei to POL
export const weiToPol = (wei: bigint): string => {
  return formatUnits(wei, 18);
};

// Convert Solana lamports to SOL
export const lamportsToSol = (lamports: bigint): string => {
  return formatUnits(lamports, 9);
};

// Convert SOL to lamports
export const solToLamports = (sol: string): bigint => {
  return parseUnits(sol, 9);
};

// Convert Cardano lovelace to ADA
export const lovelaceToAda = (lovelace: bigint): string => {
  return formatUnits(lovelace, 6);
};

// Converts Near yocto to NEAR
export const yoctoToNear = (yocto: bigint): string => {
  return formatUnits(yocto, 24);
};

export const nanotonToTon = (nanoton: bigint): string => {
  return formatUnits(nanoton, 9);
};

export const uzetaToZeta = (uzeta: bigint): string => {
  return formatUnits(uzeta, 6);
};

export const uinjToInj = (uinj: bigint): string => {
  return formatUnits(uinj, 6);
};

export const afetToFet = (afet: bigint): string => {
  return formatUnits(afet, 18);
};

export const ufetToFet = (ufet: bigint): string => {
  return formatUnits(ufet, 6);
};

// Convert Tezos micro tez (mutez) to XTZ
export const mutezToXtz = (mutez: bigint): string => {
  return formatUnits(mutez, 6);
};

export const udydxToDydx = (udydx: bigint): string => {
  return formatUnits(udydx, 6);
};

export const planckToDot = (planck: bigint): string => {
  return formatUnits(planck, 10);
};

export const planckToKsm = (planck: bigint): string => {
  return formatUnits(planck, 12);
};

// Convert uATOM to ATOM
export const uatomToAtom = (uatom: bigint): string => {
  return formatUnits(uatom, 6);
};

export const uunitToUnit = (uunit: bigint): string => {
  return formatUnits(uunit, 6);
};

// Convert uOSMO to OSMO
export const uosmoToOsmo = (uosmo: bigint): string => {
  return formatUnits(uosmo, 6);
};

// Convert uTIA to TIA
export const utiaToTia = (utia: bigint): string => {
  return formatUnits(utia, 6);
};

// Convert uusdc to USDC
export const uusdcToUsdc = (uusdc: bigint): string => {
  return formatUnits(uusdc, 6);
};
