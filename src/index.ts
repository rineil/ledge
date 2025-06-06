import { LayerEdge, banner, delay, log } from './utils';

import chalk from 'chalk';
import { ethers } from 'ethers';
import { map } from 'lodash-es';

const refCode = '';

export const runMainTask = async (
  // wallets: ethers.Wallet[],
  // proxies: string[],
  accountObj: Record<string, object>,
) => {
  log.info(banner);

  let wallets: ethers.Wallet[] = [];
  let proxies: { account: string; proxy?: string }[] = [];

  map(accountObj, (account: { wallet: ethers.Wallet; ip?: string }) => {
    wallets.push(account.wallet as ethers.Wallet);
    proxies.push({
      account: account.wallet.address,
      proxy: account.ip,
    });
  });

  if (proxies.length === 0)
    log.warn('No proxies found in proxy.txt - running without proxies');
  if (wallets.length === 0) {
    log.info(`No wallets found, creating new wallet first.`);
    return;
  }

  log.info(`Starting run ${chalk.redBright(wallets.length)} wallets`);
  let proxy: string = '';
  await Promise.all(
    map(wallets, async (wallet: ethers.Wallet, index: number) => {
      const proxy = proxies.find((it) => it.account === wallet.address)?.proxy;
      const address: string = wallet.address;
      const ledgeClient = new LayerEdge(refCode, proxy);
      const { ip } = (
        await ledgeClient.request('https://api.ipify.org?format=json', 'GET')
      ).data || { ip: 'unknown' };

      try {
        log.info(`${address} processing with proxy: ${ip}`);
        // await ledgeClient.checkIN(wallet);
        await delay(2);
        if (await ledgeClient.checkNodeStatus(wallet)) {
          log.info(
            `${address} Node is running - trying to claim node points...`,
          );
          await ledgeClient.stopNode(wallet);
        }
        log.warn(`${address} Node is stopped, trying to reconnect node ...`);
        await ledgeClient.connectNode(wallet);
      } catch (error: any) {
        log.error(`Error: ${error.message}`);
      }
    }),
  );
};
