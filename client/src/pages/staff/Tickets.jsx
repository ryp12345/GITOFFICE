import TicketDashboard from '../tickets/TicketsDashboard';

export default function StaffTicketsPage({ detailBasePath }) {
  return <TicketDashboard detailBasePath={detailBasePath} canManageTickets />;
}
