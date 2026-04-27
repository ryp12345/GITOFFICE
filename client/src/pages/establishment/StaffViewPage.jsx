import Notification from '../../components/common/Notification';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStaffById } from '../../api/staffApi';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import PersonalInfo from './staff/PersonalInfo';
import Association from './staff/Association';
import Department from './staff/Department';
import Designation from './staff/Designation';
import Form16 from './staff/Form16';

import AnnualIncrement from './staff/AnnualIncrement';
import LaptopLoan from './staff/LaptopLoan';
import Qualification from './staff/Qualification';
import SocietyShare from './staff/SocietyShare';
import SocietyLoan from './staff/SocietyLoan';
import TaxRegime from './staff/TaxRegime';

const TABS = [
  { key: 'personal', label: 'Personal Info', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A9.001 9.001 0 0112 15c2.21 0 4.21.8 5.879 2.137M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  ) },
  { key: 'association', label: 'Association', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-5a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
  ) },
  { key: 'department', label: 'Department', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" /></svg>
  ) },
  { key: 'designation', label: 'Designation', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 01-8 0" /></svg>
  ) },
  { key: 'annual_increment', label: 'Annual Increment', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" /></svg>
  ) },
  { key: 'form_16', label: 'Form 16', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 17l4 4 4-4m0-5V3a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2h8a2 2 0 002-2z" /></svg>
  ) },
  { key: 'laptop_loan', label: 'Laptop Loan', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="20" height="12" x="2" y="7" rx="2" /><path d="M2 17h20" /></svg>
  ) },
  { key: 'qualification', label: 'Qualification', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422A12.083 12.083 0 0121 13.5c0 2.485-4.03 4.5-9 4.5s-9-2.015-9-4.5c0-.538.214-1.05.6-1.522L12 14z" /></svg>
  ) },
  { key: 'salary', label: 'Salary', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 12h8m-4-4v8" /></svg>
  ) },
  { key: 'society_share', label: 'Society Share', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 12h8m-4-4v8" /></svg>
  ) },
  { key: 'society_loan', label: 'Society Loan', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="20" height="12" x="2" y="7" rx="2" /><path d="M2 17h20" /></svg>
  ) },
  { key: 'tax_regime', label: 'Tax Regime', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" /></svg>
  ) },
];

export default function StaffViewPage() {
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const navigate = useNavigate();
  const { id } = useParams();
  // Set initial tab to 'summary'
  const [activeTab, setActiveTab] = useState('summary');
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshStaff = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await getStaffById(id);
      const apiStaff = data.data || data;
      const formatDate = (d) => {
        if (!d) return '';
        const date = typeof d === 'string' ? new Date(d) : d;
        if (isNaN(date)) return '';
        return date.toISOString().slice(0, 10);
      };

      setStaff({
        ...apiStaff,
        emailUser: apiStaff.email || apiStaff.emailUser || apiStaff.email_user || '',
        biometric_code: apiStaff.biometric_code || apiStaff.employeecode || '',
        date_of_superannuation: formatDate(apiStaff.date_of_superannuation || apiStaff.date_of_superanuation),
        dob: formatDate(apiStaff.dob),
        doj: formatDate(apiStaff.doj),
      });
    } catch (_err) {
      setError('Failed to load staff data.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refreshStaff();
  }, [refreshStaff]);

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
        <main className="flex-1 overflow-auto p-0 px-2">
          <div className="w-full h-full flex flex-col">
            {/* Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="self-start mt-2 ml-1 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md font-medium flex items-center gap-2 shadow-sm border border-blue-200 text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Staff
            </button>
            {/* Staff Name Heading */}
            {staff && (
              <h1 className="text-lg font-bold text-blue-800 mt-2 mb-1">Selected Staff: {staff.name || (staff.fname ? `${staff.fname} ${staff.lname}` : '')}</h1>
            )}
            <div className="flex w-full bg-white shadow-lg rounded-lg my-1 h-[600px]">
              {/* Left: Image & Tabs */}
              <div className="flex flex-col items-center py-4 px-2 border-r border-gray-200 min-w-[180px] bg-slate-50 overflow-y-auto max-h-[600px]">
                <button
                  onClick={() => setActiveTab('summary')}
                  className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mb-4 border-4 border-blue-100 shadow hover:border-blue-400 hover:shadow-lg transition-all duration-200 cursor-pointer"
                  title="Click to view summary"
                >
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A9.001 9.001 0 0112 15c2.21 0 4.21.8 5.879 2.137M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <h2 className="text-lg font-bold text-blue-700 mb-1 text-center truncate w-full">{staff?.name || '-'}</h2>
                <span className="text-gray-500 text-sm text-center mb-6 truncate w-full">{staff?.designation_name || ''}</span>
                {/* Sidebar Tabs - scrollable */}
                <div className="flex flex-col gap-2 w-full overflow-y-auto flex-1">
                  {TABS.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center w-full text-left px-3 py-2 rounded-lg text-base font-medium transition-colors duration-150 border shadow-sm mb-1 ${activeTab === tab.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50'}`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Right: Tab Content */}
              <div className="flex-1 px-4 py-4 flex flex-col items-start overflow-y-auto">
                {staff ? (
                  <>
                    {activeTab === 'summary' && (
                      <div className="space-y-8">
                        <h2 className="text-2xl font-bold text-blue-700 mb-2">Staff Summary</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {/* Personal Info */}
                          <div className="bg-white rounded-xl p-5 shadow flex items-center gap-4 border border-blue-100">
                            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-700">
                              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A9.001 9.001 0 0112 15c2.21 0 4.21.8 5.879 2.137M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </span>
                            <div>
                              <div className="text-gray-500 text-xs">Name</div>
                              <div className="text-lg font-semibold">{staff.name || (staff.fname ? `${staff.fname} ${staff.lname}` : '')}</div>
                            </div>
                          </div>
                          <div className="bg-white rounded-xl p-5 shadow flex items-center gap-4 border border-blue-100">
                            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-700">
                              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 01-8 0" /></svg>
                            </span>
                            <div>
                              <div className="text-gray-500 text-xs">Designation</div>
                              <div className="text-lg font-semibold">{staff.designation_name || '-'}</div>
                            </div>
                          </div>
                          <div className="bg-white rounded-xl p-5 shadow flex items-center gap-4 border border-blue-100">
                            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-700">
                              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" /></svg>
                            </span>
                            <div>
                              <div className="text-gray-500 text-xs">Department</div>
                              <div className="text-lg font-semibold">{staff.department_name || '-'}</div>
                            </div>
                          </div>
                          <div className="bg-white rounded-xl p-5 shadow flex items-center gap-4 border border-blue-100">
                            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-700">
                              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-5a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            </span>
                            <div>
                              <div className="text-gray-500 text-xs">Association</div>
                              <div className="text-lg font-semibold">{staff.association_name || '-'}</div>
                            </div>
                          </div>
                          <div className="bg-white rounded-xl p-5 shadow flex items-center gap-4 border border-blue-100">
                            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-700">
                              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 17l4 4 4-4m0-5V3a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2h8a2 2 0 002-2z" /></svg>
                            </span>
                            <div>
                              <div className="text-gray-500 text-xs">Email</div>
                              <div className="text-lg font-semibold">{staff.emailUser || '-'}</div>
                            </div>
                          </div>
                          <div className="bg-white rounded-xl p-5 shadow flex items-center gap-4 border border-blue-100">
                            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-700">
                              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" /></svg>
                            </span>
                            <div>
                              <div className="text-gray-500 text-xs">Date of Joining</div>
                              <div className="text-lg font-semibold">{staff.doj || '-'}</div>
                            </div>
                          </div>
                          <div className="bg-white rounded-xl p-5 shadow flex items-center gap-4 border border-blue-100">
                            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-700">
                              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="20" height="12" x="2" y="7" rx="2" /><path d="M2 17h20" /></svg>
                            </span>
                            <div>
                              <div className="text-gray-500 text-xs">Superannuation Date</div>
                              <div className="text-lg font-semibold">{staff.date_of_superannuation || '-'}</div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-8 text-gray-600 text-base">Select a tab on the left to view or edit more details about this staff member.</div>
                      </div>
                    )}
                    {activeTab === 'personal' && (
                      <PersonalInfo staff={staff} setNotification={setNotification} />
                    )}
                    {activeTab === 'association' && (
                      <Association
                        staff={staff}
                        setNotification={setNotification}
                        onAssociationUpdated={refreshStaff}
                      />
                    )}
                    {activeTab === 'department' && (
                      <Department
                        staff={staff}
                        setNotification={setNotification}
                        onDepartmentUpdated={refreshStaff}
                      />
                    )}
                    {activeTab === 'designation' && (
                      <Designation staff={staff} setNotification={setNotification} />
                    )}
                    {activeTab === 'annual_increment' && (
                      <AnnualIncrement
                        staff={staff}
                        setNotification={setNotification}
                        onAnnualIncrementUpdated={refreshStaff}
                      />
                    )}
                    {activeTab === 'form_16' && (
                      <Form16 staff={staff} setNotification={setNotification} />
                    )}
                    {activeTab === 'laptop_loan' && (
                      <LaptopLoan
                        staff={staff}
                        setNotification={setNotification}
                        onLaptopLoanUpdated={refreshStaff}
                      />
                    )}
                    {activeTab === 'qualification' && (
                      <Qualification staffId={staff.id} token={localStorage.getItem('token')} />
                    )}
                    {activeTab === 'salary' && (
                      <div>Salary content goes here.</div>
                    )}
                    {activeTab === 'society_share' && (
                      <SocietyShare
                        staff={staff}
                        setNotification={setNotification}
                        onSocietyShareUpdated={refreshStaff}
                      />
                    )}
                    {activeTab === 'society_loan' && (
                      <SocietyLoan
                        staff={staff}
                        setNotification={setNotification}
                        onSocietyLoanUpdated={refreshStaff}
                      />
                    )}
                    {activeTab === 'tax_regime' && (
                      <TaxRegime
                        staff={staff}
                        setNotification={setNotification}
                        onTaxRegimeUpdated={refreshStaff}
                      />
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
