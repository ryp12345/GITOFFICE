import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function SidebarEstablishment() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const [expandedMenu, setExpandedMenu] = useState(null);
  const shouldExpandForSubmenu = !isOpen && expandedMenu;
  const sidebarWidth = isOpen ? 'w-64' : shouldExpandForSubmenu ? 'w-64' : 'w-20';

  const links = [
    { name: 'Dashboard', path: '/establishment', icon: '📊' },
    { name: 'Associations', path: '/associations', icon: '🔗' },
    { name: 'Departments', path: '/departments', icon: '🏛️' },
    { name: 'Designations', path: '/designations', icon: '🎯' },
    { name: 'Institutions', path: '/institutions', icon: '🏫' },
    {
      name: 'Leave Management',
      path: '/leave-management',
      icon: '🌿',
      submenu: [
        { name: 'Leaves', path: '/leave-management/leaves' },
        { name: 'Entitlement', path: '/leave-management/entitlement' },
        { name: 'Holiday RH List', path: '/leave-management/holiday-rh' },
        { name: 'Leave Calendar', path: '/leave-management/calendar' },
        { name: 'Leave List', path: '/leave-management/list' }
      ]
    },
    { name: 'Qualifications', path: '/qualifications', icon: '🎓' },
    { name: 'Religions & Castes', path: '/religions', icon: '🛐' },
    { name: 'Remuneration Heads', path: '/establishment/remuneration-heads', icon: '💰' },
    { name: 'Staff', path: '/staff', icon: '👥' }
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
