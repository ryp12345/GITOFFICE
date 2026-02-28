const bcrypt = require('bcryptjs');

function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

function comparePassword(plain, hashed) {
  return bcrypt.compare(plain, hashed);
}

module.exports = { hashPassword, comparePassword };
