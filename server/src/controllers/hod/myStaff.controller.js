const hodMyStaffService = require('../../services/hodMyStaff.service');

async function getMyStaff(req, res, next) {
  try {
    const data = await hodMyStaffService.getMyStaffForHod(req.user.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMyStaff
};
