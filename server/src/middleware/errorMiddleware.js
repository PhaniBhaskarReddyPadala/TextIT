'use strict';
const { NODE_ENV } = require('../config/env');

// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  // Log the full error server-side
  if (NODE_ENV !== 'test') {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);
  }

  // Send generic message to client — never expose stack traces
  const message =
    statusCode < 500
      ? err.message
      : 'An internal server error occurred';

  res.status(statusCode).json({ success: false, message });
};

module.exports = errorMiddleware;
