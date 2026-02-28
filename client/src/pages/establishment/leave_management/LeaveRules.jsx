
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../../../components/layout/Header';
import Sidebar from '../../../components/layout/Sidebar';
import Notification from '../../../components/common/Notification';
import axios from '../../../api/axios';

const initialForm = {
  leave_id: '',
  carry_forwardable: 'No',
  cf_gcr: '',
  cf_wef: '',
  cf_closing_date: '',
  cf_closing_gcr: '',
  max_cf: 0,
  entitlement_post_max_cf: '',
  encashable: 'No',
  enc_gcr: '',
  enc_wef: '',
  enc_closing_date: '',
  enc_closing_gcr: '',
  max_enc: 0,
  gap: 'No',
  gap_gcr: '',
  gap_wef: '',
  gap_closing_date: '',
  gap_closing_gcr: '',
  min_gap: 0,
  max_time_allowed: '',
  period: '',
  prior_intimation_days: 0,
  status: 'active',
};

export default function LeaveRulesPage() {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const leave_id = query.get('leave_id') || '';
  const [form, setForm] = useState({ ...initialForm, leave_id });
  const [rules, setRules] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [search, setSearch] = useState('');
  const [allLeaves, setAllLeaves] = useState([]);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [combinationRules, setCombinationRules] = useState({});
  const [combinationWef, setCombinationWef] = useState('');
  const [combinationRows, setCombinationRows] = useState([]);
  const [combinationSearch, setCombinationSearch] = useState('');

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/leave-rules?leave_id=${leave_id}`);
      setRules(res.data.data || []);
    } catch (e) {
      setRules([]);
    }
    setLoading(false);
  };

  const fetchCombinationRules = async () => {
    try {
      const res = await axios.get(`/combine-leaves?leave_id=${leave_id}`);
      setCombinationRows(res.data.data || []);
    } catch (e) {
      setCombinationRows([]);
    }
  };

  useEffect(() => {
    if (leave_id) fetchRules();
  }, [leave_id]);

  useEffect(() => {
    if (leave_id) fetchCombinationRules();
  }, [leave_id]);

  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        const res = await axios.get('/leaves');
        const leaves = res.data?.data || [];
        setAllLeaves(leaves);
      } catch (e) {
        setAllLeaves([]);
      }
    };
    fetchLeaves();
  }, []);

  useEffect(() => {
    const current = allLeaves.find(l => String(l.id) === String(leave_id));
    setSelectedLeave(current || null);
  }, [allLeaves, leave_id]);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toDateInput = (value) => {
    if (!value) return '';
    return String(value).slice(0, 10);
  };

  const hydrateCombinationSelection = (rows) => {
    const activeRows = (rows || []).filter(row => row.status === 'active');
    const mapped = {};

    activeRows.forEach((row) => {
      mapped[String(row.combined_id)] = {
        enabled: true,
        type: row.sandwitchable || '',
      };
    });

    setCombinationRules(mapped);
    setCombinationWef(toDateInput(activeRows[0]?.wef || rows?.[0]?.wef || ''));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      const selectedCombinations = Object.entries(combinationRules)
        .filter(([, value]) => value?.enabled)
        .map(([combined_id, value]) => ({
          combined_id: Number(combined_id),
          sandwitchable: value?.type || '',
        }));

      if (selectedCombinations.some(item => !['Bothside', 'Oneside'].includes(item.sandwitchable))) {
        setError('Please select combination type (Both Side / One Side) for all checked leaves.');
        return;
      }

      const payload = {
        leave_id: form.leave_id,
        carry_forwardable: form.carry_forwardable,
        cf_gcr: form.cf_gcr,
        cf_wef: form.cf_wef,
        cf_closing_date: form.cf_closing_date,
        cf_closing_gcr: form.cf_closing_gcr,
        max_cf: form.max_cf,
        entitlement_post_max_cf: form.entitlement_post_max_cf,
        encashable: form.encashable,
        enc_gcr: form.enc_gcr,
        enc_wef: form.enc_wef,
        enc_closing_date: form.enc_closing_date,
        enc_closing_gcr: form.enc_closing_gcr,
        max_enc: form.max_enc,
        gap: form.gap,
        gap_gcr: form.gap_gcr,
        gap_wef: form.gap_wef,
        gap_closing_date: form.gap_closing_date,
        gap_closing_gcr: form.gap_closing_gcr,
        min_gap: form.min_gap,
        max_time_allowed: form.max_time_allowed,
        period: form.period,
        prior_intimation_days: form.prior_intimation_days,
        status: form.status,
      };
      if (editingId) {
        await axios.put(`/leave-rules/${editingId}`, payload);
        setNotification({ show: true, message: 'Leave rule updated successfully!', type: 'success' });
      } else {
        await axios.post('/leave-rules', payload);
        setNotification({ show: true, message: 'Leave rule created successfully!', type: 'success' });
      }

      await axios.post('/combine-leaves/sync', {
        leave_id: Number(leave_id),
        wef: combinationWef || new Date().toISOString().slice(0, 10),
        items: selectedCombinations,
      });

      setForm({ ...initialForm, leave_id });
      setCombinationRules({});
      setCombinationWef('');
      setEditingId(null);
      setIsModalOpen(false);
      fetchRules();
      fetchCombinationRules();
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to save');
      setNotification({ show: true, message: e.response?.data?.message || e.message || 'Failed to save', type: 'error' });
    }
  };

  const handleEdit = rule => {
    setForm({ ...rule });
    setEditingId(rule.id);
    hydrateCombinationSelection(combinationRows);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingId(null);
    setForm({ ...initialForm, leave_id });
    hydrateCombinationSelection(combinationRows);
    setError('');
    setIsModalOpen(true);
  };

  const eligibleCombinationLeaves = useMemo(() => {
    if (!selectedLeave) return [];
    return allLeaves.filter(l => (
      String(l.id) !== String(selectedLeave.id) &&
      l.status === 'active' &&
      l.vacation_type === selectedLeave.vacation_type
    ));
  }, [allLeaves, selectedLeave]);

  const handleCombinationToggle = (combinedLeaveId, checked) => {
    const key = String(combinedLeaveId);
    setCombinationRules(prev => {
      if (!checked) {
        return {
          ...prev,
          [key]: { enabled: false, type: '' },
        };
      }
      return {
        ...prev,
        [key]: {
          enabled: true,
          type: prev[key]?.type || '',
        },
      };
    });
  };

  const handleCombinationType = (combinedLeaveId, type) => {
    const key = String(combinedLeaveId);
    setCombinationRules(prev => ({
      ...prev,
      [key]: {
        enabled: true,
        type,
      },
    }));
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this leave rule?')) return;
    try {
      await axios.delete(`/leave-rules/${id}`);
      fetchRules();
      setNotification({ show: true, message: 'Leave rule deleted successfully!', type: 'success' });
    } catch (e) {
      setNotification({ show: true, message: e.response?.data?.message || e.message || 'Failed to delete', type: 'error' });
    }
  };

  // Search and pagination
  const PAGE_SIZE = 10;
  const filtered = useMemo(() => {
    const sorted = [...rules].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;
      return (b.id || 0) - (a.id || 0);
    });
    const q = search.toLowerCase();
    return sorted.filter(r => (
      String(r.id || '').toLowerCase().includes(q) ||
      r.carry_forwardable?.toLowerCase().includes(q) ||
      String(r.cf_gcr || '').toLowerCase().includes(q) ||
      String(r.cf_wef || '').toLowerCase().includes(q) ||
      r.encashable?.toLowerCase().includes(q) ||
      r.gap?.toLowerCase().includes(q) ||
      String(r.period || '').toLowerCase().includes(q) ||
      r.status?.toLowerCase().includes(q)
    ));
  }, [rules, search]);
  const [page, setPage] = useState(1);
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);
  useEffect(() => { setPage(1); }, [search, rules]);

  const [combinationPage, setCombinationPage] = useState(1);
  const filteredCombinations = useMemo(() => {
    const q = combinationSearch.toLowerCase();
    return [...combinationRows].filter((row) => (
      (row.combined_longname || '').toLowerCase().includes(q) ||
      (row.sandwitchable || '').toLowerCase().includes(q) ||
      (row.status || '').toLowerCase().includes(q) ||
      (toDateInput(row.wef) || '').toLowerCase().includes(q) ||
      (toDateInput(row.closing_wef) || '').toLowerCase().includes(q)
    ));
  }, [combinationRows, combinationSearch]);

  const paginatedCombinations = useMemo(() => {
    const start = (combinationPage - 1) * PAGE_SIZE;
    return filteredCombinations.slice(start, start + PAGE_SIZE);
  }, [filteredCombinations, combinationPage]);

  useEffect(() => { setCombinationPage(1); }, [combinationSearch, combinationRows]);

  const onClose = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm({ ...initialForm, leave_id });
    setCombinationRules({});
    setCombinationWef('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Notification show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ show: false, message: '', type: '' })} />
            <div className="mb-12 text-center">
              <h1 className="mb-2 text-4xl font-extrabold text-gray-900">Leave Rules</h1>
              <p className="text-lg text-gray-600">Create, update and manage leave rules</p>
            </div>
            <div className="mb-10 overflow-hidden bg-white shadow-xl rounded-xl">
                <h2 className="ml-2 mt-4 text-lg font-semibold text-gray-800 whitespace-nowrap">
                    Leave Rules
                    {selectedLeave ? (
                    <span className="text-red-600">{` - ${selectedLeave.longname} for ${selectedLeave.vacation_type} staff`}</span>
                    ) : null}
                </h2>
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                   
                    <div className="relative w-full sm:w-72">
                      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search leave rules..." className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                  </div>
                  <button onClick={handleAdd} className="flex items-center justify-center w-full px-6 py-2.5 font-medium text-white transition-all duration-300 transform rounded-lg shadow-lg bg-blue-600 hover:bg-blue-700 hover:-translate-y-1 hover:scale-105 sm:w-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    Add Leave Rule
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">S.No</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Rule</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Applicable (Yes/No)</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">With Effect From</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">GCR</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Closed On</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Closing GCR</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Max/Min Allowed</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Entitlement Post Max</th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan="10" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan="10" className="px-6 py-12 text-center text-gray-500">No leave rules found</td></tr>
                    ) : (
                      paginated.map((rule, idx) => {
                        const rowClass = `${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${rule.status !== 'active' ? 'opacity-80' : ''}`;
                        return (
                          <Fragment key={rule.id}>
                            <tr key={`${rule.id}-cf`} className={`${rowClass} hover:bg-blue-50 transition-colors duration-150`}>
                              <td rowSpan={5} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 align-top">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">Carry Forwardable</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{rule.carry_forwardable || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{toDateInput(rule.cf_wef) || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{rule.cf_gcr || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{toDateInput(rule.cf_closing_date) || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{rule.cf_closing_gcr || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{rule.max_cf ?? '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{rule.entitlement_post_max_cf ?? '--NA--'}</td>
                              <td rowSpan={5} className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium align-top">
                                <div className="flex items-center justify-center space-x-2">
                                  <button
                                    onClick={() => handleEdit(rule)}
                                    className="p-2 text-white transition-colors duration-200 bg-blue-600 rounded-lg hover:bg-blue-700"
                                    title="Edit Leave Rule"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDelete(rule.id)}
                                    className="p-2 text-white transition-colors duration-200 bg-red-600 rounded-lg hover:bg-red-700"
                                    title="Delete Leave Rule"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                            <tr key={`${rule.id}-enc`} className={`${rowClass} hover:bg-blue-50 transition-colors duration-150`}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">Encashable</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{rule.encashable || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{toDateInput(rule.enc_wef) || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{rule.enc_gcr || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{toDateInput(rule.enc_closing_date) || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{rule.enc_closing_gcr || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{rule.max_enc ?? '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">-</td>
                            </tr>
                            <tr key={`${rule.id}-gap`} className={`${rowClass} hover:bg-blue-50 transition-colors duration-150`}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">Gap between two consecutive similar leaves</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{rule.gap || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{toDateInput(rule.gap_wef) || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{rule.gap_gcr || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{toDateInput(rule.gap_closing_date) || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{rule.gap_closing_gcr || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{rule.min_gap ?? '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">-</td>
                            </tr>
                            <tr key={`${rule.id}-times`} className={`${rowClass} hover:bg-blue-50 transition-colors duration-150`}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">Maximum Times Allowed</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{rule.period || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">-</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">-</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">-</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">-</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{rule.max_time_allowed ?? '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">-</td>
                            </tr>
                            <tr key={`${rule.id}-prior`} className={`${rowClass} hover:bg-blue-50 transition-colors duration-150`}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">Prior Intimation Required</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">-</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">-</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">-</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">-</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">-</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{rule.prior_intimation_days ?? '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">-</td>
                            </tr>
                          </Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination Controls */}
              {filtered.length > PAGE_SIZE && (
                <div className="flex justify-end items-center gap-2 px-6 pb-6">
                  <button
                    className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Prev
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {page} of {Math.ceil(filtered.length / PAGE_SIZE)}
                  </span>
                  <button
                    className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                    onClick={() => setPage(p => Math.min(Math.ceil(filtered.length / PAGE_SIZE), p + 1))}
                    disabled={page === Math.ceil(filtered.length / PAGE_SIZE)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            <div className="mb-10 overflow-hidden bg-white shadow-xl rounded-xl">
                <h2 className="ml-2 mt-4 text-lg font-semibold text-gray-800">
                Leave Combination Rules
                {selectedLeave ? (
                    <span className="text-red-600">{` - ${selectedLeave.longname} for ${selectedLeave.vacation_type} staff`}</span>
                ) : null}
                </h2>
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
               
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="relative w-full sm:w-72">
                    <input
                      value={combinationSearch}
                      onChange={(e) => setCombinationSearch(e.target.value)}
                      placeholder="Search combination rules..."
                      className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                 
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">S.No</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Leave</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Combination Type</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">With Effect From</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Closed On</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCombinations.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">No combination rules found</td>
                      </tr>
                    ) : (
                      paginatedCombinations.map((row, idx) => (
                        <tr key={row.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors duration-150`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{(combinationPage - 1) * PAGE_SIZE + idx + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.combined_longname || row.combined_id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.sandwitchable}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{toDateInput(row.wef) || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{toDateInput(row.closing_wef) || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${row.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{row.status}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {filteredCombinations.length > PAGE_SIZE && (
                <div className="flex justify-end items-center gap-2 px-6 py-4 border-t border-gray-100">
                  <button
                    className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                    onClick={() => setCombinationPage((p) => Math.max(1, p - 1))}
                    disabled={combinationPage === 1}
                  >
                    Prev
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {combinationPage} of {Math.ceil(filteredCombinations.length / PAGE_SIZE)}
                  </span>
                  <button
                    className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                    onClick={() => setCombinationPage((p) => Math.min(Math.ceil(filteredCombinations.length / PAGE_SIZE), p + 1))}
                    disabled={combinationPage === Math.ceil(filteredCombinations.length / PAGE_SIZE)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {isModalOpen && (
              <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
                <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />
                  <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                    <div className="px-6 py-4 bg-blue-600">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium leading-6 text-white">{editingId ? 'Edit Leave Rule' : 'Add Leave Rule'}</h3>
                        <button className="text-white hover:text-gray-200" onClick={onClose}>
                          <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                    <div className="px-6 py-5 bg-white">
                      {error && <div className="mb-4 p-3 rounded border border-red-200 text-red-700 bg-red-50 text-sm">{error}</div>}
                      <form className="space-y-5" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Leave ID *</label>
                            <input type="number" name="leave_id" value={form.leave_id} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg" required disabled />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Carry Forwardable *</label>
                            <div className="flex items-center gap-6 px-4 py-3 border border-gray-300 rounded-lg">
                              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                <input
                                  type="radio"
                                  name="carry_forwardable"
                                  value="Yes"
                                  checked={form.carry_forwardable === 'Yes'}
                                  onChange={handleChange}
                                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                  required
                                />
                                Yes
                              </label>
                              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                <input
                                  type="radio"
                                  name="carry_forwardable"
                                  value="No"
                                  checked={form.carry_forwardable === 'No'}
                                  onChange={handleChange}
                                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                No
                              </label>
                            </div>
                          </div>
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">CF GCR</label>
                            <input type="text" name="cf_gcr" value={form.cf_gcr} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg" />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">CF WEF *</label>
                            <input type="date" name="cf_wef" value={form.cf_wef} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg" required />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">CF Closing Date</label>
                            <input type="date" name="cf_closing_date" value={form.cf_closing_date} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg" />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">CF Closing GCR</label>
                            <input type="text" name="cf_closing_gcr" value={form.cf_closing_gcr} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg" />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Max CF *</label>
                            <input type="number" name="max_cf" value={form.max_cf} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg" required />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Entitlement Post Max CF</label>
                            <input type="number" name="entitlement_post_max_cf" value={form.entitlement_post_max_cf} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg" />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Encashable *</label>
                            <div className="flex items-center gap-6 px-4 py-3 border border-gray-300 rounded-lg">
                              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                <input
                                  type="radio"
                                  name="encashable"
                                  value="Yes"
                                  checked={form.encashable === 'Yes'}
                                  onChange={handleChange}
                                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                  required
                                />
                                Yes
                              </label>
                              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                <input
                                  type="radio"
                                  name="encashable"
                                  value="No"
                                  checked={form.encashable === 'No'}
                                  onChange={handleChange}
                                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                No
                              </label>
                            </div>
                          </div>
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Enc GCR</label>
                            <input type="text" name="enc_gcr" value={form.enc_gcr} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg" />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Enc WEF *</label>
                            <input type="date" name="enc_wef" value={form.enc_wef} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg" required />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Enc Closing Date</label>
                            <input type="date" name="enc_closing_date" value={form.enc_closing_date} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg" />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Enc Closing GCR</label>
                            <input type="text" name="enc_closing_gcr" value={form.enc_closing_gcr} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg" />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Max Enc *</label>
                            <input type="number" name="max_enc" value={form.max_enc} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg" required />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Gap *</label>
                            <div className="flex items-center gap-6 px-4 py-3 border border-gray-300 rounded-lg">
                              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                <input
                                  type="radio"
                                  name="gap"
                                  value="Yes"
                                  checked={form.gap === 'Yes'}
                                  onChange={handleChange}
                                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                  required
                                />
                                Yes
                              </label>
                              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                <input
                                  type="radio"
                                  name="gap"
                                  value="No"
                                  checked={form.gap === 'No'}
                                  onChange={handleChange}
                                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                No
                              </label>
                            </div>
                          </div>
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Gap GCR</label>
                            <input type="text" name="gap_gcr" value={form.gap_gcr} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg" />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Gap WEF</label>
                            <input type="date" name="gap_wef" value={form.gap_wef} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg" />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Gap Closing Date</label>
                            <input type="date" name="gap_closing_date" value={form.gap_closing_date} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg" />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Gap Closing GCR</label>
                            <input type="text" name="gap_closing_gcr" value={form.gap_closing_gcr} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg" />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Min Gap *</label>
                            <input type="number" name="min_gap" value={form.min_gap} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg" required />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Max Time Allowed</label>
                            <input type="number" name="max_time_allowed" value={form.max_time_allowed} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg" />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Period</label>
                            <select name="period" value={form.period} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg">
                              <option value="">Select the Period</option>
                              <option value="entire service">Entire Service</option>
                              <option value="five years">Once in Five Years</option>
                              <option value="one year">Once in a Year</option>
                              <option value="six months">Once in six months</option>
                              <option value="one month">Once in a month</option>
                            </select>
                          </div>
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Prior Intimation Days *</label>
                            <input type="number" name="prior_intimation_days" value={form.prior_intimation_days} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg" required />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Check the leaves that can be combined with this leave type</label>
                            <div className="max-h-56 overflow-y-auto border border-gray-300 rounded-lg p-4 space-y-3 bg-gray-50">
                              {eligibleCombinationLeaves.length === 0 ? (
                                <p className="text-sm text-gray-500">No eligible leave types found for combination.</p>
                              ) : (
                                eligibleCombinationLeaves.map((leaveOption) => {
                                  const key = String(leaveOption.id);
                                  const item = combinationRules[key] || { enabled: false, type: '' };
                                  return (
                                    <div key={leaveOption.id} className="p-3 bg-white border border-gray-200 rounded-lg">
                                      <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-800">
                                        <input
                                          type="checkbox"
                                          checked={!!item.enabled}
                                          onChange={(e) => handleCombinationToggle(leaveOption.id, e.target.checked)}
                                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        {leaveOption.longname}
                                      </label>
                                      <div className="mt-3 flex items-center gap-6">
                                        <label className={`inline-flex items-center gap-2 text-sm ${item.enabled ? 'text-gray-700' : 'text-gray-400'}`}>
                                          <input
                                            type="radio"
                                            name={`allowed_${leaveOption.id}`}
                                            value="Bothside"
                                            disabled={!item.enabled}
                                            checked={item.type === 'Bothside'}
                                            onChange={() => handleCombinationType(leaveOption.id, 'Bothside')}
                                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                          />
                                          Both Side
                                        </label>
                                        <label className={`inline-flex items-center gap-2 text-sm ${item.enabled ? 'text-gray-700' : 'text-gray-400'}`}>
                                          <input
                                            type="radio"
                                            name={`allowed_${leaveOption.id}`}
                                            value="Oneside"
                                            disabled={!item.enabled}
                                            checked={item.type === 'Oneside'}
                                            onChange={() => handleCombinationType(leaveOption.id, 'Oneside')}
                                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                          />
                                          One Side
                                        </label>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Combination WEF</label>
                            <input
                              type="date"
                              value={combinationWef}
                              onChange={(e) => setCombinationWef(e.target.value)}
                              className="block w-full px-4 py-3 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Status *</label>
                            <select name="status" value={form.status} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg" required>
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end space-x-4 pt-4">
                          <button type="button" onClick={onClose} className="inline-flex justify-center px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancel</button>
                          <button type="submit" className="inline-flex justify-center px-6 py-3 text-sm font-medium text-white border border-transparent rounded-lg shadow-sm bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">{editingId ? 'Update Leave Rule' : 'Create Leave Rule'}</button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
