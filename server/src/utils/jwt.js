'use strict';
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

const signToken = (userId) => {
  return jwt.sign({ sub: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'textflow',
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET, { issuer: 'textflow' });
};

module.exports = { signToken, verifyToken };
