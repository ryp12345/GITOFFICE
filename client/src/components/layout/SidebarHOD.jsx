import NestedMenuSidebar from './NestedMenuSidebar';

const FASTRACK_SUBMENU = [
  { name: 'Fastrack Courses', path: '/hod/fastrack/courses' },
  { name: 'Fastrack Insights', path: '/hod/fastrack/insights' },
];

export default function SidebarHOD() {
  const links = [
    { name: 'Dashboard', path: '/hod', icon: '📊' },
    { name: 'Department Overview', path: '/hod/department-overview', icon: '🏢' },
    { name: 'My Staff', path: '/hod/my-staff', icon: '👥' },
    {
      name: 'Leave Management',
      icon: '🌿',
      submenu: [
        { name: 'Entitlement', path: '/hod/leave-entitlement' },
        { name: 'Holiday and RH List', path: '/hod/holidays' },
        { name: 'Leave Application', path: '/hod/leave-application' }
      ]
    },
    {
      name: 'BIOMETRIC',
      icon: '🔏',
      submenu: [
        { name: 'Daily Data', path: '/biometric/daily' },
        { name: 'Monthly Data', path: '/biometric/monthly' },
        { name: 'Muster', path: '/biometric/muster' }
      ]
    },
    {
      name: 'Professional Activity',
      icon: '📚',
      submenu: [
        {
          name: 'Teaching',
          submenu: [
            { name: 'Attended', path: '/hod/teaching/professional-activities/attended' },
            { name: 'Conducted', path: '/hod/teaching/professional-activities/conducted' }
          ]
        },
        {
          name: 'Non-Teaching',
          submenu: [
            { name: 'Attended', path: '/hod/nonteaching/professional-activities/attended' },
            { name: 'Conducted', path: '/hod/nonteaching/professional-activities/conducted' }
          ]
        }
      ]
    },
    {
      name: 'Research',
      icon: '🔬',
      submenu: [
        {
          name: 'Conference',
          submenu: [
            { name: 'Attended', path: '/hod/research/conference/attended' },
            { name: 'Conducted', path: '/hod/research/conference/conducted' }
          ]
        },
        { name: 'Publication', path: '/hod/research/publication' },
        { name: 'Funded Project', path: '/hod/research/funded-project' },
        { name: 'Book Chapter', path: '/hod/research/book-chapters' },
        { name: 'Consultancy', path: '/hod/research/consultancy' },
        { name: 'Patents', path: '/hod/research/patents' },
        { name: 'Copyrights', path: '/hod/research/copyrights' },
        { name: 'Achievements', path: '/hod/research/achievements' },
        { name: 'Reviewer/Editor', path: '/hod/research/reviewer-editor' }
      ]
    },
    {
      name: 'FASTRACK',
      icon: '⚡',
      submenu: FASTRACK_SUBMENU,
    },
    { name: 'Coordinator Management', path: '/hod/coordinator-management', icon: '🗂️' },
    {
      name: 'Faculty Recruitment',
      icon: '🎓',
      submenu: [
        { name: 'Associate Professor Applications', path: '/hod/faculty-recruitment/associate-professor' },
        { name: 'Professor Applications', path: '/hod/faculty-recruitment/professor' },
      ],
    },
  ];

  return <NestedMenuSidebar links={links} />;
}
