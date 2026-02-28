const associationService = require('../services/association.service');

async function list(req, res, next) {
  try {
    const data = await associationService.listAll();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const id = Number(req.params.id);
    const data = await associationService.getById(id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const payload = req.body;
    console.log('[associations:create] payload:', JSON.stringify(payload));
    const data = await associationService.create(payload);
    console.log('[associations:create] created:', data && data.id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('[associations:create] error:', err && err.stack ? err.stack : err);
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const payload = req.body;
    const data = await associationService.update(id, payload);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    await associationService.remove(id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove };
