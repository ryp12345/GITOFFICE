const jwt = require('jsonwebtoken');
const {
  jwtSecret,
  jwtExpiresIn,
  jwtRefreshSecret,
  jwtRefreshExpiresIn,
  passwordResetSecret,
  passwordResetExpiresIn
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

function signPasswordResetToken(payload) {
  return jwt.sign(payload, passwordResetSecret || jwtSecret, {
    expiresIn: passwordResetExpiresIn
  });
}

function verifyPasswordResetToken(token) {
  return jwt.verify(token, passwordResetSecret || jwtSecret);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  verifyRefreshToken,
  signPasswordResetToken,
  verifyPasswordResetToken
};
