// This file is used by pm2 to start the cron job
// To start the cron job, run `pm2 start ecosystem.config.js`
import { config } from 'dotenv';
config();

export const apps = [
  {
    name: 'ledge-daily',
    script: 'src/cron.ts',
    interpreter: process.env.NPX_PATH || "npx",
    interpreter_args: 'ts-node',
    watch: false,
  },
];
