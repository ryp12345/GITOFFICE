const LeaveEntitlement = require('../../models/leave_entitlement.model');

// GET /api/staff/:id/leaves[?year=YYYY] — staff view "Leaves" tab. Entitlement edits go through the
// existing PATCH /api/leave-entitlements (Establishment only), as on the Leave Entitlement page.
async function getStaffLeaves(req, res) {
  try {
    const staffId = parseInt(req.params.id, 10);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });
    const data = await LeaveEntitlement.getStaffLeaveData({ staffId, year: req.query.year });
    return res.json({ success: true, data });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message || 'Failed to load staff leaves' });
  }
}

module.exports = { getStaffLeaves };
