import {
  delay,
  LayerEdge,
  log,
  readJsonFile,
  readWalletJson,
  writeJsonFile,
} from './utils';
import { NETWORKS, REFERAL_CODES, Wallet } from './utils/config';
import { map, sample } from 'lodash-es';
import inquirer from 'inquirer';
import { ethers, HDNodeWallet } from 'ethers';
import * as fs from 'fs';

const walletPath = '../resources/wallets_ref.json';
const proxyPath = '../resources/proxy.txt';

(async () => {
  if (REFERAL_CODES.length == 0) {
    log.warn('No referal code found in .env - check REFERAL_CODES variable.');
    return;
  }

  const { batch } = await inquirer.prompt([
    {
      type: 'list',
      message: 'Select an option:',
      choices: ['10', '20', '30', '40', '50'],
      default: '10',
      name: 'batch',
    },
  ]);
  await Promise.all([runTask(Number(batch))]);
})();

async function runTask(batch: number): Promise<void> {
  const proxies = readJsonFile(proxyPath);
  let index: number = 1;

  while (true) {
    await Promise.all(
      map(REFERAL_CODES, async (ref) => {
        const proxy = sample(proxies) || undefined;
        try {
          const socket = new LayerEdge(ref, proxy);
          if (await socket.checkInvite(ref)) {
            log.info(
              `Invite code ${ref} - batch ${index}/${batch} running ...`,
            );
            const randomWallet: HDNodeWallet = ethers.Wallet.createRandom(
              new ethers.JsonRpcProvider(NETWORKS.SEPOLIA_RPC),
            );
            const { address, privateKey, mnemonic, provider } = randomWallet;
            const wallet = new ethers.Wallet(privateKey, provider);

            log.warn(`${address} registering with ${ref} ...`);
            await socket.registerWallet(wallet, ref);
            await delay(3);
            log.info(`${address} checkin ...`);
            await socket.checkIN(wallet);
            await delay(3);
            await socket.connectNode(wallet);
            await delay(3);

            if (await socket.checkNodeStatus(wallet)) {
              log.info(`${address} node is running`);
              const refWallets: Wallet[] = readWalletJson(walletPath);
              refWallets.push({
                address,
                privateKey,
                mnemonic: mnemonic?.phrase,
              });
              writeJsonFile(walletPath, JSON.stringify(refWallets, null, 2));
            } else {
              log.error(`${address} node not running`);
            }
          } else {
            log.error(`Referral code ${ref} not found`);
          }
          // log.info(`${address} checking node points`);
          // await socket.checkNodePoints(wallet);
        } catch (error: any) {
          log.error(`Error: ${error.message}`);
        }
      }),
    );
    index++;
    if (batch < index) {
      log.info('Batch reached! Exit.');
      return;
    }
  }
}
