// PM2 process config for the self-hosted VPS.
//   pm2 start ecosystem.config.cjs   (first time)
//   pm2 startOrReload ecosystem.config.cjs --update-env   (deploy)
// Secrets are read by Next from `.env.local` (auto-loaded), not from here.
module.exports = {
  apps: [
    {
      name: "captainx",
      script: "npm",
      args: "start",
      cwd: __dirname,
      env: { NODE_ENV: "production", PORT: "3000" },
      max_memory_restart: "600M",
      instances: 1,
      autorestart: true,
      time: true,
    },
  ],
};
