module.exports = {
  apps: [
    {
      name: 'llm-backend',
      cwd: './server',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      log_file: 'logs/backend.log',
      out_file: 'logs/backend-out.log',
      error_file: 'logs/backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'llm-frontend',
      cwd: './client',
      script: 'npx',
      args: 'serve -s dist -l 5173 --cors',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      log_file: 'logs/frontend.log',
      out_file: 'logs/frontend-out.log',
      error_file: 'logs/frontend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
