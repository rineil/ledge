import chalk from 'chalk';
import dayjs from 'dayjs';
import { getCurrentTime } from '.';

const logger = {
  log: (
    level: 'info' | 'warn' | 'error' | 'success' | 'debug',
    message: string,
    value: string = '',
  ) => {
    const nowUTC = getCurrentTime('UTC', 'DD/MM HH:mm');
    const isDark = dayjs().hour() > 18;

    const colors: {
      [key in 'info' | 'warn' | 'error' | 'success' | 'debug']: chalk.Chalk;
    } = {
      info: isDark ? chalk.blue : chalk.blueBright,
      warn: isDark ? chalk.yellow : chalk.yellowBright,
      error: isDark ? chalk.red : chalk.redBright,
      success: isDark ? chalk.green : chalk.greenBright,
      debug: isDark ? chalk.magenta : chalk.magentaBright,
    };

    const color = colors[level] || chalk.white;
    // const levelTag = `${level.toUpperCase().padEnd(7, ' ')}`;
    const timestamp = `${nowUTC}`;

    // const formattedMessage = `${chalk.gray(timestamp)} ${color(levelTag)} ${colors[level](message)}`;
    const formattedMessage = `${chalk.gray(timestamp)} ${colors[level](message)}`;
    let formatValue = ` ${chalk.green(value)}`;

    if (level === 'info') {
      formatValue = ` ${chalk.blue(value)}`;
    } else if (level === 'error') {
      formatValue = ` ${chalk.red(value)}`;
    } else if (level === 'warn') {
      formatValue = ` ${chalk.yellow(value)}`;
    } else if (level === 'debug') {
      formatValue = ` ${chalk.magenta(value)}`;
    }

    if (typeof value === 'object') {
      const valueColor = level === 'error' ? chalk.red : chalk.green;
      formatValue = ` ${valueColor(JSON.stringify(value))}`;
    }

    console.log(`${formattedMessage} ${formatValue}`);
  },

  info: (message: string, value = '') => logger.log('info', message, value),
  warn: (message: string, value = '') => logger.log('warn', message, value),
  error: (message: string, value = '') => logger.log('error', message, value),
  success: (message: string, value = '') =>
    logger.log('success', message, value),
  debug: (message: string, value = '') => logger.log('debug', message, value),
};

export default logger;
