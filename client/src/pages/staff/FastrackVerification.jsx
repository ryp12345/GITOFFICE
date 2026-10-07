import { useEffect, useMemo, useState } from 'react';

import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import StaffSidebar from '../../components/layout/StaffSidebar';
import { getVerificationFastrackCourses, verifyFastrackRecords } from '../../api/examSectionApi';

export default function FastrackVerificationPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await getVerificationFastrackCourses();
      const data = res?.data?.data || res?.data || [];
      setRows(Array.isArray(data) ? data : []);
      setSelectedItems([]);
      setSelectAll(false);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Failed to load courses';
      showNotification(msg, 'error');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const hasValidData = (row) => {
    return (row.fastrack_staffs || []).some(s =>
      (s.classes_conducted && s.classes_conducted > 0) ||
      (s.labs_conducted && s.labs_conducted > 0)
    );
  };

  const isVerifiable = (row) => {
    const status = row.fastrack_staffs?.[0]?.status?.toLowerCase();
    return hasValidData(row) && status !== 'verified' && status !== 'approved';
  };

  const handleCheckboxChange = (courseId, staffId) => {
    setSelectedItems(prev =>
      prev.some(item => item.course_id === courseId && item.staff_id === staffId)
        ? prev.filter(item => !(item.course_id === courseId && item.staff_id === staffId))
        : [...prev, { course_id: courseId, staff_id: staffId }]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
      setSelectAll(false);
    } else {
      const verifiable = rows.filter(isVerifiable);
      const newItems = verifiable.flatMap(row =>
        (row.fastrack_staffs || []).map(s => ({ course_id: row.id, staff_id: s.staff_id }))
      );
      setSelectedItems(newItems);
      setSelectAll(true);
    }
  };

  const handleVerify = async () => {
    if (selectedItems.length === 0) {
      showNotification('Select at least one record to verify', 'error');
      return;
    }
    if (!window.confirm('Are you sure you want to verify the selected records?')) return;

    try {
      await verifyFastrackRecords(selectedItems);
      showNotification('Staff Fastrack Records Verified Successfully.', 'success');
      load();
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Verification failed';
      showNotification(msg, 'error');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

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
      r.ft_instance_name?.toLowerCase().includes(q) ||
      r.course_type?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <StaffSidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-full mx-auto">
            <Notification show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ show: false, message: '', type: '' })} />
            <div className="mb-6">
              <h1 className="mb-2 text-4xl font-extrabold text-gray-900">FASTRACK Verification</h1>
              <p className="text-lg text-gray-600">Verify staff fastrack records with conducted classes/labs and documents</p>
            </div>

            <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
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
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider w-12">
                        <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="w-4 h-4 text-blue-600" />
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Course Code</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Course Name</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Course Type</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Instance</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Staff</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Classes Conducted</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Labs Conducted</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Document</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan="11" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan="11" className="px-6 py-12 text-center text-gray-500">No courses found</td></tr>
                    ) : (
                      filtered.map((row, idx) => {
                        const verifiable = isVerifiable(row);
                        const status = row.fastrack_staffs?.[0]?.status || '--NA--';
                        return (
                          <tr key={row.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                            <td className="px-4 py-4 whitespace-nowrap text-center text-sm">
                              {verifiable && (
                                <input type="checkbox" checked={selectedItems.some(i => i.course_id === row.id && row.fastrack_staffs.some(s => s.staff_id === i.staff_id))} onChange={() => handleSelectAll()} className="w-4 h-4 text-blue-600" />
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.course_code}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.course_name}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.course_type}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.ft_instance_name}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                              {(row.fastrack_staffs || []).map(s => (
                                <div key={s.id} className="flex items-center gap-1 mb-1">
                                  <input type="checkbox" disabled={!verifiable} checked={selectedItems.some(i => i.course_id === row.id && i.staff_id === s.staff_id)} onChange={() => handleCheckboxChange(row.id, s.staff_id)} className="w-4 h-4 text-blue-600" />
                                  <span>{getStaffName(s.staff)}</span>
                                </div>
                              ))}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                              {(row.fastrack_staffs || []).map(s => (
                                <div key={s.id} className="mb-1">{s.classes_conducted ?? '--NA--'}</div>
                              ))}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                              {(row.fastrack_staffs || []).map(s => (
                                <div key={s.id} className="mb-1">{s.labs_conducted ?? '--NA--'}</div>
                              ))}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                              {(row.fastrack_staffs || []).map(s => (
                                <div key={s.id} className="mb-1">
                                  {s.document ? (
                                    <a href={`/uploads/staff/fastrack_staff/${s.document}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                        <polyline points="14 2 14 8 20 8" />
                                      </svg>
                                      View
                                    </a>
                                  ) : '--NA--'}
                                </div>
                              ))}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.amount ?? '--NA--'}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm">{getStatusBadge(status)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {selectedItems.length > 0 && (
                <div className="p-4 border-t border-gray-200 flex justify-end">
                  <button onClick={handleVerify} className="px-6 py-3 font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
                    Verify Selected ({selectedItems.length})
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}