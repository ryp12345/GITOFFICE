const userModel = require('../models/user.model');

async function getById(id) {
  const user = await userModel.findById(id);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return user;
}

async function listAll() {
  return userModel.findAll();
}

module.exports = { getById, listAll };
