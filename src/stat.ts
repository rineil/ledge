import {
  CHUNK_SIZE,
  LayerEdge,
  NETWORKS,
  WALLETS,
  WalletJson,
  WalletType,
  log,
} from './utils';
import { chunk as chunk_lodash, map } from 'lodash-es';

import { ethers } from 'ethers';
import inquirer from 'inquirer';

const refCode = 'KEyq2IvP';
interface Stat {
  address: string;
  point: number;
  referralCount: number;
  referralPoints: number;
  referralCode: string;
  status: 'Running' | 'Stopped';
}

let chunk = CHUNK_SIZE;

export async function main() {
  const { choice }: { choice: WalletType } = await inquirer.prompt([
    {
      type: 'list',
      message: 'Select wallet type for process:',
      choices: ['main', 'ref', 'all'],
      default: 'main',
      name: 'choice',
    },
  ]);

  await run(await WALLETS(choice));
}

async function run(chunks: WalletJson[]) {
  const chunkWallets = chunk_lodash(chunks, chunk);
  let stats: Stat[] = [];
  log.info(`Total wallets: ${chunks.length}`);
  const layerEdge = new LayerEdge(refCode, null);

  for (let index = 0; index < chunkWallets.length; index++) {
    const wallets = chunkWallets[index];

    await Promise.all(
      map(wallets, async (wallet) => {
        const { address, privateKey } = wallet;
        const account = new ethers.Wallet(
          privateKey,
          new ethers.JsonRpcProvider(NETWORKS.SEPOLIA_RPC),
        );
        log.info(`${wallet.address} running ...`);
        const [response, status] = await Promise.all([
          layerEdge.checkNodePoints(account),
          layerEdge.checkNodeStatus(account),
        ]);

        const stat: Stat = {
          address,
          point: response && response.nodePoints ? response.nodePoints : 0,
          referralCount:
            response && response.referralCount ? response.referralCount : 0,
          referralPoints:
            response && response.referralPoints ? response.referralPoints : 0,
          referralCode:
            response && response.referralCode ? response.referralCode : '',
          status: status ? 'Running' : 'Stopped',
        };

        stats.push(stat);
      }),
    );
  }
  stats
    .sort((a, b) => b.point - a.point)
    .sort((a, b) => b.referralPoints - a.referralPoints)
    .sort((a, b) => b.referralCount - a.referralCount);
  console.table(stats);
}

main();
