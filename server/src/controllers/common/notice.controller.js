const noticeService = require('../../services/notice.service');

async function getMeta(req, res, next) {
  try {
    const data = await noticeService.getMeta(req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    const data = await noticeService.listNotices(req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function feed(req, res, next) {
  try {
    const data = await noticeService.getFeed(req.user, req.query || {});
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getOne(req, res, next) {
  try {
    const data = await noticeService.getNotice(req.user, req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const data = await noticeService.createNotice(req.user, req.body);
    res.status(201).json({ success: true, message: 'Notice raised successfully', data });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const data = await noticeService.updateNotice(req.user, req.params.id, req.body);
    res.json({ success: true, message: 'Notice updated successfully', data });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const data = await noticeService.deleteNotice(req.user, req.params.id);
    res.json({ success: true, message: 'Notice deleted successfully', data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMeta,
  list,
  feed,
  getOne,
  create,
  update,
  remove,
};
