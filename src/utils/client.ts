import * as dotenv from 'dotenv';

import axios, { AxiosRequestConfig } from 'axios';
import { delay, log, renderAgent } from '.';

import chalk from 'chalk';
import ethers from 'ethers';
import { map } from 'lodash-es';

dotenv.config();

class LayerEdge {
  proxy?: string;
  refCode?: string;

  constructor(refCode?: string, proxy?: string) {
    this.proxy = proxy;
    this.refCode = refCode;
  }

  getHeader = (): {
    [key: string]: string;
  } => {
    return {
      Accept: 'application/json, text/plain, */*',
      Origin: 'https://dashboard.layeredge.io',
      Referer: 'https://dashboard.layeredge.io/',
      'Content-Type': 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      'accept-language': 'en-US,en;q=0.9',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': 'macOS',
      'sec-fetch-site': 'same-site',
      'sec-fetch-mode': 'cors',
      'sec-fetch-dest': 'empty',
      'sec-ch-ua':
        '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
    };
  };

  getProxy = (): string | undefined => {
    return this.proxy;
  };

  getAxiosConfig = (): AxiosRequestConfig => {
    return {
      baseURL:
        process.env.BASE_API_URL || 'https://referralapi.layeredge.io/api',
      timeout: 120000,
      httpAgent: renderAgent(this.getProxy()),
      httpsAgent: renderAgent(this.getProxy()),
      headers: this.getHeader(),
    };
  };

  request = async (
    url: string,
    method: string,
    config: {} = {},
    retries: number = 30,
  ): Promise<any> => {
    for (let i = 0; i < retries; i++) {
      try {
        return await axios.request({
          url,
          method,
          ...config,
          ...this.getAxiosConfig(),
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
        } else if (error?.response?.status === 429) {
          return { data: 'Proof already submitted' };
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
      return true;
    } else {
      log.error('Failed to check invite');
      return false;
    }
  };

  registerWallet = async (wallet: ethers.Wallet, invite_code?: string) => {
    if (invite_code === undefined) {
      log.error('Referral code not provided');
      return false;
    }
    const payload = {
      walletAddress: wallet.address,
    };

    const response = await this.request(
      `/referral/register-wallet/${invite_code}`,
      'post',
      { data: payload },
    );

    if (response && response.data) {
      log.success(
        `${wallet.address} successfully registered with ${chalk.redBright.bold(invite_code)}`,
      );
      return true;
    } else {
      log.error('Failed To Register wallets');
      return false;
    }
  };

  checkIN = async (wallet: ethers.Wallet): Promise<boolean> => {
    const timestamp = Date.now();
    const message = `I am claiming my daily node point for ${wallet.address} at ${timestamp}`;

    const signature = await wallet.signMessage(message);
    const payload = {
      sign: signature,
      timestamp,
      walletAddress: wallet.address,
    };

    const response = await this.request(
      '/light-node/claim-node-points',
      'POST',
      {
        data: payload,
      },
    );

    if (
      response &&
      response.data &&
      response.data.message === 'node points claimed successfully'
    ) {
      log.success(`${wallet.address} check-in successful`);
      return true;
    } else if (response.data === 405) {
      log.warn(
        `${wallet.address} can not claim node points twice in 24 hours, come back after 24 hours!`,
      );
      return true;
    } else {
      log.error(`${wallet.address} checkin failed`);
      return false;
    }
  };

  checkNodeStatus = async (wallet: ethers.Wallet): Promise<boolean> => {
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
      return true;
    } else {
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
      var {
        referralCode,
        nodePoints,
        boostNodePoints,
        confirmedReferralPoints,
        id,
      } = response.data.data;
      const referralCount = map(
        response.data.data.referrals,
        (referral) => referral.type == 'referral',
      ).filter((data) => data).length;
      nodePoints += boostNodePoints;

      return {
        nodePoints,
        referralCount,
        referralCode,
        referralPoints: confirmedReferralPoints,
        id,
      };
    } else {
      log.error('Failed to check Total Points..');
      return {
        nodePoints: 0,
        referralCount: 0,
        referralCode: null,
        referralPoints: 0,
        id: 'null',
      };
    }
  };

  submitProof = async (wallet: ethers.Wallet): Promise<void> => {
    const timestamp = Date.now();
    const message = `I am submitting a proof for LayerEdge at ${timestamp}`;
    const signature = await wallet.signMessage(message);
    const proof =
      "I'm a human, not a robot. I'm submitting this proof to LayerEdge.";

    const payload = {
      proof,
      walletAddress: wallet.address,
      signature,
      message,
    };

    await this.request(`/card/submit-proof`, 'POST', {
      data: payload,
    }).then((response) => {
      if (response && response.data) {
        log.success(`${wallet.address} Proof submitted successfully`);
      } else {
        log.error(`${wallet.address} Proof submission failed`);
      }
    });
  };

  epochStats = async (id: string): Promise<any> => {
    return await this.request(`/epoch/epoch-stats/${id}`, 'GET').then(
      (response) => {
        if (response && response.data && response.data.data) {
          return response.data.data;
        }
      },
    );
  };

  isEligible = async (id: string): Promise<any> => {
    return await this.request(`/poh/completed/poh/${id}`, 'GET').then(
      (response) => {
        if (response && response.data && response.data.data) {
          return response.data.data.length > 0;
        }
      },
    );
  };
}

export default LayerEdge;
