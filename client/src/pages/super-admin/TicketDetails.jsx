import TicketDetails from '../tickets/TicketDetails';

export default function SuperAdminTicketDetailsPage() {
  return <TicketDetails listPath="/super-admin/tickets" canUpdateStatus />;
}
