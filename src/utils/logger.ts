import chalk from 'chalk';
import dayjs from 'dayjs';

const logger = {
  log: (
    level: 'info' | 'warn' | 'error' | 'success' | 'debug',
    message: string,
    value: string = '',
  ) => {
    const now = dayjs().format('MM-DD HH:mm');

    const colors: {
      [key in 'info' | 'warn' | 'error' | 'success' | 'debug']: chalk.Chalk;
    } = {
      info: chalk.cyanBright,
      warn: chalk.yellow,
      error: chalk.red,
      success: chalk.green,
      debug: chalk.magenta,
    };

    const color = colors[level] || chalk.white;
    // const levelTag = `${level.toUpperCase().padEnd(7, ' ')}`;
    const timestamp = `${now}`;

    // const formattedMessage = `${chalk.gray(timestamp)} ${color(levelTag)} ${colors[level](message)}`;
    const formattedMessage = `${chalk.gray(timestamp)} ${colors[level](message)}`;
    let formatValue = ` ${chalk.green(value)}`;
    if (level === 'error') {
      formatValue = ` ${chalk.red(value)}`;
    } else if (level === 'warn') {
      formatValue = ` ${chalk.yellow(value)}`;
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
