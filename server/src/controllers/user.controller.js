const userService = require('../services/user.service');

async function getMe(req, res, next) {
  try {
    const user = await userService.getById(req.user.id);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

module.exports = { getMe };
