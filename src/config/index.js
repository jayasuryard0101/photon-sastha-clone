const dotenv = require('dotenv');

dotenv.config();

const config = {
  port: Number(process.env.PORT) || 3000,
  dbConnectionString: process.env.DB_CONNECTION_STRING || 'mongodb://localhost:27017/multiplayer-game',
  corsOrigin: process.env.CORS_ORIGIN || '*',
};

module.exports = { config };
