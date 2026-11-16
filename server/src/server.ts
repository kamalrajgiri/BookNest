import './models/index.js';

import app from './app.js';
import { config } from './config/env.js';
import { sequelize } from './config/database.js';

const PORT = config.port;

async function startServer(){
  try {
    await sequelize.authenticate();
    console.log('[database]: MySQL connection has been established successfully.');

    app.listen(PORT, () => {
      console.log(`[server]: Server is running in ${config.nodeEnv} mode at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[server]: Unable to connect to the database:', error);
    process.exit(1); 
  }
}

startServer();
