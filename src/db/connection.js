const mongoose = require('mongoose');
const { config } = require('../config');

const connectDb = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  await mongoose.connect(config.dbConnectionString, {
    serverSelectionTimeoutMS: 5000,
    autoIndex: true,
  });

  return mongoose.connection;
};

module.exports = { connectDb };
