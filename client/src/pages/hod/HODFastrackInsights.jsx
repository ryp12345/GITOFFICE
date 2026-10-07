import { useEffect, useMemo, useState } from 'react';

import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import SidebarHOD from '../../components/layout/SidebarHOD';
import { getHodFastrackManagement, getHodFastrackLookup } from '../../api/examSectionApi';

export default function HODFastrackInsightsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [courseTypes, setCourseTypes] = useState([]);
  const [instances, setInstances] = useState([]);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [mgmtRes, lookupRes] = await Promise.all([
        getHodFastrackManagement(),
        getHodFastrackLookup()
      ]);
      const mgmtData = mgmtRes?.data?.data || mgmtRes?.data || [];
      setRows(Array.isArray(mgmtData) ? mgmtData : []);
      const lookupData = lookupRes?.data?.data || lookupRes?.data || {};
      setCourseTypes(lookupData.courseTypes || []);
      setInstances(lookupData.instances || []);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Failed to load data';
      showNotification(msg, 'error');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getStatusBadge = (status) => {
    const badgeClass = {
      'Pending': 'bg-red-500',
      'Approved': 'bg-green-500',
      'Verified': 'bg-blue-500'
    }[status] || 'bg-gray-300';
    return <span className={`badge ${badgeClass} text-white px-2 py-1 rounded text-xs`}>{status || '--NA--'}</span>;
  };

  const getStaffName = (staff) => {
    if (!staff) return '--NA--';
    return [staff.fname, staff.mname, staff.lname].filter(Boolean).join(' ');
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.course_code?.toLowerCase().includes(q) ||
      r.course_name?.toLowerCase().includes(q) ||
      r.course_type?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <SidebarHOD />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-full mx-auto">
            <Notification show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ show: false, message: '', type: '' })} />
            <div className="mb-6">
              <h1 className="mb-2 text-4xl font-extrabold text-gray-900">FASTRACK Insights</h1>
              <p className="text-lg text-gray-600">View fastrack course management overview for your department</p>
            </div>

            <div className="mb-6">
              <div className="relative w-full sm:w-72">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses..."
                  className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div className="mb-10 bg-white shadow-xl rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">S.NO</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Course Code</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Course Name</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Course Type</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Teaching Staff</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Instructor/Foreman</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Peon/Attender</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Classes Conducted</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Labs Conducted</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan="10" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan="10" className="px-6 py-12 text-center text-gray-500">No courses found</td></tr>
                    ) : (
                      filtered.map((row, idx) => (
                        <tr key={row.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{idx + 1}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.course_code}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.course_name}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.course_type?.toUpperCase()}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{getStaffName(row.assignedStaff)}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{getStaffName(row.instructorForeman)}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{getStaffName(row.peonAttender)}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.classes_conducted ?? '--NA--'}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.labs_conducted ?? '--NA--'}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">{getStatusBadge(row.status)}</td>
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