import chalk from 'chalk';
import {
  delay,
  LayerEdge,
  log,
  readJsonFile,
  readWalletJson,
  writeJsonFile,
} from './utils';
import {
  LOGS_FOLDER,
  NETWORKS,
  PRIVATE_KEYS,
  REFERAL_CODE,
  Wallet,
} from './utils/config';
import readlineSync from 'readline-sync';
import { sample } from 'lodash-es';
import { ethers } from 'ethers';
import path from 'path';
import * as fs from 'fs';
import { BADHINTS } from 'dns/promises';

const walletPath = '../resources/wallets_ref.json';
const proxyPath = '../resources/proxy.txt';
const refLog = path.join(LOGS_FOLDER, `latest_index.txt`);

(async () => {
  await init();
  const proxies = readJsonFile(proxyPath);
  const refs = REFERAL_CODE;
  if (refs.length == 0) {
    log.warn('No referal code found in .env - check REFERAL_CODE variable.');
    return;
  }

  const latest_index: number = Number(readLogFile(refLog)) || 0;
  log.info('Latest wallet index', `${latest_index}`);

  let batch = readlineSync.questionInt(
    chalk.red.bold('Number of wallets run referal: '),
  );

  if (batch < 1) {
    log.warn('Invalid batch number');
    return;
  }

  let fromIndex = latest_index == 0 ? 0 : latest_index + 1;
  let toIndex = fromIndex + --batch;
  const privateKeys = PRIVATE_KEYS(fromIndex, toIndex);
  console.log(privateKeys);

  writeLogFile(refLog, `${toIndex}`);
  return;

  const refWallets: Wallet[] = readWalletJson(walletPath);
  while (batch > 0) {
    log.info(`Batch run ${batch} started ...`);
    for (const ref of refs) {
      const proxy = sample(proxies);
      const random = ethers.Wallet.createRandom(
        new ethers.JsonRpcProvider(NETWORKS.SEPOLIA_RPC),
      );
      const wallet = new ethers.Wallet(random.privateKey, random.provider);
      const { address, privateKey, mnemonic } = random;

      try {
        const socket = new LayerEdge(ref, proxy);
        log.info(`${address} processing `);
        // const nodeStatus = await socket.checkNodeStatus(wallet);
        log.warn(`${address} not registered yet. Registering wallet...`);
        await socket.registerWallet(wallet, ref);
        await delay(3);
        log.info(`${address} checkin ...`);
        await socket.checkIN(wallet);

        await delay(3);
        log.info(`${address} trying to starting node`);
        await socket.connectNode(wallet);

        await delay(3);
        log.info(`${address} checking node points`);
        await socket.checkNodePoints(wallet);

        refWallets.push({
          address,
          privateKey,
          mnemonic: mnemonic?.phrase,
        });

        writeJsonFile(walletPath, JSON.stringify(refWallets, null, 2));
      } catch (error: any) {
        log.error(`Error: ${error.message}`);
      }
    }

    log.warn('Waiting 10s for next batch run ...');
    await delay(10);
    batch--;
  }
})();

async function init() {
  log.info('Initiating ...');
  if (!fs.existsSync(refLog)) {
    fs.writeFileSync(refLog, '0');
  }
}

function readLogFile(filepath: string) {
  try {
    return fs.readFileSync(filepath, 'utf8').split('\n')[0];
  } catch (error: any) {
    log.error('Failed to read file', error?.message);
  }
}

function writeLogFile(filepath: string, data: string) {
  try {
    fs.writeFileSync(filepath, data);
  } catch (error: any) {
    log.error('Failed to write file', error?.message);
  }
}
