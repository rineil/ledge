import chalk from 'chalk';
import { banner, delay, LayerEdge, log, readJsonFile } from './utils';
import { map } from 'lodash-es';
import { WALLETS } from './utils/config';
import readlinkSync from 'readline-sync';
import child_process from 'child_process';
import { startCountdown } from './utils/helper';

const proxyPath = '../resources/proxy.txt';
const refCode = 'KEyq2IvP';

const main = async () => {
  log.info(banner);

  const hours = readlinkSync.questionInt(
    chalk.redBright.bold('How often to run (hours): '),
    {
      defaultInput: '3',
      min: 1,
      max: 24,
    },
  );

  if (hours <= 0 || hours > 24) {
    log.warn('Invalid input hour');
    return;
  }

  const wallets = await WALLETS();
  const proxies = readJsonFile(proxyPath);
  let batch = 0;

  if (proxies.length === 0)
    log.warn('No proxies found in proxy.txt - running without proxies');
  if (wallets.length === 0) {
    log.info(`No wallets found, creating new wallet first.`);
    return;
  }

  log.info(
    `Starting run Program with ${chalk.redBright(wallets.length)} wallets`,
  );

  while (++batch) {
    await Promise.all(
      map(wallets, async (wallet, index) => {
        const address = wallet.address;
        const proxy = proxies[index % proxies.length] || null;
        const socket = new LayerEdge(refCode, proxy);
        const { ip } = (
          await socket.request('https://api.ipify.org?format=json', 'GET')
        ).data || { ip: 'unknown' };

        try {
          log.info(`${address} processing with proxy: ${ip}`);
          await delay(1);

          //   log.info(`${address} checking node status`);
          await socket.checkIN(wallet);
          await delay(2);
          const isRunning = await socket.checkNodeStatus(wallet);
          await delay(2);
          if (isRunning) {
            log.info(
              `${address} Node is running - trying to claim node points...`,
            );
            await socket.stopNode(wallet);
          }

          log.warn(`${address} Node is stopped, trying to reconnect node ...`);
          await socket.connectNode(wallet);
        } catch (error: any) {
          log.error(`Error: ${error.message}`);
        }
      }),
    );

    log.info(`Run statistics`);
    child_process.execSync('pnpm stat', { stdio: 'inherit' });

    const sleep = hours * 60 * 60;
    await delay(2);
    await startCountdown(sleep);
  }
};

main();
