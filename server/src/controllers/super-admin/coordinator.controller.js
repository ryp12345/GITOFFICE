const coordinatorService = require('../../services/coordinator.service');

async function list(req, res, next) {
  try {
    const data = await coordinatorService.listAll();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const id = Number(req.params.id);
    const data = await coordinatorService.getById(id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const payload = req.body;
    console.log('[coordinators:create] payload:', JSON.stringify(payload));
    const data = await coordinatorService.create(payload);
    console.log('[coordinators:create] created:', data && data.id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('[coordinators:create] error:', err && err.stack ? err.stack : err);
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const payload = req.body;
    const data = await coordinatorService.update(id, payload);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    await coordinatorService.remove(id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove };
