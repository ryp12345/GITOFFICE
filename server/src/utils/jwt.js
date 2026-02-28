const jwt = require('jsonwebtoken');
const {
  jwtSecret,
  jwtExpiresIn,
  jwtRefreshSecret,
  jwtRefreshExpiresIn
} = require('../config');

function signAccessToken(payload) {
  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, jwtRefreshSecret || jwtSecret, {
    expiresIn: jwtRefreshExpiresIn
  });
}

function verifyToken(token) {
  return jwt.verify(token, jwtSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, jwtRefreshSecret || jwtSecret);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  verifyRefreshToken
};
