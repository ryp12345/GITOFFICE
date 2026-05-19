import { useEffect, useMemo, useState } from 'react';
import Header from '../../components/layout/Header';
import SidebarHOD from '../../components/layout/SidebarHOD';
import Notification from '../../components/common/Notification';
import {
  createAssociateProfessorApplication,
  deleteAssociateProfessorApplication,
  exportAssociateProfessorApplications,
  getAssociateProfessorApplications,
  updateAssociateProfessorApplication
} from '../../api/AssociateProfessorApi';

const defaultForm = {
  application_no: '',
  applicant_name: '',
  caste_name: '',
  date_of_birth: '',
  email: '',
  applicant_address: '',
  applicant_phone: '',
  advertisement_instance: '',
  phd_university: '',
  phd_reputed_university: '',
  ug_branches: '',
  ug_class: '',
  pg_specialization: '',
  pg_class: '',
  experience_teaching: '',
  experience_research: '',
  experience_industry: '',
  phd_date: '',
  post_phd_experience: '',
  papers_in_SCI: '',
  papers_in_UGC: '',
  papers_in_AICTE: '',
  publication: '',
  remarks: ''
};

const ugBranchOptions = [
  ['B-design', 'B-design'],
  ['Information Technology', 'Information Technology'],
  ['AE', 'Aeronautical Engineering'],
  ['AS', 'Aerospace Engineering'],
  ['AU', 'Automobile Engineering'],
  ['BT', 'Biotechnology'],
  ['PC', 'Petrochemical Engineering'],
  ['CH', 'Chemical Engineering'],
  ['CV', 'Civil Engineering'],
  ['CC', 'Ceramics and Cement Technology'],
  ['CT', 'Construction Technology & Management'],
  ['EV', 'Environmental Engineering'],
  ['MI', 'Mining Engineering'],
  ['CS', 'Computer Science & Engineering'],
  ['CE', 'Computer Engineering'],
  ['AD', 'Artificial Intelligence & Data Science'],
  ['AI', 'Artificial Intelligence & Machine Learning'],
  ['CM', 'Computer & Communication Engineering'],
  ['CB', 'Computer Science & Business Systems'],
  ['CG', 'Computer Science & Design'],
  ['CO', 'CSE (IoT)'],
  ['CI', 'CSE (AI & ML)'],
  ['CA', 'CSE (Artificial Intelligence)'],
  ['CY', 'CSE (Cyber Security)'],
  ['CD', 'CSE (Data Science)'],
  ['IC', 'CSE (IoT & Cyber Security)'],
  ['DS', 'Data Science'],
  ['IS', 'Information Science & Engineering'],
  ['CR', 'Computer Science'],
  ['EE', 'Electrical & Electronics Engineering'],
  ['EC', 'Electronics & Communication Engineering'],
  ['ET', 'Electronics & Telecommunication Engineering'],
  ['IO', 'Industrial IoT'],
  ['VL', 'Electronics (VLSI)'],
  ['EA', 'Electronics & Communication (Advanced)'],
  ['UE', 'Electronics & Computer Engineering'],
  ['EI', 'Electronics & Instrumentation Engineering'],
  ['BM', 'Biomedical Engineering'],
  ['ML', 'Medical Electronics Engineering'],
  ['AG', 'Agricultural Engineering'],
  ['AR', 'Automation & Robotics'],
  ['MR', 'Marine Engineering'],
  ['MM', 'Mechanical & Smart Manufacturing'],
  ['ME', 'Mechanical Engineering'],
  ['MT', 'Mechatronics'],
  ['RA', 'Robotics & Automation'],
  ['RI', 'Robotics & AI'],
  ['ER', 'Energy Engineering'],
  ['SA', 'Smart Agritech'],
  ['IP', 'Industrial & Production Engineering'],
  ['IM', 'Industrial Engineering & Management'],
  ['MS', 'Manufacturing Science & Engineering'],
  ['ST', 'Silk Technology'],
  ['TX', 'Textile Technology'],
  ['PHY', 'Physics'],
  ['CHE', 'Chemistry'],
  ['MAT', 'Mathematics']
];

function formatDateDMY(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function computePostPhdYears(phdDate) {
  if (!phdDate) return '0.00';
  const from = new Date(phdDate);
  const to = new Date();
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);
  if (Number.isNaN(from.getTime()) || to <= from) return '0.00';
  const diffMs = to.getTime() - from.getTime();
  return (diffMs / (1000 * 60 * 60 * 24 * 365.25)).toFixed(2);
}

function formatCount(value) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return '0';
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2);
}

function renderStatusIcon(isSatisfied, title) {
  const circleColor = isSatisfied ? '#22c55e' : '#ef4444';

  return (
    <span title={title} className="inline-block align-middle ml-1">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="12" fill={circleColor} />
        {isSatisfied ? (
          <path d="M7 13l3 3 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M15 9l-6 6M9 9l6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </span>
  );
}

function renderUgPgRemarks(row) {
  const classLabels = { F: 'First Class', S: 'Second Class', T: 'Third Class' };
  const ugLabel = classLabels[row.ug_class] || row.ug_class || '';
  const pgLabel = classLabels[row.pg_class] || row.pg_class || '';

  if (row.ug_pg_remarks === 'Satisfied') {
    return (
      <>
        Satisfied
        {ugLabel ? ` (UG: ${ugLabel})` : ''}
        {pgLabel ? ` (PG: ${pgLabel})` : ''}
        {renderStatusIcon(true, 'Requirement Met')}
      </>
    );
  }

  if (row.ug_pg_remarks === 'Not Satisfied') {
    return (
      <>
        Not Satisfied
        {ugLabel ? ` (UG: ${ugLabel})` : ''}
        {pgLabel ? ` (PG: ${pgLabel})` : ''}
        {' - First class required'}
        {renderStatusIcon(false, 'Requirement Not Met')}
      </>
    );
  }

  return row.ug_pg_remarks || '';
}

function renderPhdRemarks(row) {
  const postPhd = Number(row.post_phd_experience || 0);
  const safePostPhd = Number.isNaN(postPhd) ? 0 : postPhd;
  const hasPhd = Boolean(row.phd_date || row.phd_university);

  if (row.phd_remarks === 'Satisfied') {
    return (
      <>
        {`Satisfied (Post-PhD: ${formatCount(safePostPhd)} yrs)`}
        {renderStatusIcon(true, 'Requirement Met')}
      </>
    );
  }

  if (row.phd_remarks === 'Not Satisfied') {
    return hasPhd ? (
      <>
        {`Not Satisfied (Post-PhD: ${formatCount(safePostPhd)} yrs) - Need ${formatCount(Math.max(0, 2 - safePostPhd))} more yrs`}
        {renderStatusIcon(false, 'Requirement Not Met')}
      </>
    ) : (
      <>
        Not Satisfied - No Ph.D. provided
        {renderStatusIcon(false, 'Requirement Not Met')}
      </>
    );
  }

  return row.phd_remarks || '';
}

function renderExperienceRemarks(row) {
  const experienceYears = Number(row.experience_years || 0);
  const safeExperienceYears = Number.isNaN(experienceYears) ? 0 : experienceYears;

  if (row.experience_remarks === 'Satisfied') {
    return (
      <>
        {`Satisfied (${formatCount(safeExperienceYears)} yrs)`}
        {renderStatusIcon(true, 'Requirement Met')}
      </>
    );
  }

  if (row.experience_remarks === 'Not Satisfied') {
    return (
      <>
        {`Not Satisfied (${formatCount(safeExperienceYears)} yrs) - Need ${formatCount(Math.max(0, 8 - safeExperienceYears))} more yrs`}
        {renderStatusIcon(false, 'Requirement Not Met')}
      </>
    );
  }

  return row.experience_remarks || '';
}

function renderResearchRemarks(row) {
  const sci = Number(row.papers_in_sci || 0);
  const ugc = Number(row.papers_in_ugc || 0);
  const aicte = Number(row.papers_in_aicte || 0);
  const total = Number(row.research_papers_count || 0);
  const safeSci = Number.isNaN(sci) ? 0 : sci;
  const safeUgc = Number.isNaN(ugc) ? 0 : ugc;
  const safeAicte = Number.isNaN(aicte) ? 0 : aicte;
  const safeTotal = Number.isNaN(total) ? 0 : total;

  if (row.research_remarks === 'Satisfied') {
    return (
      <>
        {`Satisfied - Total: ${formatCount(safeTotal)} (SCI: ${formatCount(safeSci)}, UGC: ${formatCount(safeUgc)}, AICTE: ${formatCount(safeAicte)})`}
        {renderStatusIcon(true, 'Requirement Met')}
      </>
    );
  }

  if (row.research_remarks === 'Not Satisfied') {
    return (
      <>
        {`Not Satisfied - Total: ${formatCount(safeTotal)} (SCI: ${formatCount(safeSci)}, UGC: ${formatCount(safeUgc)}, AICTE: ${formatCount(safeAicte)}) - Need ${formatCount(Math.max(0, 6 - safeTotal))} more papers`}
        {renderStatusIcon(false, 'Requirement Not Met')}
      </>
    );
  }

  return row.research_remarks || '';
}

function renderEligibilityStatus(row) {
  const eligibility = String(row.eligibility_status || '').trim().toLowerCase();

  if (eligibility === 'eligible') {
    return (
      <>
        Eligible
        {renderStatusIcon(true, 'Eligible')}
      </>
    );
  }

  if (eligibility === 'not eligible') {
    return (
      <>
        Not Eligible
        {renderStatusIcon(false, 'Not Eligible')}
      </>
    );
  }

  return row.eligibility_status || '';
}

export default function AssoProRecruitmentPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  const PAGE_SIZE = 10;

  const stats = useMemo(() => {
    const total = rows.length;
    const eligible = rows.filter((r) => String(r.eligibility_status || '').trim().toLowerCase() === 'eligible').length;
    const notEligible = rows.filter((r) => String(r.eligibility_status || '').trim().toLowerCase() === 'not eligible').length;
    const researchSatisfied = rows.filter((r) => String(r.research_remarks || '').trim() === 'Satisfied').length;
    return { total, eligible, notEligible, researchSatisfied };
  }, [rows]);

  const loadRows = async () => {
    setLoading(true);
    try {
      const response = await getAssociateProfessorApplications();
      setRows(response?.data?.data?.rows || []);
    } catch (error) {
      setNotification({ show: true, message: error?.response?.data?.message || 'Failed to load applications', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  useEffect(() => {
    setForm((prev) => ({ ...prev, post_phd_experience: computePostPhdYears(prev.phd_date) }));
  }, [form.phd_date]);

  const filtered = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;
      return (b.id || 0) - (a.id || 0);
    });
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((r) =>
      [r.application_no, r.applicant_name, r.email, r.ug_branches, r.eligibility_status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [search, rows]);

  const openAdd = () => {
    setEditingId(null);
    setForm(defaultForm);
    setIsModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      application_no: row.application_no || '',
      applicant_name: row.applicant_name || '',
      caste_name: row.caste_name || '',
      date_of_birth: row.date_of_birth ? String(row.date_of_birth).slice(0, 10) : '',
      email: row.email || '',
      applicant_address: row.applicant_address || '',
      applicant_phone: row.applicant_phone || '',
      advertisement_instance: row.advertisement_instance ? String(row.advertisement_instance).slice(0, 10) : '',
      phd_university: row.phd_university || '',
      phd_reputed_university: row.phd_reputed_university === true ? '1' : row.phd_reputed_university === false ? '0' : '',
      ug_branches: row.ug_branches || '',
      ug_class: row.ug_class || '',
      pg_specialization: row.pg_specialization || '',
      pg_class: row.pg_class || '',
      experience_teaching: row.experience_teaching ?? '',
      experience_research: row.experience_research ?? '',
      experience_industry: row.experience_industry ?? '',
      phd_date: row.phd_date ? String(row.phd_date).slice(0, 10) : '',
      post_phd_experience: row.post_phd_experience ?? '',
      papers_in_SCI: row.papers_in_sci ?? '',
      papers_in_UGC: row.papers_in_ugc ?? '',
      papers_in_AICTE: row.papers_in_aicte ?? '',
      publication: row.publication ?? '',
      remarks: row.remarks || ''
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        papers_in_sci: form.papers_in_SCI,
        papers_in_ugc: form.papers_in_UGC,
        papers_in_aicte: form.papers_in_AICTE
      };

      if (editingId) {
        await updateAssociateProfessorApplication(editingId, payload);
        setNotification({ show: true, message: 'Associate Professor Application updated successfully', type: 'success' });
      } else {
        await createAssociateProfessorApplication(payload);
        setNotification({ show: true, message: 'New Associate Professor Application Added successfully', type: 'success' });
      }

      closeModal();
      await loadRows();
    } catch (error) {
      setNotification({ show: true, message: error?.response?.data?.message || 'Failed to save application', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this application? This action is permanent.')) return;
    try {
      await deleteAssociateProfessorApplication(id);
      setNotification({ show: true, message: 'Associate Professor Application deleted successfully', type: 'success' });
      await loadRows();
    } catch (error) {
      setNotification({ show: true, message: error?.response?.data?.message || 'Failed to delete application', type: 'error' });
    }
  };

  const handleExport = async () => {
    try {
      const response = await exportAssociateProfessorApplications();
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'associate_professor_applications.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setNotification({ show: true, message: error?.response?.data?.message || 'Failed to export', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <SidebarHOD />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Notification show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ show: false, message: '', type: '' })} />

            <div className="mb-12 text-center">
              <h1 className="mb-2 text-4xl font-extrabold text-gray-900">Associate Professor Applications</h1>
              <p className="text-lg text-gray-600">Create, update and manage faculty recruitment applications</p>
            </div>



            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="p-4 rounded border border-blue-200 bg-blue-50"><div className="text-sm text-blue-700">Total Applications</div><div className="text-2xl font-bold text-blue-700">{stats.total}</div></div>
              <div className="p-4 rounded border border-green-200 bg-green-50"><div className="text-sm text-green-700">Eligible</div><div className="text-2xl font-bold text-green-700">{stats.eligible}</div></div>
              <div className="p-4 rounded border border-red-200 bg-red-50"><div className="text-sm text-red-700">Not Eligible</div><div className="text-2xl font-bold text-red-700">{stats.notEligible}</div></div>
              <div className="p-4 rounded border border-indigo-200 bg-indigo-50"><div className="text-sm text-indigo-700">Research Satisfied</div><div className="text-2xl font-bold text-indigo-700">{stats.researchSatisfied}</div></div>
            </div>
            <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-80">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search applications..." className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={openAdd} className="flex items-center justify-center w-full px-6 py-3 font-medium text-white transition-all duration-300 transform rounded-lg shadow-lg bg-blue-600 hover:bg-blue-700 hover:-translate-y-1 hover:scale-105 sm:w-auto" type="button">Add Application</button>
                <button onClick={handleExport} className="flex items-center justify-center w-full px-6 py-3 font-medium text-white transition-all duration-300 transform rounded-lg shadow-lg bg-green-700 hover:bg-green-800 hover:-translate-y-1 hover:scale-105 sm:w-auto" type="button">Export to Excel</button>
              </div>
            </div>
            <div className="mb-10 overflow-hidden bg-white shadow-xl rounded-xl">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-3 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">S.No</th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Application No</th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Email</th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">UG Branches</th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">PG Specialization</th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Applicant Name</th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Date of Birth</th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Caste Name</th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Address / Phone</th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Recruitment Instance</th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">PhD University</th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">PhD Date</th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">PhD Recognized</th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">UG/PG Remarks</th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">PhD Remarks</th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Exp Remarks</th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Research Remarks</th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Eligibility</th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Remarks</th>
                      <th className="px-3 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan="20" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan="20" className="px-6 py-12 text-center text-gray-500">No applications found</td></tr>
                    ) : (
                      paginated.map((row, idx) => (
                        <tr key={row.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors duration-150`}>
                          <td className="px-3 py-2 text-sm font-medium text-gray-900">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                          <td className="px-3 py-2">{row.application_no}</td>
                          <td className="px-3 py-2">{row.email}</td>
                          <td className="px-3 py-2">{row.ug_branches}</td>
                          <td className="px-3 py-2">{row.pg_specialization}</td>
                          <td className="px-3 py-2">{row.applicant_name}</td>
                          <td className="px-3 py-2">{formatDateDMY(row.date_of_birth)}</td>
                          <td className="px-3 py-2">{row.caste_name}</td>
                          <td className="px-3 py-2">{row.applicant_address}{row.applicant_phone ? ` - ${row.applicant_phone}` : ''}</td>
                          <td className="px-3 py-2">{formatDateDMY(row.advertisement_instance)}</td>
                          <td className="px-3 py-2">{row.phd_university}</td>
                          <td className="px-3 py-2">{formatDateDMY(row.phd_date)}</td>
                          <td className="px-3 py-2">{row.phd_reputed_university === true ? 'Yes' : row.phd_reputed_university === false ? 'No' : ''}</td>
                          <td className="px-3 py-2">{renderUgPgRemarks(row)}</td>
                          <td className="px-3 py-2">{renderPhdRemarks(row)}</td>
                          <td className="px-3 py-2">{renderExperienceRemarks(row)}</td>
                          <td className="px-3 py-2">{renderResearchRemarks(row)}</td>
                          <td className="px-3 py-2">{renderEligibilityStatus(row)}</td>
                          <td className="px-3 py-2">{row.remarks}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <button onClick={() => openEdit(row)} className="p-2 text-white transition-colors duration-200 bg-blue-600 rounded-lg hover:bg-blue-700" title="Edit Application" type="button">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button onClick={() => handleDelete(row.id)} className="p-2 text-white transition-colors duration-200 bg-red-600 rounded-lg hover:bg-red-700" title="Delete Application" type="button">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {filtered.length > PAGE_SIZE && (
                <div className="flex justify-end items-center gap-2 px-6 pb-6">
                  <button className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
                  <span className="text-sm text-gray-700">Page {page} of {Math.ceil(filtered.length / PAGE_SIZE)}</span>
                  <button className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50" onClick={() => setPage((p) => Math.min(Math.ceil(filtered.length / PAGE_SIZE), p + 1))} disabled={page === Math.ceil(filtered.length / PAGE_SIZE)}>Next</button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeModal} />
            <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
              <div className="px-6 py-4 bg-blue-600">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium leading-6 text-white">{editingId ? 'Edit Associate Professor Application' : 'Add Associate Professor Application'}</h3>
                  <button className="text-white hover:text-gray-200" onClick={closeModal} type="button">✕</button>
                </div>
              </div>

              <div className="px-6 py-5 bg-white max-h-[75vh] overflow-auto">
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><label className="block mb-2 text-sm font-medium text-gray-700">Application No *</label><input name="application_no" value={form.application_no} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required /></div>
                    <div><label className="block mb-2 text-sm font-medium text-gray-700">Applicant Name *</label><input name="applicant_name" value={form.applicant_name} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required /></div>
                    <div><label className="block mb-2 text-sm font-medium text-gray-700">Caste Name</label><input name="caste_name" value={form.caste_name} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                    <div><label className="block mb-2 text-sm font-medium text-gray-700">Date of Birth</label><input type="date" name="date_of_birth" value={form.date_of_birth} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                    <div><label className="block mb-2 text-sm font-medium text-gray-700">Email *</label><input name="email" value={form.email} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required /></div>
                    <div><label className="block mb-2 text-sm font-medium text-gray-700">Applicant Phone *</label><input name="applicant_phone" value={form.applicant_phone} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required /></div>
                    <div className="md:col-span-2"><label className="block mb-2 text-sm font-medium text-gray-700">Applicant Address *</label><textarea name="applicant_address" value={form.applicant_address} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" rows="2" required /></div>
                    <div><label className="block mb-2 text-sm font-medium text-gray-700">Advertisement Instance *</label><input type="date" name="advertisement_instance" value={form.advertisement_instance} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required /></div>
                    <div><label className="block mb-2 text-sm font-medium text-gray-700">PhD University</label><input name="phd_university" value={form.phd_university} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                    <div><label className="block mb-2 text-sm font-medium text-gray-700">PhD from recognized university</label><select name="phd_reputed_university" value={form.phd_reputed_university} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"><option value="">Select</option><option value="1">Yes</option><option value="0">No</option></select></div>
                    <div><label className="block mb-2 text-sm font-medium text-gray-700">UG Branches</label><select name="ug_branches" value={form.ug_branches} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"><option value="">Select</option>{ugBranchOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                    <div><label className="block mb-2 text-sm font-medium text-gray-700">UG Class Obtained</label><select name="ug_class" value={form.ug_class} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"><option value="">Select</option><option value="F">First</option><option value="S">Second</option><option value="T">Third</option></select></div>
                    <div><label className="block mb-2 text-sm font-medium text-gray-700">PG Specialization</label><input name="pg_specialization" value={form.pg_specialization} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                    <div><label className="block mb-2 text-sm font-medium text-gray-700">PG Class Obtained</label><select name="pg_class" value={form.pg_class} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"><option value="">Select</option><option value="F">First</option><option value="S">Second</option><option value="T">Third</option></select></div>
                    <div><label className="block mb-2 text-sm font-medium text-gray-700">Teaching Experience (Years)</label><input type="number" step="0.01" name="experience_teaching" value={form.experience_teaching} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                    <div><label className="block mb-2 text-sm font-medium text-gray-700">Research Experience (Years)</label><input type="number" step="0.01" name="experience_research" value={form.experience_research} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                    <div><label className="block mb-2 text-sm font-medium text-gray-700">Industry Experience (Years)</label><input type="number" step="0.01" name="experience_industry" value={form.experience_industry} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                    <div><label className="block mb-2 text-sm font-medium text-gray-700">PhD Completion Date</label><input type="date" name="phd_date" value={form.phd_date} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                    <div><label className="block mb-2 text-sm font-medium text-gray-700">Post PhD Experience (Years)</label><input name="post_phd_experience" value={form.post_phd_experience} className="block w-full px-4 py-3 border border-gray-300 rounded-lg bg-slate-100" readOnly /></div>
                    <div><label className="block mb-2 text-sm font-medium text-gray-700">Research Papers in SCI/SCI-E</label><input type="number" name="papers_in_SCI" value={form.papers_in_SCI} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                    <div><label className="block mb-2 text-sm font-medium text-gray-700">Research Papers in UGC</label><input type="number" name="papers_in_UGC" value={form.papers_in_UGC} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                    <div><label className="block mb-2 text-sm font-medium text-gray-700">Research Papers in SCOPUS</label><input type="number" name="papers_in_AICTE" value={form.papers_in_AICTE} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                    <div><label className="block mb-2 text-sm font-medium text-gray-700">Publication</label><input type="number" name="publication" value={form.publication} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                    <div className="md:col-span-2"><label className="block mb-2 text-sm font-medium text-gray-700">Remarks *</label><textarea name="remarks" value={form.remarks} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" rows="2" required /></div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <button type="button" onClick={closeModal} className="inline-flex justify-center px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={submitting} className="inline-flex justify-center px-6 py-3 text-sm font-medium text-white border border-transparent rounded-lg shadow-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60">{submitting ? 'Saving...' : editingId ? 'Update Application' : 'Create Application'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
