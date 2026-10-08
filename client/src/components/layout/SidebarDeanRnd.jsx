import NestedMenuSidebar from './NestedMenuSidebar';

// Mirrors resources/views/layouts/components/Deanrnd/sidebar.blade.php.
const LINKS = [
  { name: 'Dashboard', path: '/dean-rnd', icon: '📊' },
  { name: 'Staff', path: '/dean-rnd/staff', icon: '👥' },
  {
    name: 'Professional Activity',
    icon: '📚',
    submenu: [
      {
        name: 'Teaching',
        submenu: [
          { name: 'Attended', path: '/dean-rnd/teaching/professional-activities/attended' },
          { name: 'Conducted', path: '/dean-rnd/teaching/professional-activities/conducted' },
        ],
      },
      {
        name: 'Non-Teaching',
        submenu: [
          { name: 'Attended', path: '/dean-rnd/nonteaching/professional-activities/attended' },
          { name: 'Conducted', path: '/dean-rnd/nonteaching/professional-activities/conducted' },
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
          { name: 'Attended', path: '/dean-rnd/research/conference/attended' },
          { name: 'Conducted', path: '/dean-rnd/research/conference/conducted' },
        ],
      },
      { name: 'Publication', path: '/dean-rnd/research/publication' },
      { name: 'Funded Project', path: '/dean-rnd/research/funded-project' },
      { name: 'Consultancy', path: '/dean-rnd/research/consultancy' },
      { name: 'Books Chapter', path: '/dean-rnd/research/book-chapters' },
      { name: 'Patents', path: '/dean-rnd/research/patents' },
      { name: 'Copyrights', path: '/dean-rnd/research/copyrights' },
      { name: 'Achievements', path: '/dean-rnd/research/achievements' },
      { name: 'Reviewer/Editor', path: '/dean-rnd/research/reviewer-editor' },
    ],
  },
  { name: 'Raise Ticket', path: '/tickets', icon: '🎫' },
];

export default function SidebarDeanRnd() {
  return <NestedMenuSidebar links={LINKS} />;
}
