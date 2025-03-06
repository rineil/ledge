import { ethers } from 'ethers';
import { LayerEdge, log, readWalletJson } from './utils';
import { NETWORKS, Wallet, WALLETS } from './utils/config';
import { map } from 'lodash-es';
import inquirer from 'inquirer';

const walletPath = '../resources/wallets.json';
const refCode = 'KEyq2IvP';
interface Stat {
  address: string;
  point: number;
  referral: number;
  referal_code: string;
  status: 'Running' | 'Stopped';
}

(async () => {
  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      message: 'Select wallet type for process:',
      choices: ['main', 'all'],
      default: 'main',
      name: 'choice',
    },
  ]);
  const wallets: Wallet[] = await WALLETS(choice);
  let stats: Stat[] = [];
  await Promise.all(
    map(wallets, async (wallet) => {
      const { address, privateKey } = wallet;
      const account = new ethers.Wallet(
        privateKey,
        new ethers.JsonRpcProvider(NETWORKS.SEPOLIA_RPC),
      );
      log.info(`${wallet.address} running ...`);
      const layerEdge = new LayerEdge(refCode, null);
      const [response, status] = await Promise.all([
        layerEdge.checkNodePoints(account),
        layerEdge.checkNodeStatus(account),
      ]);

      const stat: Stat = {
        address,
        point: response && response.nodePoints ? response.nodePoints : 0,
        referral:
          response && response.referralCount ? response.referralCount : 0,
        referal_code:
          response && response.referralCode ? response.referralCode : '',
        status: status ? 'Running' : 'Stopped',
      };

      stats.push(stat);
    }),
  );
  stats.sort((a, b) => b.point - a.point);
  console.table(stats);
})();
