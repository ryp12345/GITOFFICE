import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import Notification from '../../components/common/Notification';
import { useAuth } from '../../context/AuthContext';
import { getDepartments } from '../../api/departmentApi';
import { getAssociations } from '../../api/associationApi';
import { getInstitutions } from '../../api/institutionApi';
import { getDesignations } from '../../api/designationApi';
import { getReligions } from '../../api/religionApi';
import { getCasteCategories } from '../../api/casteCategoryApi';
import api from '../../api/axios';

const initialForm = {
  fname: '',
  mname: '',
  lname: '',
  employee_type: 'Teaching',
  emailUser: '',
  biometric_code: '',
  departments_id: '',
  associations_id: '',
  institution_id: '',
  designations_id: '',
  pay_type: '',
  fixed_pay: '',
  payscale: '',
  religion_id: '',
  castecategory_id: '',
  gender: 'female',
  dob: '',
  doj: '',
  date_of_superannuation: '',
  bloodgroup: '',
  pan_card: '',
  adhar_card: '',
  contactno: '',
  local_address: '',
  permanent_address: '',
  emergency_no: '',
  emergency_name: '',
  gcr: '',
  duration: ''
};

const LOCAL_STAFF_KEY = 'gitoffice_staff_rows';

export default function StaffPage() {
  const { token } = useAuth?.() || {};
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [emailChecked, setEmailChecked] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');

  const [departments, setDepartments] = useState([]);
  const [associations, setAssociations] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [religions, setReligions] = useState([]);
  const [castes, setCastes] = useState([]);
  const [payscaleOptions, setPayscaleOptions] = useState([]);

  useEffect(() => {
    // fetch payscales when pay_type/designation/employee_type change
    const fetchPayscales = async () => {
      if (!token) return;
      const pt = form.pay_type;
      if (!pt || pt === 'Fixed') {
        setPayscaleOptions([]);
        return;
      }

      try {
        const res = await api.get('/staff/getstaffpay_list', { params: { pay_type: pt, emp_type: form.employee_type, designation_id: form.designations_id } });
        const data = res?.data || [];
        // normalize to array
        setPayscaleOptions(Array.isArray(data) ? data : []);
      } catch (err) {
        setPayscaleOptions([]);
      }
    };

    fetchPayscales();
  }, [form.pay_type, form.designations_id, form.employee_type, token]);
  useEffect(() => {
    // Only load local rows when not authenticated (token absent).
    if (token) return;
    const savedRows = localStorage.getItem(LOCAL_STAFF_KEY);
    if (savedRows) {
      try {
        const parsed = JSON.parse(savedRows);
        setRows(Array.isArray(parsed) ? parsed : []);
      } catch (_error) {
        setRows([]);
      }
    }
  }, []);

  useEffect(() => {
    // When token is available, fetch staff list from backend
    const fetchRemoteRows = async () => {
      if (!token) return;
      setLoading(true);
      try {
        let localDepartments = departments;
        let localAssociations = associations;
        let localInstitutions = institutions;
        let localDesignations = designations;
        let localReligions = religions;
        let localCastes = castes;

        if (!departments.length || !associations.length || !institutions.length || !designations.length || !religions.length || !castes.length) {
          try {
            const [deptRes, assoRes, instRes, desigRes, relRes, casteRes] = await Promise.all([
              getDepartments(token),
              getAssociations(token),
              getInstitutions(token),
              getDesignations(token),
              getReligions(token),
              getCasteCategories(token)
            ]);

            const normalize = (res) => {
              const data = res?.data?.data || res?.data || [];
              return Array.isArray(data) ? data : [];
            };

            localDepartments = normalize(deptRes);
            localAssociations = normalize(assoRes);
            localInstitutions = normalize(instRes);
            localDesignations = normalize(desigRes);
            localReligions = normalize(relRes);
            localCastes = normalize(casteRes);

            setDepartments(localDepartments);
            setAssociations(localAssociations);
            setInstitutions(localInstitutions);
            setDesignations(localDesignations);
            setReligions(localReligions);
            setCastes(localCastes);
          } catch (_err) {
            // ignore reference load errors - we'll still try to fetch staff
          }
        }

        const res = await api.get('/staff');
        const data = res?.data?.data || [];
        // Map backend staff rows to table row shape (best-effort) using local reference arrays
        const mapped = Array.isArray(data)
          ? data.map((r) => {
              const name = `${r.fname || ''} ${r.mname || ''} ${r.lname || ''}`.replace(/\s+/g, ' ').trim();

              const getPivotFirst = (record, paths, keys) => {
                for (const p of paths) {
                  const val = record?.[p];
                  if (Array.isArray(val) && val.length) {
                    for (const k of keys) if (val[0]?.[k]) return val[0][k];
                  }
                  if (val && typeof val === 'object') {
                    for (const k of keys) if (val[k]) return val[k];
                  }
                }
                return null;
              };

              const deptLookup = getNameById(localDepartments, r.departments_id || r.department_id || r.dept_id || r.department || r.department_name || '', 'dept_name');
              const pivotDept = getPivotFirst(r, ['departments', 'department_staff', 'department'], ['dept_name', 'name', 'department_name']);
              const department_name = deptLookup !== '-' ? deptLookup : pivotDept || r.department_name || r.dept_name || r.department || '-';

              const desigLookup = getNameById(localDesignations, r.designations_id || r.designation_id || r.designation || r.design_name || '', 'design_name');
              const pivotDesig = getPivotFirst(r, ['designations', 'designation_staff', 'designation'], ['design_name', 'name', 'designation_name']);
              const designation_name = desigLookup !== '-' ? desigLookup : pivotDesig || r.designation_name || r.design_name || r.designation || '-';

              const assoLookup = getNameById(localAssociations, r.associations_id || r.association_id || r.association || r.asso_name || '', 'asso_name');
              const pivotAsso = getPivotFirst(r, ['associations', 'association_staff', 'association'], ['asso_name', 'name', 'association_name']);
              const association_name = assoLookup !== '-' ? assoLookup : pivotAsso || r.association_name || r.asso_name || r.association || '-';

              const institution_name = r.institution_name || r.institution || r.inst_name || r.name || '';

              return {
                id: r.id,
                name,
                employee_type: r.employee_type || r.emp_type || (r.emp_type_name || '-') ,
                department_name,
                designation_name,
                association_name,
                institution_name: institution_name || '-',
                email: r.email || (r.emailUser ? `${r.emailUser}@git.edu` : ''),
                pay_type: r.pay_type || '',
                fixed_pay: r.fixed_pay || '',
                payscale: r.payscale || '',
                gender: r.gender || '',
                status: r.status || 'active',
                formData: r,
                created_at: r.created_at || ''
              };
            })
          : [];

        setRows(mapped);
      } catch (err) {
        // fallback to local storage if remote fails
        const savedRows = localStorage.getItem(LOCAL_STAFF_KEY);
        if (savedRows) {
          try {
            const parsed = JSON.parse(savedRows);
            setRows(Array.isArray(parsed) ? parsed : []);
          } catch (_error) {
            setRows([]);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRemoteRows();
  }, [token]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STAFF_KEY, JSON.stringify(rows));
  }, [rows]);

  useEffect(() => {
    const loadReferenceData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [deptRes, assoRes, instRes, desigRes, relRes, casteRes] = await Promise.all([
          getDepartments(token),
          getAssociations(token),
          getInstitutions(token),
          getDesignations(token),
          getReligions(token),
          getCasteCategories(token)
        ]);

        const normalize = (res) => {
          const data = res?.data?.data || res?.data || [];
          return Array.isArray(data) ? data : [];
        };

        setDepartments(normalize(deptRes));
        setAssociations(normalize(assoRes));
        setInstitutions(normalize(instRes));
        setDesignations(normalize(desigRes));
        setReligions(normalize(relRes));
        setCastes(normalize(casteRes));
      } catch (_error) {
        showNotification('Reference data failed to load. You can still add manual staff entries.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadReferenceData();
  }, [token]);

  // When religion changes, fetch caste categories for that religion (mirrors blade AJAX)
  useEffect(() => {
    const fetchCastes = async () => {
      if (!token || !form.religion_id) return;
      try {
        const res = await getCasteCategories(token, form.religion_id);
        const data = res?.data?.data || res?.data || [];
        setCastes(Array.isArray(data) ? data : []);
      } catch (err) {
        // keep existing castes on error
      }
    };
    fetchCastes();
  }, [form.religion_id, token]);

  // Show hint when email has been modified and is unchecked
  useEffect(() => {
    if (!form.emailUser) {
      setEmailStatus('');
      setEmailChecked(false);
      return;
    }
    if (!emailChecked) {
      setEmailStatus('Email has been modified. Please check again.');
    }
  }, [form.emailUser, emailChecked]);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3500);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm(initialForm);
    setError('');
  };

  const getNameById = (list, id, key) => list.find((item) => String(item.id) === String(id))?.[key] || '-';

  const computeSuperannuationDate = (dob) => {
    if (!dob) return '';
    const date = new Date(dob);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear() + 58;
    const month = date.getMonth() + 1;
    const newDoS = new Date(year, month, 0);
    return newDoS.toISOString().slice(0, 10);
  };

  const validate = () => {
    const required = [
      ['fname', 'First name is required'],
      ['mname', 'Middle name is required'],
      ['lname', 'Last name is required'],
      ['employee_type', 'Employee type is required'],
      ['emailUser', 'Email is required'],
      ['biometric_code', 'Biometric employee code is required'],
      ['departments_id', 'Department is required'],
      ['associations_id', 'Association is required'],
      ['institution_id', 'Institution is required'],
      ['designations_id', 'Designation is required'],
      ['religion_id', 'Religion is required'],
      ['castecategory_id', 'Caste category is required'],
      ['gender', 'Gender is required'],
      ['dob', 'Date of birth is required'],
      ['doj', 'Date of joining is required'],
      ['local_address', 'Local address is required'],
      ['permanent_address', 'Permanent address is required'],
      ['pay_type', 'Pay type is required']
    ];
    // If association is contractual (id 4 in original blade) require duration
    if (Number(form.associations_id) === 4) {
      required.push(['duration', 'Duration is required for contractual association']);
    }

    for (const [key, message] of required) {
      if (!String(form[key] || '').trim()) {
        return message;
      }
    }

    if (form.pay_type === 'Fixed' && !String(form.fixed_pay || '').trim()) {
      return 'Fixed pay is required for Fixed pay type';
    }

    // Follow the Blade validation: biometric 2-4 digits (not stricter)
    if (!/^\d{2,4}$/.test(form.biometric_code)) {
      return 'Biometric employee code must be 2 to 4 digits';
    }

    // Email format/duplicates are checked via availability check (server) like Blade.
    if (!emailChecked) {
      return 'Please check email availability before submitting';
    }

    return '';
  };

  const checkEmailAvailability = async () => {
    const emailUser = (form.emailUser || '').trim();
    const firstName = (form.fname || '').trim().toLowerCase();
    const lastName = (form.lname || '').trim().toLowerCase();

    if (!emailUser || !firstName || !lastName) {
      setEmailStatus('Enter first name, last name and email before checking');
      setEmailChecked(false);
      return;
    }

    if (emailUser.includes('@')) {
      setEmailStatus("@ is found, kindly change the email format.");
      setEmailChecked(false);
      return;
    }

    if (emailUser === firstName) {
      setEmailStatus('Email contains only the first name. Please modify.');
      setEmailChecked(false);
      return;
    }

    if (emailUser === lastName) {
      setEmailStatus('Email contains only the last name. Please modify.');
      setEmailChecked(false);
      return;
    }

    if (!/[a-zA-Z]/.test(emailUser)) {
      setEmailStatus('Email cannot be composed of digits only. Please include letters.');
      setEmailChecked(false);
      return;
    }

    setCheckingEmail(true);
    setEmailStatus('');
    try {
      // Use axios `api` so request goes to configured backend baseURL (avoids client-origin fetch)
      const res = await api.get('/staff/checkemailid', { params: { current_email: emailUser } });
      const taken = Array.isArray(res.data) ? res.data.length > 0 : Boolean(res.data && Object.keys(res.data).length);
      if (taken) {
        setEmailChecked(false);
        setEmailStatus('Email Found! Kindly change the email ID');
      } else {
        setEmailChecked(true);
        setEmailStatus('Email is available');
      }
    } catch (err) {
      setEmailChecked(false);
      setEmailStatus('Email check failed (network).');
    } finally {
      setCheckingEmail(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      emailUser: form.emailUser,
      fname: form.fname,
      mname: form.mname,
      lname: form.lname,
      employee_type: form.employee_type,
      biometric_code: form.biometric_code,
      departments_id: form.departments_id,
      associations_id: form.associations_id,
      institution_id: form.institution_id,
      designations_id: form.designations_id,
      pay_type: form.pay_type,
      fixed_pay: form.fixed_pay,
      payscale: form.payscale,
      religion_id: form.religion_id,
      castecategory_id: form.castecategory_id,
      gender: form.gender,
      dob: form.dob,
      doj: form.doj,
      date_of_superanuation: form.date_of_superannuation || computeSuperannuationDate(form.dob),
      bloodgroup: form.bloodgroup,
      pan_card: form.pan_card,
      adhar_card: form.adhar_card,
      contactno: form.contactno,
      local_address: form.local_address,
      permanent_address: form.permanent_address,
      emergency_no: form.emergency_no,
      emergency_name: form.emergency_name,
      gcr: form.gcr,
      duration: form.duration
    };

    if (token) {
      try {
        setLoading(true);
        const res = await api.post('/staff', payload);
        const created = res?.data?.data || {};
        const newRow = {
          id: created.staff?.id || Date.now(),
          name: `${form.fname} ${form.mname} ${form.lname}`.replace(/\s+/g, ' ').trim(),
          employee_type: form.employee_type,
          email: `${form.emailUser}@git.edu`,
          department_name: getNameById(departments, form.departments_id, 'dept_name'),
          designation_name: getNameById(designations, form.designations_id, 'design_name'),
          association_name: getNameById(associations, form.associations_id, 'asso_name'),
          institution_name: getNameById(institutions, form.institution_id, 'name'),
          pay_type: form.pay_type,
          fixed_pay: form.fixed_pay,
          payscale: form.payscale,
          gender: form.gender,
          status: 'active',
          formData: { ...form, date_of_superanuation: payload.date_of_superannuation },
          created_at: created.staff?.created_at || new Date().toISOString()
        };

        setRows((previous) => [newRow, ...previous]);
        showNotification('Staff added successfully', 'success');
        closeModal();
      } catch (err) {
        const msg = err?.response?.data?.message || err.message || 'Failed to create staff';
        setError(msg);
      } finally {
        setLoading(false);
      }
    } else {
      // fallback to local-only add when token/backend not available
      const newRow = {
        id: Date.now(),
        name: `${form.fname} ${form.mname} ${form.lname}`.replace(/\s+/g, ' ').trim(),
        employee_type: form.employee_type,
        email: `${form.emailUser}@git.edu`,
        department_name: getNameById(departments, form.departments_id, 'dept_name'),
        designation_name: getNameById(designations, form.designations_id, 'design_name'),
        association_name: getNameById(associations, form.associations_id, 'asso_name'),
        institution_name: getNameById(institutions, form.institution_id, 'name'),
        pay_type: form.pay_type,
        fixed_pay: form.fixed_pay,
        payscale: form.payscale,
        gender: form.gender,
        status: 'active',
        formData: { ...form, date_of_superanuation: payload.date_of_superannuation },
        created_at: new Date().toISOString()
      };

      setRows((previous) => [newRow, ...previous]);
      showNotification('Staff added locally (no backend)', 'info');
      closeModal();
    }
  };

  const onDelete = async (rowId, rowName) => {
    const confirmed = window.confirm(`Delete staff \"${rowName}\"?`);
    if (!confirmed) return;

    // If not authenticated, operate on local state only
    if (!token) {
      setRows((previous) => previous.filter((row) => String(row.id) !== String(rowId)));
      showNotification('Staff deleted locally', 'success');
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/staff/${rowId}`);
      setRows((previous) => previous.filter((row) => String(row.id) !== String(rowId)));
      showNotification('Staff deleted successfully', 'success');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err.message || 'Failed to delete staff';
      showNotification(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    const query = search.toLowerCase();
    return rows.filter((row) => {
      return (
        row.name?.toLowerCase().includes(query) ||
        row.employee_type?.toLowerCase().includes(query) ||
        row.department_name?.toLowerCase().includes(query) ||
        row.designation_name?.toLowerCase().includes(query) ||
        row.association_name?.toLowerCase().includes(query)
      );
    });
  }, [rows, search]);

  // Pagination (mirror Departments page)
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  useEffect(() => { setPage(1); }, [search, rows]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Notification
              show={notification.show}
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification({ show: false, message: '', type: 'success' })}
            />

            <div className="mb-12 text-center">
              <h1 className="mb-2 text-4xl font-extrabold text-gray-900">Staff</h1>
              <p className="text-lg text-gray-600">Create, update and manage staff</p>
            </div>

            <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-72">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search staff..."
                  className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center w-full px-6 py-3 font-medium text-white transition-all duration-300 transform rounded-lg shadow-lg bg-blue-600 hover:bg-blue-700 hover:-translate-y-1 hover:scale-105 sm:w-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                Add Staff
              </button>
            </div>

            <div className="overflow-hidden bg-white shadow-xl rounded-xl">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">S.No</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Staff Name</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Employee Type</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Department</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Designation</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Association</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-10 text-center text-gray-500">Loading...</td>
                      </tr>
                    ) : filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-10 text-center text-gray-500">No staff added.</td>
                      </tr>
                    ) : (
                      paginatedRows.map((row, idx) => (
                        <tr key={row.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors duration-150`}>
                          <td className="px-6 py-4 text-sm text-gray-900">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{row.employee_type}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{row.department_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{row.designation_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{row.association_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/establishment/staff/${row.id}`)}
                                className="p-2 text-blue-600 transition-colors duration-200 bg-white rounded-lg hover:bg-blue-100 border border-blue-300"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => onDelete(row.id, row.name)}
                                className="inline-flex items-center justify-center w-8 h-8 text-white bg-red-600 rounded-md hover:bg-red-700"
                                title="Delete"
                                aria-label="Delete"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                  <path d="M7 4V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V4H22V6H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V6H2V4H7ZM6 6V20H18V6H6ZM9 9H11V17H9V9ZM13 9H15V17H13V9ZM9 4H15V3H9V4Z" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
               {/* Pagination Controls */}
            {filteredRows.length > PAGE_SIZE && (
              <div className="flex justify-end items-center gap-2 px-6 pb-6">
                <button
                  className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Prev
                </button>
                <span className="text-sm text-gray-700">
                  Page {page} of {Math.ceil(filteredRows.length / PAGE_SIZE)}
                </span>
                <button
                  className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                  onClick={() => setPage(p => Math.min(Math.ceil(filteredRows.length / PAGE_SIZE), p + 1))}
                  disabled={page === Math.ceil(filteredRows.length / PAGE_SIZE)}
                >
                  Next
                </button>
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

            <div className="inline-block w-full max-w-6xl p-0 my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">
              <div className="px-6 py-4 bg-blue-600">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">Add New Staff</h3>
                  <button type="button" onClick={closeModal} className="text-white hover:text-slate-200">✕</button>
                </div>

                {/* duration will be displayed inside the form (below selects) */}
              </div>

              <form onSubmit={onSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                {error && <div className="p-3 text-sm text-red-700 border border-red-200 rounded bg-red-50">{error}</div>}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <InputField label="First Name *" value={form.fname} onChange={(value) => setForm({ ...form, fname: value })} />
                  <InputField label="Middle Name *" value={form.mname} onChange={(value) => setForm({ ...form, mname: value })} />
                  <InputField label="Last Name *" value={form.lname} onChange={(value) => setForm({ ...form, lname: value })} />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <SelectField
                    label="Employee Type *"
                    value={form.employee_type}
                    onChange={(value) => setForm({ ...form, employee_type: value, pay_type: '', fixed_pay: '', payscale: '' })}
                    options={[
                      { value: 'Teaching', label: 'Teaching' },
                      { value: 'Non-Teaching', label: 'Non-Teaching' }
                    ]}
                  />
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Email *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={form.emailUser}
                        onChange={(e) => { setForm({ ...form, emailUser: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') }); setEmailChecked(false); setEmailStatus('Email has been modified. Please check again.'); }}
                        placeholder="youremail"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="px-3 py-2 text-sm text-gray-600 bg-gray-100 border border-l-0 border-gray-300 rounded-lg">@git.edu</span>
                      <button
                        type="button"
                        onClick={checkEmailAvailability}
                        disabled={checkingEmail}
                        className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                      >
                        {checkingEmail ? 'Checking...' : 'Check'}
                      </button>
                    </div>
                    {emailStatus && (
                      <div className={`mt-1 text-sm ${emailStatus.toLowerCase().includes('available') ? 'text-green-700' : 'text-red-700'}`}>
                        {emailStatus}
                      </div>
                    )}
                  </div>
                  <InputField
                    label="Biometric Employee Code *"
                    value={form.biometric_code}
                    onChange={(value) => setForm({ ...form, biometric_code: value.replace(/\D/g, '') })}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <SelectField
                    label="Department *"
                    value={form.departments_id}
                    onChange={(value) => setForm({ ...form, departments_id: value })}
                    options={departments.map((item) => ({ value: String(item.id), label: item.dept_name }))}
                  />
                  <SelectField
                    label="Association *"
                    value={form.associations_id}
                    onChange={(value) => setForm((prev) => ({ ...prev, associations_id: value, duration: Number(value) === 4 ? prev.duration : '' }))}
                    options={associations.map((item) => ({ value: String(item.id), label: item.asso_name }))}
                  />
                  <SelectField
                    label="Institution *"
                    value={form.institution_id}
                    onChange={(value) => setForm({ ...form, institution_id: value })}
                    options={institutions.map((item) => ({ value: String(item.id), label: item.name }))}
                  />
                  <SelectField
                    label="Designation *"
                    value={form.designations_id}
                    onChange={(value) => setForm({ ...form, designations_id: value, pay_type: '', fixed_pay: '', payscale: '' })}
                    options={designations
                      .filter((item) => !form.employee_type || item.emp_type === form.employee_type || item.emp_type === '0')
                      .map((item) => ({ value: String(item.id), label: item.design_name }))}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Pay Type *</label>
                    <div className="flex flex-wrap items-center gap-5 pt-2">
                      {(form.employee_type === 'Teaching' ? ['Payscale', 'Fixed'] : ['Consolidated', 'Payscale', 'Fixed']).map((type) => (
                        <label key={type} className="inline-flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="radio"
                            name="pay_type"
                            value={type}
                            checked={form.pay_type === type}
                            onChange={(event) => setForm({ ...form, pay_type: event.target.value, fixed_pay: '', payscale: '' })}
                          />
                          {type}
                        </label>
                      ))}
                    </div>
                  </div>
                  {form.pay_type === 'Fixed' ? (
                    <InputField
                      label="Fixed Pay *"
                      value={form.fixed_pay}
                      onChange={(value) => setForm({ ...form, fixed_pay: value.replace(/[^\d.]/g, '') })}
                    />
                  ) : (
                    <SelectField
                      label="Payscale"
                      value={form.payscale}
                      onChange={(value) => setForm({ ...form, payscale: value })}
                      options={payscaleOptions.map((p) => ({ value: String(p.id), label: p.payscale_title || p.title || (p.basepay ? `${p.basepay}` : String(p.id)) }))}
                    />
                  )}
                  <SelectField
                    label="Gender *"
                    value={form.gender}
                    onChange={(value) => setForm({ ...form, gender: value })}
                    options={[
                      { value: 'female', label: 'Female' },
                      { value: 'male', label: 'Male' },
                      { value: 'others', label: 'Others' }
                    ]}
                  />
                  {Number(form.associations_id) === 4 && (
                    <InputField
                      label="Duration"
                      value={form.duration}
                      onChange={(value) => setForm({ ...form, duration: value })}
                      placeholder="Duration (e.g., 2 years)"
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <SelectField
                    label="Religion *"
                    value={form.religion_id}
                    onChange={(value) => setForm({ ...form, religion_id: value, castecategory_id: '' })}
                    options={religions.map((item) => ({ value: String(item.id), label: item.religion_name }))}
                  />
                  <SelectField
                    label="Caste Category *"
                    value={form.castecategory_id}
                    onChange={(value) => setForm({ ...form, castecategory_id: value })}
                    options={castes
                      .filter((item) => !form.religion_id || String(item.religion_id) === String(form.religion_id))
                      .map((item) => ({
                        value: String(item.id),
                        label: [item.caste_name, item.subcastes_name, item.category, item.category_no].filter(Boolean).join(' - ')
                      }))}
                  />
                  <InputField
                    type="date"
                    label="Date of Birth *"
                    value={form.dob}
                    onChange={(value) => setForm({ ...form, dob: value, date_of_superannuation: computeSuperannuationDate(value) })}
                  />
                  <InputField
                    type="date"
                    label="Date of Joining *"
                    value={form.doj}
                    onChange={(value) => setForm({ ...form, doj: value })}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <InputField
                    type="date"
                    label="Date of Superannuation"
                    value={form.date_of_superannuation}
                    onChange={(value) => setForm({ ...form, date_of_superannuation: value })}
                  />
                  <SelectField
                    label="Blood Group"
                    value={form.bloodgroup}
                    onChange={(value) => setForm({ ...form, bloodgroup: value })}
                    options={[
                      { value: 'A+', label: 'A+' },
                      { value: 'A-', label: 'A-' },
                      { value: 'B+', label: 'B+' },
                      { value: 'B-', label: 'B-' },
                      { value: 'AB+', label: 'AB+' },
                      { value: 'AB-', label: 'AB-' },
                      { value: 'O+', label: 'O+' },
                      { value: 'O-', label: 'O-' }
                    ]}
                  />
                  <InputField label="PAN Card" value={form.pan_card} onChange={(value) => setForm({ ...form, pan_card: value.toUpperCase() })} />
                  <InputField label="Aadhaar Card" value={form.adhar_card} onChange={(value) => setForm({ ...form, adhar_card: value.replace(/\D/g, '') })} />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <InputField label="Contact No" value={form.contactno} onChange={(value) => setForm({ ...form, contactno: value.replace(/\D/g, '') })} />
                  <InputField label="Emergency No" value={form.emergency_no} onChange={(value) => setForm({ ...form, emergency_no: value.replace(/\D/g, '') })} />
                  <InputField label="Emergency Name" value={form.emergency_name} onChange={(value) => setForm({ ...form, emergency_name: value })} />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <InputField label="Local Address *" value={form.local_address} onChange={(value) => setForm({ ...form, local_address: value })} />
                  <InputField label="Permanent Address *" value={form.permanent_address} onChange={(value) => setForm({ ...form, permanent_address: value })} />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <InputField label="GC Resolution No" value={form.gcr} onChange={(value) => setForm({ ...form, gcr: value })} />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    Close
                  </button>
                  <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, suffix, type = 'text' }) {
  return (
    <div>
      <label className="block mb-2 text-sm font-medium text-gray-700">{label}</label>
      <div className="flex">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${suffix ? 'rounded-r-none' : ''}`}
        />
        {suffix && <span className="px-3 py-2 text-sm text-gray-600 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">{suffix}</span>}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block mb-2 text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
