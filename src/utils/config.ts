import * as dotenv from 'dotenv';
import { log, readWalletJson } from '.';
import { map } from 'lodash-es';
import { ethers } from 'ethers';
import path from 'path';
dotenv.config();
import * as bip39 from 'bip39';
const walletPath = '../resources/wallets.json';
const proxyPath = '../resources/proxy.txt';
export interface Wallet {
  address: string;
  privateKey: string;
  mnemonic?: string;
}
export const NETWORKS = {
  SEPOLIA_RPC: `https://sepolia.infura.io/v3/${process.env.YOUR_INFURA_KEY}`,
};

export const REFERAL_CODE: string[] = JSON.parse(
  process.env.REFERAL_CODE || '',
);

export const LOGS_FOLDER: string = path.join(__dirname, `../logs`);

export const CHUNK_SIZE: number =
  (process.env.CHUNK_SIZE as unknown as number) || 10;

export const WALLETS: () => Promise<ethers.Wallet[]> = async () => {
  const wallets: Wallet[] = readWalletJson(walletPath);
  if (wallets.length === 0) {
    log.info(`No wallets found, creating new wallet first.`);
    return [];
  }

  return map(
    wallets,
    (wallet) =>
      new ethers.Wallet(
        wallet.privateKey,
        new ethers.JsonRpcProvider(NETWORKS.SEPOLIA_RPC),
      ),
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
