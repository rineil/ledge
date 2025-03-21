import { filter, map, chunk as chunk_lodash } from 'lodash-es';
import { CHUNK_SIZE, LOGS_FOLDER, delay, LayerEdge, log } from './utils';
import { ethers } from 'ethers';
import * as fs from 'fs';
import path from 'path';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { setTimeout } from 'timers/promises';
dayjs.extend(utc);

let prefixFileNameLog: any = undefined;
let recipe: JSON = {} as JSON;
let chunk = CHUNK_SIZE;
const refCode = 'KEyq2IvP';

const writeQueue: { addr: string; key: string }[] = [];
const proxies: { account: string; proxy?: string }[] = [];

let isWriting = false;
let cacheData: Record<string, any> = {};

export async function init() {
  if (!fs.existsSync(LOGS_FOLDER)) {
    fs.mkdirSync(LOGS_FOLDER);
    log.info('Logs Folder created:', LOGS_FOLDER);
  }
}

function getFilePathLogKey(): fs.PathLike {
  if (prefixFileNameLog == undefined) {
    return path.join(
      LOGS_FOLDER,
      `${dayjs().utc().format('ddd_DD_MM')}_result.json`,
    );
  } else {
    return path.join(
      LOGS_FOLDER,
      `${dayjs().utc().format('ddd_DD_MM')}_${prefixFileNameLog}_result.json`,
    );
  }
}

function loadCache() {
  const filePath = getFilePathLogKey();
  if (fs.existsSync(filePath)) {
    cacheData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } else {
    cacheData = {};
  }
}

async function processQueue() {
  if (isWriting) return;
  isWriting = true;

  while (writeQueue.length > 0) {
    const { addr, key } = writeQueue.shift()!;

    if (!cacheData[addr]) cacheData[addr] = {};
    cacheData[addr][key] = (cacheData[addr][key] || 0) + 1;

    try {
      fs.writeFileSync(getFilePathLogKey(), JSON.stringify(cacheData, null, 2));
    } catch (error: any) {
      log.error('Failed to write log:', error.message);
    }

    await setTimeout(10);
  }

  isWriting = false;

  if (writeQueue.length > 0) {
    processQueue();
  }
}

function writeFileResult(addr: string, key: string) {
  writeQueue.push({ addr, key });
  if (!isWriting) {
    processQueue();
  }
}

// function writeFileResult(addr: string, key: string) {
//   if (!fs.existsSync(getFilePathLogKey())) {
//     fs.writeFileSync(getFilePathLogKey(), '{}');
//   }
//   const todayResult = JSON.parse(fs.readFileSync(getFilePathLogKey(), 'utf8'));
//   if (!todayResult[addr]) todayResult[addr] = {};
//   if (!todayResult[addr][key]) todayResult[addr][key] = 0;
//   todayResult[addr][key] = todayResult[addr][key] + 1;
//   fs.writeFileSync(getFilePathLogKey(), JSON.stringify(todayResult, null, 2));
// }

async function checkDoneAllAccounts(
  addressList: string[],
  taskKeys: string[],
): Promise<boolean> {
  for (const key of taskKeys) {
    if (!fs.existsSync(getFilePathLogKey())) {
      fs.writeFileSync(getFilePathLogKey(), '{}');
    }
    const todayResult = JSON.parse(
      fs.readFileSync(getFilePathLogKey(), 'utf8'),
    );
    for (const wallet of addressList) {
      const finishedTasks = todayResult[wallet];
      if (!finishedTasks) return false;
      const _recipeJSON: any = recipe;
      for (const key of Object.keys(_recipeJSON)) {
        const tempTaskCount = _recipeJSON[key];
        const userTaskCount = finishedTasks[key] || 0;
        if (userTaskCount < tempTaskCount) return false;
      }
    }
  }

  return true;
}

function getUnProcessAccounts(
  accounts: ethers.Wallet[],
  taskKey: string,
): ethers.Wallet[] {
  const filePath = getFilePathLogKey();
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '{}');
  }
  const todayResult = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const unProcessAccounts = filter(accounts, (account) => {
    const address = account.address;
    if (!todayResult[address]) todayResult[address] = {};
    const finishedTasks = todayResult[address];
    const _recipeJSON: any = recipe;
    const tempTaskCount = _recipeJSON[taskKey];
    const userTaskCount = finishedTasks[taskKey] || 0;
    return userTaskCount < tempTaskCount;
  });
  return unProcessAccounts;
}

export async function runRecipe(
  // accounts: ethers.Wallet[],
  accountObj: Record<string, object>,
  recipeTasks: JSON,
  prefixNameResult?: string,
) {
  await init();
  prefixFileNameLog = prefixNameResult;

  let accounts: ethers.Wallet[] = [];

  recipe = recipeTasks;
  const taskKeys = Object.keys(recipe);
  let batch = 0;

  const BATCH_LIMIT = (process.env.BATCH_LIMIT as unknown as number) || 10;

  map(accountObj, (account: { wallet: ethers.Wallet; ip?: string }) => {
    accounts.push(account.wallet as ethers.Wallet);
    proxies.push({
      account: account.wallet.address,
      proxy: account.ip,
    });
  });

  console.log(`
    ██████╗ ███████╗ ██████╗██╗██████╗ ███████╗
    ██╔══██╗██╔════╝██╔════╝██║██╔══██╗██╔════╝
    ██████╔╝█████╗  ██║     ██║██████╔╝█████╗  
    ██╔══██╗██╔══╝  ██║     ██║██╔═══╝ ██╔══╝  
    ██║  ██║███████╗╚██████╗██║██║     ███████╗
    ╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝╚═╝     ╚══════╝
    
    `);
  log.info(`Total accounts: ${accounts.length}`);
  loadCache();
  while (++batch) {
    log.info(`Run recipe at ${batch} times`);
    if (
      await checkDoneAllAccounts(
        accounts.map((it) => it.address),
        taskKeys,
      )
    ) {
      log.info('All accounts have done all tasks');
      process.exit(0);
    } else {
      for (const key of taskKeys) {
        const unProcessAccounts = getUnProcessAccounts(accounts, key);
        if (unProcessAccounts.length > 0) {
          await runTasksByRecipe(unProcessAccounts, key, batch, proxies);
        } else {
          log.info('All accounts have done', key);
        }
      }
    }
    if (batch >= BATCH_LIMIT) {
      log.info(`Batch limit reached ${BATCH_LIMIT}`);
      process.exit(1);
    }

    if (
      await checkDoneAllAccounts(
        accounts.map((it) => it.address),
        taskKeys,
      )
    ) {
      log.info('All accounts have done all tasks');
      process.exit(0);
    } else {
      log.info('Waiting 60s for next batch run ...');
      await delay(60);
    }
  }
}

async function runTasksByRecipe(
  accounts: ethers.Wallet[],
  taskKey: string,
  batch: number,
  proxies: { account: string; proxy?: string }[],
): Promise<void> {
  const chunkAccounts = chunk_lodash(accounts, chunk);

  for (let chunkIndex = 0; chunkIndex < chunkAccounts.length; chunkIndex++) {
    const elements = chunkAccounts[chunkIndex];

    await Promise.all(
      map(elements, async (account, index) => {
        const prefixMessageLog = `Batch ${batch} - ${index + 1 + chunkIndex * chunk}/${accounts.length} - ${taskKey}:`;

        const proxy = proxies.find(
          (it) => it.account === account.address,
        )?.proxy;
        const socket = new LayerEdge(refCode, proxy);
        const response = await socket.request(
          'https://api.ipify.org?format=json',
          'GET',
        );

        if (response?.data?.ip) {
          log.info(
            prefixMessageLog,
            `${account.address} Running with IP: ${response.data.ip}`,
          );
        }

        try {
          let result = undefined;
          switch (taskKey) {
            case 'check_in':
              result = await socket.checkIN(account);
              break;
            case 'claim_point':
              if (await socket.checkNodeStatus(account)) {
                log.info(
                  `${account.address} is running, trying stop node to claim node points.`,
                );
                await socket.stopNode(account);
              }
              await delay(5);
              result = await socket.connectNode(account);
              break;
            default:
              log.warn(prefixMessageLog, `${account.address} Task not found`);
              break;
          }
          if (result) {
            log.info(prefixMessageLog, `${account.address} Done`);
            writeFileResult(account.address, taskKey);
          }
        } catch (error: any) {
          console.error(
            prefixMessageLog,
            account.address,
            (error as any).message,
          );
        }
      }),
    );
  }
}
