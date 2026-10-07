import NestedMenuSidebar from './NestedMenuSidebar';

// Mirrors resources/views/layouts/components/egov_admin/sidebar.blade.php.
const LINKS = [
  { name: 'Dashboard', path: '/egov-admin', icon: '📊' },
  {
    name: 'Professional Activity',
    icon: '📚',
    submenu: [
      {
        name: 'Teaching',
        submenu: [
          { name: 'Attended', path: '/egov-admin/teaching/professional-activities/attended' },
          { name: 'Conducted', path: '/egov-admin/teaching/professional-activities/conducted' },
        ],
      },
      {
        name: 'Non-Teaching',
        submenu: [
          { name: 'Attended', path: '/egov-admin/nonteaching/professional-activities/attended' },
          { name: 'Conducted', path: '/egov-admin/nonteaching/professional-activities/conducted' },
        ],
      },
    ],
  },
  {
    name: 'Research',
    icon: '🔬',
    submenu: [
      {
        name: 'Conference',
        submenu: [
          { name: 'Attended', path: '/egov-admin/research/conference/attended' },
          { name: 'Conducted', path: '/egov-admin/research/conference/conducted' },
        ],
      },
      { name: 'Publication', path: '/egov-admin/research/publication' },
      { name: 'Funded Project', path: '/egov-admin/research/funded-project' },
      { name: 'Book Chapter', path: '/egov-admin/research/book-chapters' },
      { name: 'Consultancy', path: '/egov-admin/research/consultancy' },
      { name: 'Patents', path: '/egov-admin/research/patents' },
      { name: 'Copyrights', path: '/egov-admin/research/copyrights' },
      { name: 'Achievements', path: '/egov-admin/research/achievements' },
      { name: 'Reviewer/Editor', path: '/egov-admin/research/reviewer-editor' },
    ],
  },
  { name: 'Raise Ticket', path: '/tickets', icon: '🎫' },
];

export default function SidebarEgov() {
  return <NestedMenuSidebar links={LINKS} />;
}
