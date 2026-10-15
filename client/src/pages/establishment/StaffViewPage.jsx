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
import LicManagement from './staff/LicManagement';
import FestivalAdvance from './staff/FestivalAdvance';
import Remuneration from './staff/Remuneration';
import Salary from './staff/Salary';
import Tds from './staff/Tds';
import StaffLeaves from './staff/StaffLeaves';

// Same tabs and order as the Laravel ESTB staff view (resources/views/ESTB/staff/view.blade.php).
// nonTeachingOnly: Laravel shows the tab only when the latest employee type is Non-Teaching.
const TABS = [
  { key: 'personal', label: 'Staff Basic Information', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A9.001 9.001 0 0112 15c2.21 0 4.21.8 5.879 2.137M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  ) },
  { key: 'annual_increment', label: 'Annual Increment', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" /></svg>
  ) },
  { key: 'association', label: 'Association', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-5a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
  ) },
  { key: 'department', label: 'Department', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" /></svg>
  ) },
  { key: 'designation', label: 'Designation & Payscale', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 01-8 0" /></svg>
  ) },
  { key: 'festival_advance', label: 'Festival Advance', nonTeachingOnly: true, icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
  ) },
  { key: 'form_16', label: 'Form 16', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 17l4 4 4-4m0-5V3a2 2 0 00-2-2H6a2 2 0 002 2v14a2 2 0 002-2z" /></svg>
  ) },
  { key: 'laptop_loan', label: 'Laptop Loan', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="20" height="12" x="2" y="7" rx="2" /><path d="M2 17h20" /></svg>
  ) },
  { key: 'leaves', label: 'Leaves', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  ) },
  { key: 'lic_management', label: 'LIC Management', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
  ) },
  { key: 'qualification', label: 'Qualification', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422A12.083 12.083 0 0121 13.5c0 2.485-4.03 4.5-9 4.5s-9-2.015-9-4.5c0-.538.214-1.05.6-1.522L12 14z" /></svg>
  ) },
  { key: 'remuneration', label: 'Remuneration', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  ) },
  { key: 'salary', label: 'Salary', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 12h8m-4-4v8" /></svg>
  ) },
  { key: 'tds', label: 'TDS', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
  ) },
  { key: 'society_share', label: 'Society Share', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 12h8m-4-4v8" /></svg>
  ) },
  { key: 'society_loan', label: 'Society Loans', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="20" height="12" x="2" y="7" rx="2" /><path d="M2 17h20" /></svg>
  ) },
  { key: 'tax_regime', label: 'Tax Regime', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" /></svg>
  ) },
];

export default function StaffViewPage({
  readOnly = false,
  SidebarComponent = Sidebar,
  listPath = '/staff',
}) {
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
        biometric_code: apiStaff.biometric_code || apiStaff.employeecode || apiStaff.EmployeeCode || '',
        date_of_superannuation: formatDate(apiStaff.date_of_superannuation || apiStaff.date_of_superanuation),
        dob: formatDate(apiStaff.dob),
        doj: formatDate(apiStaff.doj),
        employee_type: apiStaff.emp_type_name || apiStaff.employee_type || '',
        religions: apiStaff.religions || [],
        castecategories: apiStaff.castecategories || [],
        associations: apiStaff.associations || [],
        departments_ref: apiStaff.departments_ref || [],
        qualifications: apiStaff.qualifications || [],
        designations: apiStaff.designations || [],
        add_designations: apiStaff.add_designations || [],
        payscales: apiStaff.payscales || [],
        association_staff: apiStaff.association_staff || [],
        date_of_confirmation: apiStaff.confirmation_date || apiStaff.date_of_confirmation || '',
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

  const isNonTeaching = String(staff?.employee_type || '').trim().toLowerCase() === 'non-teaching';
  const visibleTabs = TABS.filter((tab) => !tab.nonTeachingOnly || isNonTeaching);

  // A tab hidden after a refresh (e.g. employee type changed) falls back to the summary.
  useEffect(() => {
    if (staff && activeTab !== 'summary' && !visibleTabs.some((tab) => tab.key === activeTab)) {
      setActiveTab('summary');
    }
  }, [staff, activeTab, visibleTabs]);

  // Only the first load blocks the page. Tabs call refreshStaff after saving; replacing the page
  // with "Loading..." then would unmount the open tab and drop its state.
  if (loading && !staff) return <div className="p-8 text-center">Loading...</div>;
  if (error && !staff) return <div className="p-8 text-center text-red-600">{error}</div>;

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
        <SidebarComponent />
        <main className="flex-1 overflow-auto p-0 px-2">
          <div className="w-full h-full flex flex-col">
            {/* Back Button */}
            <button
              onClick={() => navigate(listPath)}
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
                  {visibleTabs.map(tab => (
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
              {/* Read-only views block form controls, except filters/exports marked data-readonly-allow. */}
              <div className={`flex-1 px-4 py-4 flex flex-col items-start overflow-y-auto ${readOnly ? '[&_input:not([data-readonly-allow])]:pointer-events-none [&_select:not([data-readonly-allow])]:pointer-events-none [&_textarea]:pointer-events-none [&_button:not([data-readonly-allow])]:pointer-events-none [&_button:not([data-readonly-allow])]:opacity-60 [&_button:not([data-readonly-allow])]:cursor-not-allowed' : ''}`}>
                {staff ? (
                  <>
                    {activeTab === 'summary' && (
                      <div className="w-full space-y-8">
                        <h2 className="text-2xl font-bold text-blue-700 mb-2">Staff Summary</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <SummaryCard tone="blue" label="Name" value={staff.name || (staff.fname ? `${staff.fname} ${staff.lname}` : '')}
                            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A9.001 9.001 0 0112 15c2.21 0 4.21.8 5.879 2.137M15 11a3 3 0 11-6 0 3 3 0 016 0z" />} />
                          <SummaryCard tone="purple" label="Designation & Payscale" value={staff.designation_name}
                            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 01-8 0" />} />
                          <SummaryCard tone="green" label="Department" value={staff.department_names || staff.department_name}
                            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />} />
                          <SummaryCard tone="yellow" label="Association" value={staff.association_name}
                            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-5a4 4 0 11-8 0 4 4 0 018 0z" />} />
                          <SummaryCard tone="indigo" label="Email" value={staff.emailUser}
                            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M8 17l4 4 4-4m0-5V3a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2h8a2 2 0 002-2z" />} />
                          <SummaryCard tone="teal" label="Date of Joining" value={staff.doj}
                            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />} />
                          <SummaryCard tone="red" label="Superannuation Date" value={staff.date_of_superannuation}
                            icon={<><rect width="20" height="12" x="2" y="7" rx="2" /><path d="M2 17h20" /></>} />
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
                      <Designation
                        staff={staff}
                        setNotification={setNotification}
                        onDesignationUpdated={refreshStaff}
                      />
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
                    {activeTab === 'festival_advance' && isNonTeaching && (
                      <FestivalAdvance staff={staff} setNotification={setNotification} readOnly={readOnly} />
                    )}
                    {activeTab === 'salary' && (
                      <Salary staff={staff} />
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
                    {activeTab === 'lic_management' && (
                      <LicManagement
                        staff={staff}
                        setNotification={setNotification}
                        onLicUpdated={refreshStaff}
                      />
                    )}
                    {activeTab === 'leaves' && (
                      <StaffLeaves staff={staff} setNotification={setNotification} readOnly={readOnly} />
                    )}
                    {activeTab === 'remuneration' && (
                      <Remuneration staff={staff} setNotification={setNotification} readOnly={readOnly} />
                    )}
                    {activeTab === 'tds' && (
                      <Tds staff={staff} />
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

// Same tone scheme as StatTile in components/dashboard/DashboardUI.jsx (-50 card, -200 border,
// -700 value, -900 label), plus an icon badge.
const SUMMARY_TONES = {
  blue: { card: 'bg-blue-50 border-blue-200', icon: 'bg-blue-100 text-blue-700', value: 'text-blue-700', label: 'text-blue-900' },
  purple: { card: 'bg-purple-50 border-purple-200', icon: 'bg-purple-100 text-purple-700', value: 'text-purple-700', label: 'text-purple-900' },
  green: { card: 'bg-green-50 border-green-200', icon: 'bg-green-100 text-green-700', value: 'text-green-700', label: 'text-green-900' },
  yellow: { card: 'bg-yellow-50 border-yellow-200', icon: 'bg-yellow-100 text-yellow-700', value: 'text-yellow-700', label: 'text-yellow-900' },
  indigo: { card: 'bg-indigo-50 border-indigo-200', icon: 'bg-indigo-100 text-indigo-700', value: 'text-indigo-700', label: 'text-indigo-900' },
  teal: { card: 'bg-teal-50 border-teal-200', icon: 'bg-teal-100 text-teal-700', value: 'text-teal-700', label: 'text-teal-900' },
  red: { card: 'bg-red-50 border-red-200', icon: 'bg-red-100 text-red-700', value: 'text-red-700', label: 'text-red-900' },
};

function SummaryCard({ tone = 'blue', label, value, icon }) {
  const t = SUMMARY_TONES[tone] || SUMMARY_TONES.blue;
  return (
    <div className={`rounded-xl border p-5 shadow-sm flex items-center gap-4 ${t.card}`}>
      <span className={`inline-flex shrink-0 items-center justify-center w-12 h-12 rounded-full ${t.icon}`}>
        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">{icon}</svg>
      </span>
      <div className="min-w-0">
        <div className={`text-xs font-medium ${t.label}`}>{label}</div>
        <div className={`text-lg font-semibold break-words ${t.value}`}>{value || '-'}</div>
      </div>
    </div>
  );
}
