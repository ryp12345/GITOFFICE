const schemeService = require('../../services/exam-section/scheme.service');

async function listSchemes(req, res, next) {
  try {
    const schemes = await schemeService.getSchemes();
    res.json({ success: true, data: schemes });
  } catch (error) {
    next(error);
  }
}

async function getScheme(req, res, next) {
  try {
    const scheme = await schemeService.getSchemeById(req.params.id);
    if (!scheme) {
      const err = new Error('Scheme not found');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ success: true, data: scheme });
  } catch (error) {
    next(error);
  }
}

async function createScheme(req, res, next) {
  try {
    const scheme = await schemeService.createScheme(req.body);
    res.status(201).json({ success: true, data: scheme });
  } catch (error) {
    next(error);
  }
}

async function updateScheme(req, res, next) {
  try {
    const scheme = await schemeService.updateScheme(req.params.id, req.body);
    if (!scheme) {
      const err = new Error('Scheme not found');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ success: true, data: scheme });
  } catch (error) {
    next(error);
  }
}

async function deleteScheme(req, res, next) {
  try {
    const scheme = await schemeService.deleteScheme(req.params.id);
    if (!scheme) {
      const err = new Error('Scheme not found');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ success: true, data: scheme });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listSchemes,
  getScheme,
  createScheme,
  updateScheme,
  deleteScheme,
};
