import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function SidebarTeaching() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const [expandedMenu, setExpandedMenu] = useState(null);
  const shouldExpandForSubmenu = !isOpen && expandedMenu;
  const sidebarWidth = isOpen ? 'w-64' : shouldExpandForSubmenu ? 'w-64' : 'w-20';

  const links = [
    { name: 'My Dashboard', path: '/teaching', icon: '📊' },
    { name: 'Department History', path: '/teaching/department-history', icon: '🏢' },
    { name: 'My Designation and Payscale', path: '/teaching/designation-payscale', icon: '💼' },
    { name: 'My Association', path: '/teaching/association', icon: '🤝' },
    { name: 'My Qualification', path: '/teaching/qualification', icon: '🎓' },
    { name: 'Remuneration', path: '/teaching/remuneration', icon: '💰' },
    { name: 'Salary', path: '/teaching/salary', icon: '💵' },
    { name: 'Leave Application', path: '/teaching/leave-application', icon: '🌿' },
    { name: 'Professional Activities', path: '/teaching/professional-activities', icon: '📚' },
    {
      name: 'Research',
      path: '/teaching/research',
      icon: '🔬',
      submenu: [
        { name: 'Conference', path: '/teaching/research/conference' },
        { name: 'Publication', path: '/teaching/research/publication' },
        { name: 'Book and Chapters', path: '/teaching/research/book-chapters' },
        { name: 'Funding and Consultancy', path: '/teaching/research/funding-consultancy' },
        { name: 'Copyright and Patents', path: '/teaching/research/copyright-patents' },
        { name: 'Achievement', path: '/teaching/research/achievement' },
        { name: 'Reviewer Editor', path: '/teaching/research/reviewer-editor' }
      ]
    },
    { name: 'Tax Investment and TDS', path: '/teaching/tax-investment-tds', icon: '🧮' },
    { name: 'Internship Tracking', path: '/teaching/internship-tracking', icon: '🧾' },
    { name: 'Fastrack', path: '/teaching/fastrack', icon: '⚡' },
    { name: 'Biometric', path: '/teaching/biometric', icon: '🖐️' }
  ];

  return (
    <aside className={`${sidebarWidth} bg-[#001f3f] text-white transition-all duration-300 shadow-lg min-h-full`}>
      <div className="flex justify-end p-4">
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
      <nav className="space-y-2 px-3 pb-4">
        {links.map((link) => (
          <div key={link.submenu ? link.name : link.path}>
            {link.submenu ? (
              <div>
                <button
                  onClick={() => setExpandedMenu(expandedMenu === link.name ? null : link.name)}
                  title={!isOpen && !expandedMenu ? link.name : ''}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition duration-200 ${
                    expandedMenu === link.name
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <span className="text-xl">{link.icon}</span>
                  {(isOpen || (!isOpen && expandedMenu)) && (
                    <>
                      <span className="font-medium flex-1 text-left text-sm whitespace-nowrap truncate">{link.name}</span>
                      <span className="text-sm">{expandedMenu === link.name ? '▼' : '▶'}</span>
                    </>
                  )}
                </button>
                {expandedMenu === link.name && (
                  <div className="space-y-1 mt-1">
                    {link.submenu.map((subitem) => (
                      <Link
                        key={subitem.path}
                        to={subitem.path}
                        title={!isOpen && expandedMenu ? subitem.name : ''}
                        className={`flex items-center space-x-3 px-8 py-2 rounded-lg transition duration-200 text-sm ${
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
                title={!isOpen ? link.name : ''}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition duration-200 ${
                  location.pathname === link.path
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-200 hover:bg-slate-700'
                }`}
              >
                <span className="text-xl">{link.icon}</span>
                {(isOpen || (!isOpen && expandedMenu)) && <span className="font-medium text-sm">{link.name}</span>}
              </Link>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
