import Notification from '../../components/common/Notification';
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getStaffById, updateStaffById } from '../../api/staffApi';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';

const TABS = [
  { key: 'personal', label: 'Personal Info' },
  { key: 'association', label: 'Association' },
  { key: 'department', label: 'Department' },
  { key: 'designation', label: 'Designation' }
];

export default function StaffViewPage() {
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('personal');
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchStaff() {
      setLoading(true);
      setError('');
      try {
        const data = await getStaffById(id);
        // Map API fields to expected form fields for the UI
        const apiStaff = data.data || data;
        // Helper to format date to YYYY-MM-DD
        const formatDate = (d) => {
          if (!d) return '';
          // Handles both Date object and string
          const date = typeof d === 'string' ? new Date(d) : d;
          if (isNaN(date)) return '';
          return date.toISOString().slice(0, 10);
        };
        setStaff({
          ...apiStaff,
          // Show full email in the Email field
          emailUser: apiStaff.email || apiStaff.emailUser || apiStaff.email_user || '',
          biometric_code: apiStaff.biometric_code || apiStaff.employeecode || '',
          date_of_superannuation: formatDate(apiStaff.date_of_superannuation || apiStaff.date_of_superanuation),
          dob: formatDate(apiStaff.dob),
          doj: formatDate(apiStaff.doj),
        });
      } catch (err) {
        setError('Failed to load staff data.');
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchStaff();
  }, [id]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <Notification
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ show: false, message: '', type: 'success' })}
      />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-0">
          <div className="w-full h-full flex flex-col items-center">
            {/* Staff Name Heading */}
            {staff && (
              <h1 className="text-2xl font-bold text-blue-800 mt-8 mb-2">Selected Staff: {staff.name || (staff.fname ? `${staff.fname} ${staff.lname}` : '')}</h1>
            )}
            <div className="flex w-full max-w-6xl bg-white shadow-2xl rounded-xl my-10 min-h-[600px]">
              {/* Left: Image & Tabs */}
              <div className="flex flex-col items-center py-10 px-4 border-r border-gray-200 min-w-[200px] bg-slate-50">
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mb-4 border-4 border-blue-100 shadow">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A9.001 9.001 0 0112 15c2.21 0 4.21.8 5.879 2.137M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-blue-700 mb-1 text-center truncate w-full">{staff?.name || '-'}</h2>
                <span className="text-gray-500 text-sm text-center mb-6 truncate w-full">{staff?.designation_name || ''}</span>
                {/* Sidebar Tabs - compact */}
                <div className="flex flex-col gap-1 w-full">
                  {TABS.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`w-full text-left px-3 py-1 rounded-md text-sm font-medium transition-colors duration-150 border ${activeTab === tab.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Right: Tab Content */}
              <div className="flex-1 px-10 py-10 flex flex-col justify-center">
                {staff ? (
                  <>
                    {activeTab === 'personal' && (
                      <div className="flex justify-end mb-4">
                        {/* Update button removed. Only Save and Cancel buttons will be shown when editing. */}
                      </div>
                    )}
                    <TabContent staff={staff} activeTab={activeTab} setNotification={setNotification} />
                  </>
                ) : (
                  <div className="p-6 text-center text-gray-500">No staff data available.</div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function TabContent({ staff, activeTab, setNotification }) {
  // All hooks must be at the top level
  const [editForm, setEditForm] = useState(staff || {});
  useEffect(() => {
    setEditForm(staff || {});
  }, [staff]);
  const [editError, setEditError] = useState('');
  const { id } = useParams();
  const [saving, setSaving] = useState(false);

  // Save handler for personal tab
  const handleSave = async () => {
    if (!editForm.fname || !editForm.lname || !editForm.emailUser) {
      setEditError('First name, last name, and email are required.');
      return;
    }
    setSaving(true);
    setEditError('');
    try {
      // Only send allowed fields to backend
      const allowed = [
        'fname','mname','lname','local_address','permanent_address','dob','doj','religion_id','castecategory_id','gender','date_of_superanuation','bloodgroup','pan_card','adhar_card','contactno','emergency_no','emergency_name','employeecode','pay_type','fixed_pay','payscale','gcr','duration'
      ];
      const payload = {};
      for (const key of allowed) {
        if (editForm[key] !== undefined) payload[key] = editForm[key];
      }
      // Map biometric_code to employeecode if present
      if (editForm.biometric_code) {
        payload.employeecode = editForm.biometric_code;
      }
      // Map date_of_superannuation to date_of_superanuation (backend typo)
      if (editForm.date_of_superannuation) {
        payload.date_of_superanuation = editForm.date_of_superannuation;
      }
      // Map emailUser to email if needed (for future backend use)
      if (editForm.emailUser) {
        payload.email = editForm.emailUser;
      }
      await updateStaffById(id, payload);
      if (typeof setNotification === 'function') {
        setNotification({ show: true, message: 'Staff updated successfully!', type: 'success' });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
      }
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setEditError('Failed to update staff.');
    } finally {
      setSaving(false);
    }
  };
  const handleCancel = () => {
    setEditForm(staff || {});
    setEditError('');
  };

  // Render content based on activeTab
  if (activeTab === 'personal') {
    return (
      <div>
        {/* Save and Cancel buttons always visible, all inputs editable by default */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {editError && <div className="col-span-2 text-red-600 text-sm mb-2">{editError}</div>}
          <Input label="First Name" value={editForm.fname || ''} onChange={v => { setEditForm(f => ({ ...f, fname: v })); }} />
          <Input label="Middle Name" value={editForm.mname || ''} onChange={v => { setEditForm(f => ({ ...f, mname: v })); }} />
          <Input label="Last Name" value={editForm.lname || ''} onChange={v => { setEditForm(f => ({ ...f, lname: v })); }} />
          <Input label="Email" value={editForm.emailUser || ''} onChange={v => { setEditForm(f => ({ ...f, emailUser: v })); }} type="email" />
          <Input label="Biometric Code" value={editForm.biometric_code || ''} onChange={v => { setEditForm(f => ({ ...f, biometric_code: v })); }} />
          <Input label="Date of Birth" type="date" value={editForm.dob || ''} onChange={v => { setEditForm(f => ({ ...f, dob: v })); }} />
          <Input label="Date of Joining" type="date" value={editForm.doj || ''} onChange={v => { setEditForm(f => ({ ...f, doj: v })); }} />
          <Input label="Date of Superannuation" type="date" value={editForm.date_of_superannuation || ''} onChange={v => { setEditForm(f => ({ ...f, date_of_superannuation: v })); }} />
          <Input label="PAN Card" value={editForm.pan_card || ''} onChange={v => { setEditForm(f => ({ ...f, pan_card: v })); }} />
          <Input label="Aadhaar Card" value={editForm.adhar_card || ''} onChange={v => { setEditForm(f => ({ ...f, adhar_card: v })); }} />
          <Input label="Contact No" value={editForm.contactno || ''} onChange={v => { setEditForm(f => ({ ...f, contactno: v })); }} />
          <Input label="Local Address" value={editForm.local_address || ''} onChange={v => { setEditForm(f => ({ ...f, local_address: v })); }} />
          <Input label="Permanent Address" value={editForm.permanent_address || ''} onChange={v => { setEditForm(f => ({ ...f, permanent_address: v })); }} />
          <Input label="Emergency No" value={editForm.emergency_no || ''} onChange={v => { setEditForm(f => ({ ...f, emergency_no: v })); }} />
          <Input label="Emergency Name" value={editForm.emergency_name || ''} onChange={v => { setEditForm(f => ({ ...f, emergency_name: v })); }} />
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Blood Group</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={editForm.bloodgroup || ''}
              onChange={e => setEditForm(f => ({ ...f, bloodgroup: e.target.value }))}
            >
              <option value="">Select Blood Group</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
            </select>
          </div>
          <Input label="GC Resolution No" value={editForm.gcr || ''} onChange={v => { setEditForm(f => ({ ...f, gcr: v })); }} />
          <Input label="Duration" value={editForm.duration || ''} onChange={v => { setEditForm(f => ({ ...f, duration: v })); }} />
          <div className="col-span-2 flex gap-3 mt-4">
            <button className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={handleSave}>Save</button>
            <button className="px-4 py-2 bg-gray-200 rounded-md" onClick={handleCancel}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }
  if (activeTab === 'association') {
    // If staff.associations is an array, show all, else show single row
    const associations = Array.isArray(staff?.associations) && staff.associations.length > 0
      ? staff.associations
      : [
          {
            association_name: staff?.association_name,
            start_date: staff?.association_start_date,
            tenure_end_date: staff?.association_tenure_end_date,
            end_date: staff?.association_end_date,
            duration: staff?.association_duration
          }
        ];
    // Association table data: prefer association_staff if present
    // Helper to calculate duration in days from start_date to today
    function calcDuration(start, end) {
      if (!start) return '-';
      const startDate = new Date(start);
      const endDate = end ? new Date(end) : new Date();
      if (isNaN(startDate) || isNaN(endDate)) return '-';
      const diff = Math.max(0, endDate - startDate);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      return days + ' days';
    }

    const associationRows = Array.isArray(staff?.association_staff) && staff.association_staff.length > 0
      ? staff.association_staff.map(a => ({
          association_name: a.association_name || a.asso_name || a.name || '-',
          start_date: a.start_date,
          tenure_end_date: a.closing_date, // correct column for Tenure End Date
          end_date: a.end_date,
          duration: a.duration || calcDuration(a.start_date, a.end_date),
          status: a.status
        }))
      : [
          {
            association_name: staff?.association_name,
            start_date: staff?.association_start_date,
            tenure_end_date: staff?.association_tenure_end_date || staff?.association_closing_date,
            end_date: staff?.association_end_date,
            duration: staff?.association_duration || calcDuration(staff?.association_start_date, staff?.association_end_date),
            status: staff?.association_status
          }
        ];

    // Institution table data
    const institutionRows = Array.isArray(staff?.institutions) && staff.institutions.length > 0
      ? staff.institutions.map(inst => ({
          ...inst,
          duration: inst.duration || calcDuration(inst.start_date, inst.end_date)
        }))
      : [
          {
            institution_name: staff?.institution_name,
            start_date: staff?.institution_start_date,
            end_date: staff?.institution_end_date,
            duration: staff?.institution_duration || calcDuration(staff?.institution_start_date, staff?.institution_end_date),
            status: staff?.institution_status
          }
        ];
    return (
      <div>
        <h2 className="text-xl font-bold text-blue-700 mb-4">Staff Association</h2>
        <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden mb-8">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">S.no</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Association</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Start Date</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Tenure End Date</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">End Date</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Duration</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {associationRows.map((a, idx) => (
              <tr key={idx} className="even:bg-gray-50">
                <td className="px-3 py-2 border-b text-sm">{idx + 1}</td>
                <td className="px-3 py-2 border-b text-sm">{a.association_name || '-'}</td>
                <td className="px-3 py-2 border-b text-sm">{a.start_date ? formatDate(a.start_date) : '-'}</td>
                <td className="px-3 py-2 border-b text-sm">{a.tenure_end_date ? formatDate(a.tenure_end_date) : '-'}</td>
                <td className="px-3 py-2 border-b text-sm">{a.end_date ? formatDate(a.end_date) : '-'}</td>
                <td className="px-3 py-2 border-b text-sm">{a.duration || '-'}</td>
                <td className="px-3 py-2 border-b text-sm">{a.status || '-'}</td>
                <td className="px-3 py-2 border-b text-sm">
                  <button className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs">Action</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2 className="text-xl font-bold text-blue-700 mb-4">Staff Institution</h2>
        <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">S.no</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Institution</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Start Date</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">End Date</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Duration</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {institutionRows.map((inst, idx) => (
              <tr key={idx} className="even:bg-gray-50">
                <td className="px-3 py-2 border-b text-sm">{idx + 1}</td>
                <td className="px-3 py-2 border-b text-sm">{inst.institution_name || '-'}</td>
                <td className="px-3 py-2 border-b text-sm">{inst.start_date ? formatDate(inst.start_date) : '-'}</td>
                <td className="px-3 py-2 border-b text-sm">{inst.end_date ? formatDate(inst.end_date) : '-'}</td>
                <td className="px-3 py-2 border-b text-sm">{inst.duration || '-'}</td>
                <td className="px-3 py-2 border-b text-sm">{inst.status || '-'}</td>
                <td className="px-3 py-2 border-b text-sm">
                  <button className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs">Action</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  // Helper to format date to YYYY-MM-DD
  function formatDate(d) {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date)) return '';
    return date.toISOString().slice(0, 10);
  }
  if (activeTab === 'department') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Detail label="Department" value={staff?.department_name || '-'} />
      </div>
    );
  }
  if (activeTab === 'designation') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Detail label="Designation" value={staff?.designation_name || '-'} />
        <Detail label="Pay Type" value={staff?.pay_type || '-'} />
        <Detail label="Fixed Pay" value={staff?.fixed_pay || '-'} />
        <Detail label="Payscale" value={staff?.payscale || '-'} />
      </div>
    );
  }
  return null;
}

function Detail({ label, value }) {
  return (
    <div className="mb-2">
      <span className="block text-sm font-semibold text-gray-600 mb-1">{label}</span>
      <span className="block text-base text-gray-900 bg-gray-50 rounded px-2 py-1 border border-gray-200">{value || '-'}</span>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="block mb-1 text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}
