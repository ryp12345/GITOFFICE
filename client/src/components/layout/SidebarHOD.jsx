import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function SidebarHOD() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const sidebarWidth = isOpen ? 'w-64' : 'w-20';

  const links = [
    { name: 'Dashboard', path: '/hod', icon: '📊' },
    { name: 'Department Staff', path: '/hod/staff', icon: '👥' },
    { name: 'Events', path: '/hod/events', icon: '📅' },
    { name: 'Notice', path: '/hod/notice', icon: '📢' },
    { name: 'Leave Requests', path: '/hod/leaves', icon: '🌿' }
  ];

  return (
    <aside className={`${sidebarWidth} bg-[#001f3f] text-white transition-all duration-300 shadow-lg min-h-full`}>
      <div className="flex justify-end p-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-slate-300 hover:text-white focus:outline-none"
          aria-label="Toggle sidebar"
        >
          <span className="text-xl select-none">• • •</span>
        </button>
      </div>
      <nav className="space-y-2 px-3 pb-4">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            title={!isOpen ? link.name : ''}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition duration-200 ${
              location.pathname === link.path
                ? 'bg-blue-500 text-white'
                : 'text-slate-200 hover:bg-slate-700'
            }`}
          >
            <span className="text-xl">{link.icon}</span>
            {isOpen && <span className="font-medium text-sm">{link.name}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
