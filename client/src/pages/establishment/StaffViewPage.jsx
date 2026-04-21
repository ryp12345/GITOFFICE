import Notification from '../../components/common/Notification';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStaffById } from '../../api/staffApi';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import PersonalInfo from './staff/PersonalInfo';
import Association from './staff/Association';
import Department from './staff/Department';
import Designation from './staff/Designation';

const TABS = [
  { key: 'personal', label: 'Personal Info' },
  { key: 'association', label: 'Association' },
  { key: 'department', label: 'Department' },
  { key: 'designation', label: 'Designation' }
];

export default function StaffViewPage() {
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const navigate = useNavigate();
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
            {/* Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="self-start mt-8 ml-4 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md font-medium flex items-center gap-2 shadow-sm border border-blue-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Staff
            </button>
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
                      <PersonalInfo staff={staff} setNotification={setNotification} />
                    )}
                    {activeTab === 'association' && (
                      <Association staff={staff} setNotification={setNotification} />
                    )}
                    {activeTab === 'department' && (
                      <Department staff={staff} setNotification={setNotification} />
                    )}
                    {activeTab === 'designation' && (
                      <Designation staff={staff} setNotification={setNotification} />
                    )}
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
