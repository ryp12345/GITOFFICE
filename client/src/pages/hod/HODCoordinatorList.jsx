import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import SidebarHOD from '../../components/layout/SidebarHOD';
import { getHodCoordinators } from '../../api/examSectionApi';
import { getErrorMessage } from '../../utils/errors';

export default function HODCoordinatorListPage() {
  const [coordinators, setCoordinators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await getHodCoordinators();
      const data = res?.data?.data || res?.data || [];
      setCoordinators(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg = getErrorMessage(e, 'Failed to load coordinators');
      showNotification(msg, 'error');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <SidebarHOD />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-full mx-auto">
            <Notification show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ show: false, message: '', type: '' })} />
            <div className="mb-6">
              <h1 className="mb-2 text-4xl font-extrabold text-gray-900">Coordinator Management</h1>
              <p className="text-lg text-gray-600">View and manage coordinators for your department</p>
            </div>

            <div className="bg-white shadow-xl rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">S.No</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Coordinator</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Employee Type</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                    ) : coordinators.length === 0 ? (
                      <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-500">No coordinators found</td></tr>
                    ) : (
                      coordinators.map((coord, idx) => (
                        <tr key={coord.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{idx + 1}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{coord.name}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{coord.employee_type}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <Link to={`/hod/coordinator-management/${coord.id}`} className="m-0 relative w-8 h-8 rounded-full p-0 transition-none focus:outline-none bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center" title="View">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}