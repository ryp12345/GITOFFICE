import TicketsDashboard from '../tickets/TicketsDashboard';

export default function SuperAdminTicketsPage() {
  return <TicketsDashboard detailBasePath="/super-admin/tickets" canManageTickets={false} />;
}
