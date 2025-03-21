import * as bip39 from 'bip39';
import * as dotenv from 'dotenv';

import { log, readWalletJson } from '.';

import { ethers } from 'ethers';
import { map } from 'lodash-es';
import path from 'path';

dotenv.config();
export const walletPath = '../resources/wallets.json';
export const refWalletPath = '../resources/wallets_ref.json';
export const proxyPath = '../resources/proxy.txt';

export interface WalletJson {
  address: string;
  privateKey: string;
  mnemonic?: string;
  ip?: string;
}
export type WalletType = 'main' | 'ref' | 'all';

export const NETWORKS = {
  SEPOLIA_RPC: `https://sepolia.infura.io/v3/${process.env.YOUR_INFURA_KEY}`,
};

export const sepoliaProvider = new ethers.JsonRpcProvider(NETWORKS.SEPOLIA_RPC);

export const REFERAL_CODES: string[] = JSON.parse(
  process.env.REFERAL_CODES || '',
);

export const LOGS_FOLDER: string = path.join(__dirname, `../logs`);

export const CHUNK_SIZE: number =
  (process.env.CHUNK_SIZE as unknown as number) || 10;

export const WALLETS: (input?: WalletType) => Promise<ethers.Wallet[]> = async (
  input: WalletType = 'main',
) => {
  const wallets: WalletJson[] = readWalletJson(walletPath);
  const refWallets: WalletJson[] = readWalletJson(refWalletPath);

  const mergedWallets = [...wallets, ...refWallets];
  if (mergedWallets.length === 0) {
    log.info(`No wallets found, creating new wallet first.`);
    return [];
  }

  if (input === 'main') {
    return map(
      wallets,
      (wallet) => new ethers.Wallet(wallet.privateKey, sepoliaProvider),
    );
  } else if (input === 'ref') {
    return map(
      refWallets,
      (wallet) => new ethers.Wallet(wallet.privateKey, sepoliaProvider),
    );
  }

  return map(
    mergedWallets,
    (wallet) => new ethers.Wallet(wallet.privateKey, sepoliaProvider),
  );
};

export const PRIVATE_KEYS: (from?: number, to?: number) => string[] = (
  from = (process.env.FROM_ACCOUNT_INDEX as unknown as number) || 0,
  to = (process.env.TO_ACCOUNT_INDEX as unknown as number) || 9,
) => {
  console.log(`FROM_ACCOUNT_INDEX: ${from}`);
  console.log(`TO_ACCOUNT_INDEX: ${to}`);

  const privateKeys: string[] = JSON.parse(process.env.PRIVATE_KEYS || '[]');
  const seedPhrase = process.env.SEED_PHRASE || '';

  if (bip39.validateMnemonic(seedPhrase)) {
    const mnemonic = ethers.Mnemonic.fromPhrase(seedPhrase);
    for (let index = parseInt(`${from}`); index <= parseInt(`${to}`); index++) {
      const wallet = ethers.HDNodeWallet.fromMnemonic(
        mnemonic,
        `m/44'/60'/0'/0/${index}`,
      );
      privateKeys.push(wallet.privateKey);
    }
  } else {
    log.warn(
      'Warring: Seed Phrase invalid or not provided, Please provide a valid seed phrase in .env file.',
    );
  }

  return privateKeys;
};

export const getAccountWithIP = async (
  input?: WalletType,
): Promise<Record<string, object>> => {
  try {
    const walletWithIP: Record<string, object> = {};
    const mainWallets: WalletJson[] = readWalletJson(walletPath);
    const refWallets: WalletJson[] = readWalletJson(refWalletPath);
    const mergedWallets = [...mainWallets, ...refWallets];

    if (input === 'main') {
      map(mainWallets, (wallet: WalletJson) => {
        walletWithIP[wallet.address] = {
          wallet: new ethers.Wallet(wallet.privateKey, sepoliaProvider),
          ip: wallet.ip || undefined,
        };
      });
    } else if (input === 'ref') {
      for (const wallet of refWallets) {
        walletWithIP[wallet.address] = {
          wallet: new ethers.Wallet(wallet.privateKey, sepoliaProvider),
          ip: wallet.ip || undefined,
        };
      }
    } else {
      for (const wallet of mergedWallets) {
        walletWithIP[wallet.address] = {
          wallet: new ethers.Wallet(wallet.privateKey, sepoliaProvider),
          ip: wallet.ip || undefined,
        };
      }
    }

    return walletWithIP;
  } catch (error: any) {
    log.error(error.message);
    return {};
  }
};
