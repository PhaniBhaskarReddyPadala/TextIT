'use strict';
require('dotenv').config();

const required = ['MONGO_URI', 'JWT_SECRET', 'ENCRYPTION_KEY'];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

if (process.env.ENCRYPTION_KEY.length < 64) {
  console.error('FATAL: ENCRYPTION_KEY must be at least 32 bytes (64 hex chars)');
  process.exit(1);
}

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
};
