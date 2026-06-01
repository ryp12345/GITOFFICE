const ticketService = require('../../services/ticket.service');

async function dashboard(req, res, next) {
  try {
    const data = await ticketService.getDashboard(req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const data = await ticketService.createTicket(req.user, req.body, req.files || []);
    res.status(201).json({
      success: true,
      data,
      message: 'Ticket added successfully.',
    });
  } catch (error) {
    next(error);
  }
}

async function getOne(req, res, next) {
  try {
    const data = await ticketService.getTicketById(req.user, req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const data = await ticketService.updateTicket(req.user, req.params.id, req.body, req.files || []);
    res.json({
      success: true,
      data,
      message: 'Ticket updated successfully.',
    });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    await ticketService.deleteTicket(req.user, req.params.id);
    res.json({ success: true, message: 'Ticket deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

async function addReply(req, res, next) {
  try {
    const data = await ticketService.addReply(req.user, req.params.id, req.body, req.files || []);
    res.status(201).json({ success: true, data, message: 'Reply added successfully.' });
  } catch (error) {
    next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const data = await ticketService.updateStatus(req.user, req.params.id, req.body?.status);
    res.json({ success: true, data, message: 'Ticket status updated successfully.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  dashboard,
  create,
  getOne,
  update,
  remove,
  addReply,
  updateStatus,
};
