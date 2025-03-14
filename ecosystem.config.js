const { env } = require("process");

require("dotenv").config(); 
module.exports = {
  apps: [
    {
      name: "ledge-daily",
      script: "src/cron.ts",
      interpreter: process.env.NPX_PATH || "npx",
      interpreter_args: "ts-node",
      watch: true,
      ignore_watch: ["node_modules", "logs"],
    },
  ],
};