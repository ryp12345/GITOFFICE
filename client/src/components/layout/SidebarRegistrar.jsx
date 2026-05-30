import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function SidebarRegistrar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const sidebarWidth = isOpen ? 'w-64' : 'w-20';

  const links = [
    { name: 'Dashboard', path: '/registrar', icon: '📊' },
    { name: 'My Staff', path: '/registrar/staff', icon: '👥' },
    {
      name: 'Leave Management',
      icon: '🌿',
      submenu: [
        { name: 'Entitlement', path: '/registrar/leave-entitlement' },
        { name: 'Holiday and RH List', path: '/registrar/holidays', icon: '🎉' },
        { name: 'Leave Application', path: '/registrar/leave-application', icon: '🌿' }
      ]
    },
    {
      name: 'BIOMETRIC',
      path: '/registrar/biometric',
      icon: '🔏',
      submenu: [
        { name: 'Daily Data', path: '/registrar/biometric/daily' },
        { name: 'Monthly Data', path: '/registrar/biometric/monthly' },
        { name: 'Muster', path: '/registrar/biometric/muster' }
      ]
    }
  ];

  const toggleSubmenu = (index) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <>
      <div className="md:hidden fixed top-16 left-0 right-0 bg-[#001f3f] text-white p-4 flex justify-between items-center z-30 shadow-lg">
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
        className={`fixed md:static top-16 left-0 h-screen md:h-auto z-40 transition-all duration-300 shadow-lg ${sidebarWidth} max-w-[85vw] bg-[#001f3f] text-white ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} md:min-h-full md:flex md:flex-col`}
      >
        <div className="hidden md:flex justify-end p-4">
          <button
            onClick={() => {
              setIsOpen((prev) => {
                const next = !prev;
                if (!next) setExpandedMenus({});
                return next;
              });
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
          {links.map((link, index) => (
            <div key={link.path || index}>
              {link.submenu ? (
                <>
                  <button
                    onClick={() => toggleSubmenu(index)}
                    title={!isOpen ? link.name : ''}
                    className={`w-full flex items-center ${isOpen ? 'justify-between space-x-3' : 'justify-center'} px-4 py-3 md:py-3 rounded-lg transition duration-200 touch-manipulation ${
                      expandedMenus[index]
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <div className={`flex items-center ${isOpen ? 'space-x-3' : ''}`}>
                      <span className="text-lg md:text-xl flex-shrink-0">{link.icon}</span>
                      {isOpen && <span className="font-medium text-sm">{link.name}</span>}
                    </div>
                    {isOpen && (
                      <span className={`text-xs transition-transform ${expandedMenus[index] ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    )}
                  </button>
                  {expandedMenus[index] && isOpen && (
                    <div className="ml-4 space-y-1 border-l border-slate-600 pl-3 mt-1">
                      {link.submenu.map((subitem) => (
                        <Link
                          key={subitem.path}
                          to={subitem.path}
                          onClick={() => {
                            setIsMobileOpen(false);
                            setExpandedMenus({});
                          }}
                          className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition duration-200 text-sm ${
                            location.pathname === subitem.path
                              ? 'bg-blue-500 text-white'
                              : 'text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <span className="font-medium">{subitem.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={link.path}
                  onClick={() => setIsMobileOpen(false)}
                  title={!isOpen ? link.name : ''}
                  className={`flex items-center space-x-3 px-4 py-3 md:py-3 rounded-lg transition duration-200 touch-manipulation ${
                    location.pathname === link.path
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <span className="text-lg md:text-xl flex-shrink-0">{link.icon}</span>
                  {isOpen && <span className="font-medium text-sm">{link.name}</span>}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
