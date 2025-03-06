import axios, { AxiosRequestConfig } from 'axios';
import { delay, log, renderAgent } from '.';
import ethers from 'ethers';
import chalk from 'chalk';
import { map } from 'lodash-es';

class LayerEdgeConnection {
  proxy: any;
  refCode: string;
  headers: {
    [key: string]: string;
  };
  axiosConfig: AxiosRequestConfig = {};

  constructor(refCode: string, proxy: any) {
    this.proxy = proxy;
    this.refCode = refCode;

    this.headers = {
      Accept: 'application/json, text/plain, */*',
      Origin: 'https://dashboard.layeredge.io',
      Referer: 'https://dashboard.layeredge.io/',
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    };

    this.axiosConfig = {
      baseURL: 'https://referralapi.layeredge.io/api',
      timeout: 60000,
      ...(this.proxy && {
        httpAgent: renderAgent(this.proxy),
        httpsAgent: renderAgent(this.proxy),
      }),
      headers: this.headers,
    };
  }

  request = async (
    url: string,
    method: string,
    config: {} = {},
    retries: number = 30,
  ): Promise<any> => {
    for (let i = 0; i < retries; i++) {
      try {
        const headers = { ...this.headers };
        if (method.toUpperCase() === 'POST') {
          headers['Content-Type'] = 'application/json';
        }

        return await axios.request({
          url,
          method,
          headers,
          ...config,
          ...this.axiosConfig,
        });
      } catch (error: any) {
        if (error?.response?.status === 404 || error?.status === 404) {
          log.error(
            chalk.red(
              `Layer Edge connection failed wallet not registered yet...`,
            ),
          );
          return 404;
        } else if (error?.response?.status === 405 || error?.status === 405) {
          return { data: 405 };
        } else if (i === retries - 1) {
          log.error(`Max retries reached - Request failed:`, error.message);
          if (this.proxy) {
            log.error(`Failed proxy: ${this.proxy}`, error.message);
          }
          return null;
        }

        process.stdout.write(
          chalk.yellow(
            `request failed: ${error.message} => Retrying... (${i + 1}/${retries})\r`,
          ),
        );
        await delay(5);
      }
    }
    return null;
  };

  checkInvite = async (invite_code: string) => {
    const payload = {
      invite_code,
    };

    const response = await this.request(
      '/referral/verify-referral-code',
      'post',
      { data: payload },
    );

    if (response && response.data && response.data.data.valid === true) {
      // log.info('Invite Code Valid', response.data);
      log.info(`Invite Code ${invite_code} is valid`);
      return true;
    } else {
      log.error('Failed to check invite');
      return false;
    }
  };

  registerWallet = async (wallet: ethers.Wallet, invite_code: string) => {
    const payload = {
      walletAddress: wallet.address,
    };

    const response = await this.request(
      `/referral/register-wallet/${invite_code}`,
      'post',
      { data: payload },
    );

    if (response && response.data) {
      // log.info('Wallet successfully registered', response.data);
      log.info(`${wallet.address} successfully registered with ${invite_code}`);
      return true;
    } else {
      log.error('Failed To Register wallets', 'error');
      return false;
    }
  };

  checkIN = async (wallet: ethers.Wallet) => {
    const timestamp = Date.now();
    const message = `I am claiming my daily node point for ${wallet.address} at ${timestamp}`;

    const signature = await wallet.signMessage(message);
    const payload = {
      sign: signature,
      timestamp,
      walletAddress: wallet.address,
    };

    return await this.request('/light-node/claim-node-points', 'POST', {
      data: payload,
    });
  };

  checkNodeStatus = async (wallet: ethers.Wallet) => {
    const response = await this.request(
      `/light-node/node-status/${wallet.address}`,
      'GET',
    );

    if (response === 404) {
      log.warn('Node not found in this wallet, trying to regitering wallet...');
      await this.registerWallet(wallet, this.refCode);
      return false;
    }
    if (
      response &&
      response.data &&
      response.data.data.startTimestamp !== null
    ) {
      // log.info(`${wallet.address} node is running`);
      return true;
    } else {
      // log.error('Node not running trying to start node...');
      return false;
    }
  };

  connectNode = async (wallet: ethers.Wallet) => {
    const timestamp = Date.now();
    const message = `Node activation request for ${wallet.address} at ${timestamp}`;
    const sign = await wallet.signMessage(message);

    const dataSign = {
      sign: sign,
      timestamp: timestamp,
    };

    const response = await this.request(
      `/light-node/node-action/${wallet.address}/start`,
      'post',
      { data: dataSign },
    );

    if (
      response &&
      response.data &&
      response.data.message === 'node action executed successfully'
    ) {
      log.success(`${wallet.address} connect node successful`);
      return true;
    } else {
      log.error('Failed to connect Node');
      return false;
    }
  };

  stopNode = async (wallet: ethers.Wallet) => {
    const timestamp = Date.now();
    const message = `Node deactivation request for ${wallet.address} at ${timestamp}`;
    const sign = await wallet.signMessage(message);

    const dataSign = {
      sign: sign,
      timestamp: timestamp,
    };

    const response = await this.request(
      `/light-node/node-action/${wallet.address}/stop`,
      'post',
      { data: dataSign },
    );

    if (response && response.data) {
      log.info(`${wallet.address} Stopping Node.`);
      return true;
    } else {
      log.error(`${wallet.address} Failed to Stopping Node.`);
      return false;
    }
  };

  checkNodePoints = async (wallet: ethers.Wallet) => {
    const response = await this.request(
      `/referral/wallet-details/${wallet.address}`,
      'GET',
    );

    if (response === 404) {
      log.info('Node not found in this wallet, trying to regitering wallet...');
      await this.registerWallet(wallet, this.refCode);
      return false;
    }

    if (response?.data?.data) {
      const { referralCode, nodePoints } = response.data.data;
      const referralCount = map(
        response.data.data.referrals,
        (referal) => referal.type == 'referral',
      ).filter((data) => data).length;

      return { nodePoints, referralCount, referralCode };
    } else {
      log.error('Failed to check Total Points..');
      return {
        nodePoints: 0,
        referralCount: 0,
        referralCode: null,
      };
    }
  };
}

export default LayerEdgeConnection;
