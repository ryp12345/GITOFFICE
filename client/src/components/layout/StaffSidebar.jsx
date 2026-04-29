import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLE_TEACHING, ROLE_NON_TEACHING, isRoleMatch } from '../../utils/role';

const COMMON_LINKS = [
  { name: 'My Dashboard', teachingPath: '/teaching', nonTeachingPath: '/nonteaching', icon: '📊' },
  { name: 'Department History', teachingPath: '/teaching/department-history', nonTeachingPath: '/nonteaching/department-history', icon: '🏢' },
  { name: 'My Designation and Payscale', teachingPath: '/teaching/designation-payscale', nonTeachingPath: '/nonteaching/designation-payscale', icon: '💼' },
  { name: 'My Association', teachingPath: '/teaching/association', nonTeachingPath: '/nonteaching/association', icon: '🤝' },
  { name: 'My Qualification', teachingPath: '/teaching/qualification', nonTeachingPath: '/nonteaching/qualification', icon: '🎓' },
  { name: 'Salary', teachingPath: '/teaching/salary', nonTeachingPath: '/nonteaching/salary', icon: '💵' },
  {
    name: 'Leave Application',
    icon: '🌿',
    submenu: [
      { name: 'Apply Leave', teachingPath: '/teaching/leave-application', nonTeachingPath: '/nonteaching/leave-application' },
      { name: 'Leave List', teachingPath: '/teaching/leave-list', nonTeachingPath: '/nonteaching/leave-list' },
    ],
  },
  {
    name: 'Professional Activities',
    teachingPath: '/teaching/professional-activities',
    nonTeachingPath: '/nonteaching/professional-activities',
    icon: '📚'
  },
  { name: 'Biometric', teachingPath: '/teaching/biometric', nonTeachingPath: '/nonteaching/biometric', icon: '🖐️' }
];

const TEACHING_ONLY_LINKS = [
  {
    name: 'Research',
    icon: '🔬',
    submenu: [
      { name: 'Conference', teachingPath: '/teaching/research/conference' },
      { name: 'Publication', teachingPath: '/teaching/research/publication' },
      { name: 'Book and Chapters', teachingPath: '/teaching/research/book-chapters' },
      { name: 'Funding and Consultancy', teachingPath: '/teaching/research/funding-consultancy' },
      { name: 'Copyright and Patents', teachingPath: '/teaching/research/copyright-patents' },
      { name: 'Achievement', teachingPath: '/teaching/research/achievement' },
      { name: 'Reviewer Editor', teachingPath: '/teaching/research/reviewer-editor' }
    ]
  }
];

const NON_TEACHING_ONLY_LINKS = [
  { name: 'Tax Investment', teachingPath: '/teaching/tax-investment', nonTeachingPath: '/nonteaching/tax-investment', icon: '🧮' }
];

function getPath(item, isTeaching) {
  return isTeaching ? item.teachingPath : item.nonTeachingPath;
}

export default function StaffSidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState(null);

  const isTeaching = isRoleMatch(user?.role, ROLE_TEACHING);
  const isNonTeaching = isRoleMatch(user?.role, ROLE_NON_TEACHING);

  const links = useMemo(() => {
    const shared = COMMON_LINKS.map((item) => {
      if (item.submenu) {
        return {
          ...item,
          submenu: item.submenu.map((subitem) => ({
            ...subitem,
            path: getPath(subitem, isTeaching),
          })),
        };
      }

      return { ...item, path: getPath(item, isTeaching) };
    });

    if (isTeaching) {
      const teachingOnly = TEACHING_ONLY_LINKS.map((item) => ({
        ...item,
        submenu: item.submenu?.map((subitem) => ({ ...subitem, path: subitem.teachingPath })) || []
      }));
      return [...shared.slice(0, 8), ...teachingOnly, ...shared.slice(8)];
    }

    if (isNonTeaching) {
      const nonTeachingOnly = NON_TEACHING_ONLY_LINKS.map((item) => ({ ...item, path: getPath(item, false) }));
      return [...shared.slice(0, 8), ...nonTeachingOnly, ...shared.slice(8)];
    }

    return [];
  }, [isTeaching, isNonTeaching]);

  const shouldExpandForSubmenu = !isOpen && expandedMenu;
  const sidebarWidth = isOpen ? 'w-64' : shouldExpandForSubmenu ? 'w-64' : 'w-20';

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#001f3f] text-white p-4 flex justify-between items-center z-50 shadow-lg">
        <span className="font-semibold">Menu</span>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="text-white hover:text-slate-300 focus:outline-none"
          aria-label="Toggle mobile menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40 top-16"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static top-16 left-0 h-screen md:h-auto z-40 transition-all duration-300 shadow-lg
          ${sidebarWidth} bg-[#001f3f] text-white
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          md:min-h-full md:w-64 md:flex md:flex-col`}
      >
        <div className="hidden md:flex justify-end p-4">
          <button
            onClick={() => {
              if (!isOpen && expandedMenu) {
                setExpandedMenu(null);
              } else {
                setIsOpen(!isOpen);
              }
            }}
            className="text-slate-300 hover:text-white focus:outline-none"
            aria-label="Toggle sidebar"
          >
            <span className="text-xl select-none">• • •</span>
          </button>
        </div>

        <div className="md:hidden flex justify-end p-4 border-b border-slate-700">
          <button
            onClick={() => setIsMobileOpen(false)}
            className="text-slate-300 hover:text-white focus:outline-none"
            aria-label="Close mobile menu"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>

        <nav className="space-y-2 px-3 pb-4 overflow-y-auto md:overflow-visible">
          {links.map((link) => (
            <div key={link.submenu ? link.name : link.path}>
              {link.submenu ? (
                <div>
                  <button
                    onClick={() => {
                      setExpandedMenu(expandedMenu === link.name ? null : link.name);
                    }}
                    title={!isOpen && !expandedMenu ? link.name : ''}
                    className={`w-full flex items-center space-x-3 px-4 py-3 md:py-3 rounded-lg transition duration-200 touch-manipulation
                    ${
                      expandedMenu === link.name
                        ? 'bg-blue-500 text-white'
                        : 'text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <span className="text-lg md:text-xl flex-shrink-0">{link.icon}</span>
                    <span className="font-medium flex-1 text-left text-sm md:text-sm whitespace-nowrap truncate">{link.name}</span>
                    <span className="text-sm flex-shrink-0">{expandedMenu === link.name ? '▼' : '▶'}</span>
                  </button>
                  {expandedMenu === link.name && (
                    <div className="space-y-1 mt-1">
                      {link.submenu.map((subitem) => (
                        <Link
                          key={subitem.path}
                          to={subitem.path}
                          onClick={() => setIsMobileOpen(false)}
                          title={!isOpen && expandedMenu ? subitem.name : ''}
                          className={`flex items-center space-x-3 px-8 py-2 md:py-2 rounded-lg transition duration-200 text-sm touch-manipulation
                          ${
                            location.pathname === subitem.path
                              ? 'bg-blue-500 text-white font-semibold'
                              : 'text-slate-300 hover:text-white hover:bg-slate-700'
                          }`}
                        >
                          <span className="font-medium">{subitem.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to={link.path}
                  onClick={() => setIsMobileOpen(false)}
                  title={!isOpen ? link.name : ''}
                  className={`flex items-center space-x-3 px-4 py-3 md:py-3 rounded-lg transition duration-200 touch-manipulation
                  ${
                    location.pathname === link.path
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <span className="text-lg md:text-xl flex-shrink-0">{link.icon}</span>
                  {isOpen && <span className="font-medium text-sm md:text-sm">{link.name}</span>}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
