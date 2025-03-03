import { ethers } from 'ethers';
import { LayerEdge, log, readWalletJson } from './utils';
import { NETWORKS, REFERAL_CODE, Wallet } from './utils/config';

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
  const wallets: Wallet[] = readWalletJson(walletPath);
  let stats: Stat[] = [];
  for (const wallet of wallets) {
    log.info(`Processing wallet ${wallet.address}`);
    const { address, privateKey } = wallet;
    const account = new ethers.Wallet(
      privateKey,
      new ethers.JsonRpcProvider(NETWORKS.SEPOLIA_RPC),
    );

    const layerEdge = new LayerEdge(refCode, null);

    const [response, status] = await Promise.all([
      layerEdge.checkNodePoints(account),
      layerEdge.checkNodeStatus(account),
    ]);

    const stat: Stat = {
      address,
      point: response && response.nodePoints ? response.nodePoints : 0,
      referral: response && response.referralCount ? response.referralCount : 0,
      referal_code:
        response && response.referralCode ? response.referralCode : '',
      status: status ? 'Running' : 'Stopped',
    };

    stats.push(stat);
  }

  console.table(stats);
})();
