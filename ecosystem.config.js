// This file is used by pm2 to manage the app
// To start the app, run `pm2 start ecosystem.config.js`
// To stop the app, run `pm2 stop ledge-daily`
// To restart the app, run `pm2 restart ledge-daily`
// To view logs, run `pm2 logs ledge-daily`
module.exports = {
  apps: [
    {
      name: "ledge-daily",
      script: "src/cron.ts",
      interpreter: process.env.NPX_PATH || "npx",
      interpreter_args: "ts-node",
      watch: true,
      ignore_watch: ["node_modules", "logs"],
      autorestart: true,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};