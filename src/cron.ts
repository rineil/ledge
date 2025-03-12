import * as dotenv from 'dotenv';

import { WALLETS, WalletType, log, proxyPath, readJsonFile } from './utils';

import cron from 'node-cron';
import { ethers } from 'ethers';
import recipeJson from '../src/resources/receipt.json';
import { runMainTask } from '.';
import { runRecipe } from './receipt';

dotenv.config();

const SCHEDULE_DAILY = process.env.SCHEDULE_DAILY || '0 12 * * *';
const SCHEDULE_MAIN_TASK = process.env.SCHEDULE_MAIN_TASK || '0 1-23/4 * * *';

const runDailyJob = async (walletType: WalletType = 'main') => {
  let recipe: JSON = JSON.parse(JSON.stringify(recipeJson));

  await Promise.all([await runRecipe(await WALLETS(walletType), recipe)]);
};

const runMainTaskJob = async (walletType: WalletType = 'main') => {
  const wallets: ethers.Wallet[] = await WALLETS(walletType);
  const proxies = readJsonFile(proxyPath);

  await runMainTask(wallets, proxies);
};

(async () => {
  cron.schedule(
    SCHEDULE_DAILY,
    async () => {
      try {
        await runDailyJob('all');
      } catch (error: any) {
        log.error('❌ [Daily Job] Error:', error.message);
      } finally {
      }
    },
    {
      timezone: 'UTC',
      name: 'ledge-daily-job',
    },
  );

  cron.schedule(
    SCHEDULE_MAIN_TASK,
    async () => {
      try {
        await runMainTaskJob();
      } catch (error: any) {
        log.error('❌ [Main Job] Error:', error.message);
      } finally {
      }
    },
    {
      timezone: 'UTC',
      name: 'ledge-main-job',
    },
  );
})();
