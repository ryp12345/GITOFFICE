const payrollService = require('../../services/staffPayroll.service');

function parseIds(req, res, childParam) {
  const staffId = parseInt(req.params.id, 10);
  const childId = childParam ? parseInt(req.params[childParam], 10) : null;
  if (!staffId || (childParam && !childId)) {
    res.status(400).json({ success: false, message: 'Invalid id' });
    return null;
  }
  return { staffId, childId };
}

function sendFailure(res, err, fallback) {
  const status = err.statusCode || 500;
  return res.status(status).json({ success: false, message: err.message || fallback });
}

// ── Festival Advance ─────────────────────────────────────────────────────────

async function listFestivalAdvances(req, res, next) {
  try {
    const ids = parseIds(req, res);
    if (!ids) return undefined;
    const data = await payrollService.listFestivalAdvances(ids.staffId);
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function createFestivalAdvance(req, res) {
  try {
    const ids = parseIds(req, res);
    if (!ids) return undefined;
    const data = await payrollService.createFestivalAdvance(ids.staffId, req.body || {});
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return sendFailure(res, err, 'Failed to create festival advance');
  }
}

async function updateFestivalAdvance(req, res) {
  try {
    const ids = parseIds(req, res, 'advanceId');
    if (!ids) return undefined;
    const data = await payrollService.updateFestivalAdvance(ids.staffId, ids.childId, req.body || {});
    return res.json({ success: true, data });
  } catch (err) {
    return sendFailure(res, err, 'Failed to update festival advance');
  }
}

async function deleteFestivalAdvance(req, res, next) {
  try {
    const ids = parseIds(req, res, 'advanceId');
    if (!ids) return undefined;
    const deleted = await payrollService.deleteFestivalAdvance(ids.staffId, ids.childId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Festival advance not found' });
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

// ── Remuneration ─────────────────────────────────────────────────────────────

async function listRemunerations(req, res, next) {
  try {
    const ids = parseIds(req, res);
    if (!ids) return undefined;
    const [data, heads] = await Promise.all([
      payrollService.listRemunerations(ids.staffId),
      payrollService.listRemunerationHeads(),
    ]);
    return res.json({ success: true, data, heads });
  } catch (err) {
    return next(err);
  }
}

async function createRemunerations(req, res) {
  try {
    const ids = parseIds(req, res);
    if (!ids) return undefined;
    const data = await payrollService.createRemunerations(ids.staffId, req.body || {});
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return sendFailure(res, err, 'Failed to add remuneration');
  }
}

async function updateRemuneration(req, res) {
  try {
    const ids = parseIds(req, res, 'remunerationId');
    if (!ids) return undefined;
    const data = await payrollService.updateRemuneration(ids.staffId, ids.childId, req.body || {});
    return res.json({ success: true, data });
  } catch (err) {
    return sendFailure(res, err, 'Failed to update remuneration');
  }
}

async function deleteRemuneration(req, res, next) {
  try {
    const ids = parseIds(req, res, 'remunerationId');
    if (!ids) return undefined;
    const deleted = await payrollService.deleteRemuneration(ids.staffId, ids.childId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Remuneration not found' });
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

// ── Salary / TDS ─────────────────────────────────────────────────────────────

async function listSalaries(req, res) {
  try {
    const ids = parseIds(req, res);
    if (!ids) return undefined;
    const data = await payrollService.listSalaries(ids.staffId, req.query || {});
    return res.json({ success: true, data });
  } catch (err) {
    return sendFailure(res, err, 'Failed to load salaries');
  }
}

async function getTds(req, res) {
  try {
    const ids = parseIds(req, res);
    if (!ids) return undefined;
    const data = await payrollService.getTds(ids.staffId, req.query || {});
    return res.json({ success: true, data });
  } catch (err) {
    return sendFailure(res, err, 'Failed to load TDS');
  }
}

async function exportTds(req, res) {
  try {
    const ids = parseIds(req, res);
    if (!ids) return undefined;
    const buffer = await payrollService.buildTdsWorkbook(ids.staffId, req.query || {});
    const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="TDS_Report_${stamp}.xlsx"`);
    return res.send(Buffer.from(buffer));
  } catch (err) {
    return sendFailure(res, err, 'Failed to export TDS');
  }
}

module.exports = {
  listFestivalAdvances,
  createFestivalAdvance,
  updateFestivalAdvance,
  deleteFestivalAdvance,
  listRemunerations,
  createRemunerations,
  updateRemuneration,
  deleteRemuneration,
  listSalaries,
  getTds,
  exportTds,
};
