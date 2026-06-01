import TicketDetails from '../tickets/TicketDetails';

export default function StaffTicketDetailsPage({ listPath }) {
  return <TicketDetails listPath={listPath} canUpdateStatus={false} />;
}
