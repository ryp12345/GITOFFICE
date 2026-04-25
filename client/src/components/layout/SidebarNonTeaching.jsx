import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function SidebarNonTeaching() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const sidebarWidth = isOpen ? 'w-64' : 'w-20';

  const links = [
    { name: 'My Dashboard', path: '/nonteaching', icon: '📊' },
    { name: 'Department History', path: '/nonteaching/department-history', icon: '🏢' },
    { name: 'My Designation and Payscale', path: '/nonteaching/designation-payscale', icon: '💼' },
    { name: 'My Association', path: '/nonteaching/association', icon: '🤝' },
    { name: 'My Qualification', path: '/nonteaching/qualification', icon: '🎓' },
    // Remuneration removed
    { name: 'Salary', path: '/nonteaching/salary', icon: '💵' },
    { name: 'Leave Application', path: '/nonteaching/leave-application', icon: '🌿' },
    { name: 'Professional Activities', path: '/nonteaching/professional-activities', icon: '📚' },
    { name: 'SEMS', path: '/nonteaching/sems', icon: '🧾' },
    { name: 'Tax Investment', path: '/nonteaching/tax-investment', icon: '🧮' },
    { name: 'Biometric', path: '/nonteaching/biometric', icon: '🖐️' }
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
