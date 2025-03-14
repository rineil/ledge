import { HDNodeWallet, ethers } from 'ethers';
import {
  LayerEdge,
  NETWORKS,
  REFERAL_CODES,
  WalletJson,
  delay,
  log,
  proxyPath,
  readJsonFile,
  readWalletJson,
  refWalletPath,
  walletPath,
  writeJsonFile,
} from './utils';
import { map, sample } from 'lodash-es';

import inquirer from 'inquirer';
import chalk from 'chalk';

(async () => {
  if (REFERAL_CODES.length == 0) {
    log.warn('No referal code found in .env - check REFERAL_CODES variable.');
    return;
  }

  const { batch } = await inquirer.prompt([
    {
      type: 'list',
      message: 'Select an option:',
      choices: ['10', '20', '30', '40', '50', 'Other'],
      default: '10',
      name: 'batch',
    },
  ]);
  if (batch === 'Other') {
    const { customBatch } = await inquirer.prompt([
      {
        type: 'input',
        message: 'Enter custom batch number:',
        name: 'customBatch',
      },
    ]);
    await runTask(Number(customBatch));
    return;
  }
  await runTask(Number(batch));
})();

async function runTask(batch: number): Promise<void> {
  const proxies = readJsonFile(proxyPath);
  let index: number = 1;

  while (true) {
    await Promise.all(
      map(REFERAL_CODES, async (ref, index) => {
        const proxy = proxies[index];
        try {
          const socket = new LayerEdge(ref, proxy);
          if (await socket.checkInvite(ref)) {
            const randomWallet: HDNodeWallet = ethers.Wallet.createRandom(
              new ethers.JsonRpcProvider(NETWORKS.SEPOLIA_RPC),
            );
            const { address, privateKey, mnemonic, provider } = randomWallet;
            const wallet = new ethers.Wallet(privateKey, provider);

            log.warn(
              `${address} registering batch ${index}/${batch} ${chalk.redBright.bold(ref)} ...`,
            );
            await socket.registerWallet(wallet, ref);
            await socket.checkIN(wallet);
            await socket.connectNode(wallet);

            if (await socket.checkNodeStatus(wallet)) {
              await socket.submitProof(wallet);
              log.success(`${address} node is running`);
              const refWallets: WalletJson[] = readWalletJson(refWalletPath);
              refWallets.push({
                address,
                privateKey,
                mnemonic: mnemonic?.phrase,
              });
              writeJsonFile(walletPath, JSON.stringify(refWallets, null, 2));
            } else {
              log.error(`${address} node not running`);
              await socket.connectNode(wallet);
            }
          } else {
            log.error(`Referral code ${ref} invalid or expired`);
          }
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
