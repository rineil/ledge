import {
  WALLETS,
  WalletType,
  banner,
  delay,
  getAccountWithIP,
  log,
  proxyPath,
  readJsonFile,
  startCountdown,
} from './utils';

import chalk from 'chalk';
import { ethers } from 'ethers';
import inquirer from 'inquirer';
import readlinkSync from 'readline-sync';
import { runMainTask } from '.';

(async () => {
  log.info(banner);

  let batch = 0;
  const hours = readlinkSync.questionInt(
    chalk.redBright.bold('How often to run (hours): '),
    {
      defaultInput: '4',
    },
  );

  if (hours <= 0 || hours > 24) {
    log.warn('Invalid input hour');
    return;
  }

  const { choice }: { choice: WalletType } = await inquirer.prompt([
    {
      type: 'list',
      message: 'Select wallet type for process:',
      choices: ['main', 'ref', 'all'],
      default: 'main',
      name: 'choice',
    },
  ]);

  // const wallets: ethers.Wallet[] = await WALLETS(choice);
  // const proxies = readJsonFile(proxyPath);

  const accounts: Record<string, object> = await getAccountWithIP(choice);

  while (++batch) {
    // await runMainTask(wallets, proxies);
    await runMainTask(accounts);

    const sleep = hours * 60 * 60;
    await delay(2);
    await startCountdown(sleep);
  }
})();
