const superAdminModel = require('../models/superAdminDashboard.model');
const ticketModel = require('../models/ticket.model');
const establishmentDashboardService = require('./establishmentDashboard.service');

const TICKET_LIMIT = 5;

async function getTicketSummary() {
  const { tickets, counts } = await ticketModel.listForDashboard({ userId: null, isAdmin: true });
  return {
    new_count: Number(counts?.new_count) || 0,
    pending_count: Number(counts?.pending_count) || 0,
    resolved_count: Number(counts?.resolved_count) || 0,
    latest: (tickets || []).slice(0, TICKET_LIMIT).map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      staff_name: t.staff_name,
      email: t.email,
      created_at: t.created_at,
    })),
  };
}

// Super Admin sees the institute-wide Establishment summary plus accounts, tickets and
// this year's leave entitlement coverage.
async function getDashboard() {
  const year = new Date().getFullYear();
  const [base, accounts, tickets, entitlements] = await Promise.all([
    establishmentDashboardService.getDashboard(),
    superAdminModel.getAccountSummary(),
    getTicketSummary().catch(() => null),
    superAdminModel.getEntitlementCoverage(year),
  ]);

  return { ...base, accounts, tickets, entitlements };
}

module.exports = {
  getDashboard,
};
