import * as fs from 'fs';

import { WalletJson, log } from '.';

import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { map } from 'lodash-es';
import path from 'path';

export const delay = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms * 1000));

export const writeJsonFile = (filepath: string, data: string) => {
  const pathname = path.join(__dirname, filepath);
  try {
    fs.writeFileSync(pathname, data);
  } catch (error: any) {
    log.error(`Failed to save file: ${path}: ${error.message}`);
  }
};

export const readJsonFile = (filepath: string) => {
  const pathname = path.join(__dirname, filepath);
  try {
    if (!fs.existsSync(pathname)) {
      fs.mkdirSync(path.dirname(pathname), { recursive: true });
      fs.writeFileSync(pathname, '[]');
    }
    const data = fs.readFileSync(pathname, 'utf8');
    return map(data.split('\n'), (line) => line.trim()).filter(
      (data) => data.length > 0,
    );
  } catch (error: any) {
    log.error(`Failed to read file: ${pathname}: ${error.message}`);
    return [];
  }
};

export const renderAgent = (proxy: string | null) => {
  if (proxy) {
    if (proxy.startsWith('http://')) {
      return new HttpsProxyAgent(proxy, {
        rejectUnauthorized: false,
      });
    } else if (proxy.startsWith('socks4://') || proxy.startsWith('socks5://')) {
      return new SocksProxyAgent(proxy);
    } else {
      log.warn(`Unsupported proxy type: ${proxy}`);
      return null;
    }
  }
  return null;
};

export const readWalletJson = (filepath: string): WalletJson[] => {
  try {
    let pathname = path.join(__dirname, filepath);
    if (!fs.existsSync(pathname)) {
      fs.mkdirSync(path.dirname(pathname), { recursive: true });
      fs.writeFileSync(pathname, '[]');
    }

    const data = fs.readFileSync(pathname, 'utf8');
    return JSON.parse(data) as WalletJson[];
  } catch (error: any) {
    log.error(`Failed to read wallet: ${path}: ${error.message}`);
    return [];
  }
};

export async function startCountdown(durationInSeconds: number): Promise<void> {
  return new Promise((resolve) => {
    let remainingTime = durationInSeconds;

    const interval = setInterval(() => {
      if (remainingTime <= 0) {
        console.log("\n\r⏳ Time's up!");
        clearInterval(interval);
        resolve();
        return;
      }

      const hours = Math.floor(remainingTime / 3600);
      const minutes = Math.floor((remainingTime % 3600) / 60);
      const seconds = remainingTime % 60;

      process.stdout.write(
        `\r⏳ Waiting ${hours}h ${minutes}m ${seconds}s for next batch run ...`,
      );

      remainingTime--;
    }, 1000);
  });
}
