import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);
dayjs.extend(relativeTime);

/**
 * Get current time
 *
 * @param tz `UTC` by default
 * @param format `YYYY-MM-DD HH:mm:ss` by default
 * @returns
 * @example
 * ```
 * getCurrentTime('UTC', 'YYYY-MM-DD HH:mm:ss'); // 2021-09-01 00:00:00
 * ```
 * @example
 * ```
 * getCurrentTime('Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH:mm:ss'); // 2021-09-01 07:00:00
 * ```
 */
export const getCurrentTime = (
  tz: string = 'UTC',
  format: string = 'YYYY-MM-DD HH:mm:ss',
) => {
  return dayjs().tz(tz).format(format);
};

/**
 * Get current time in milliseconds
 *
 * @param date
 * @param fromTz
 * @param toTz
 * @returns
 * @example
 * ```
 * convertTimeZone('2021-09-01 00:00:00', 'UTC', 'Asia/Ho_Chi_Minh');
 * ```
 * @example
 * ```
 * convertTimeZone('2021-09-01 00:00:00', 'Asia/Ho_Chi_Minh', 'UTC');
 * ```
 */
export const convertTimeZone = (date: string, fromTz: string, toTz: string) => {
  return dayjs.tz(date, fromTz).tz(toTz).format('YYYY-MM-DD HH:mm:ss');
};

/**
 * Get time ago
 *
 * @param date
 * @returns
 *
 * @example
 * ```
 * timeAgo('2021-09-01 00:00:00');
 * ```
 */
export const timeAgo = (date: string) => {
  return dayjs(date).fromNow();
};

/**
 * Get time from now
 *
 * @param date1
 * @param date2
 * @param unit
 * @returns
 *
 * @example
 * ```
 * diffBetweenDates('2021-09-01 00:00:00', '2021-09-02 00:00:00', 'days');
 * ```
 */
export const diffBetweenDates = (
  date1: string,
  date2: string,
  unit: dayjs.ManipulateType = 'days',
) => {
  return dayjs(date1).diff(dayjs(date2), unit);
};

/**
 * Add time
 *
 * @param date
 * @param value
 * @param unit
 * @returns
 *
 * @example
 * ```
 * addTime('2021-09-01 00:00:00', 1, 'days');
 * ```
 * @example
 * ```
 * addTime('2021-09-01 00:00:00', -5, 'hours');
 * ```
 */
export const addTime = (
  date: string,
  value: number,
  unit: dayjs.ManipulateType,
) => {
  return dayjs(date).add(value, unit).format('YYYY-MM-DD HH:mm:ss');
};

/**
 * Check if the date is valid
 * @param date
 * @returns
 *
 * @example
 * ```
 * isValidDate('2021-09-01 00:00:00'); // true
 * ```
 * @example
 * ```
 * isValidDate('invalid-date'); // false
 * ```
 */
export const isValidDate = (date: string) => {
  return dayjs(date).isValid();
};

/**
 * Format date
 *
 * @param date
 * @param format `YYYY-MM-DD HH:mm:ss` by default
 * @returns
 *
 * @example
 * ```
 * formatDate('2021-09-01 00:00:00', 'YYYY-MM-DD'); // 2021-09-01
 * ```
 * @example
 * ```
 * formatDate('2021-09-01 00:00:00', 'YYYY-MM-DD HH:mm:ss'); // 2021-09-01 00:00:00
 * ```
 */
export const formatDate = (
  date: string,
  format: string = 'YYYY-MM-DD HH:mm:ss',
) => {
  return dayjs(date).format(format);
};
