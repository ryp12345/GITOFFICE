const instanceService = require('../../services/exam-section/fastrack_instance.service');

async function listInstances(req, res, next) {
  try {
    const instances = await instanceService.getInstances();
    res.json({ success: true, data: instances });
  } catch (error) {
    next(error);
  }
}

async function getInstance(req, res, next) {
  try {
    const data = await instanceService.getInstanceById(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getLookup(req, res, next) {
  try {
    const data = await instanceService.getLookupData();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function createInstance(req, res, next) {
  try {
    const instance = await instanceService.createInstance(req.body);
    res.status(201).json({ success: true, data: instance });
  } catch (error) {
    next(error);
  }
}

async function updateInstance(req, res, next) {
  try {
    const instance = await instanceService.updateInstance(req.params.id, req.body);
    res.json({ success: true, data: instance });
  } catch (error) {
    next(error);
  }
}

async function deleteInstance(req, res, next) {
  try {
    const instance = await instanceService.deleteInstance(req.params.id);
    res.json({ success: true, data: instance });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listInstances,
  getInstance,
  getLookup,
  createInstance,
  updateInstance,
  deleteInstance,
};
