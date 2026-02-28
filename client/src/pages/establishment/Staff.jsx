import { useEffect, useMemo, useState } from 'react';
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
  gcr: ''
};

const LOCAL_STAFF_KEY = 'gitoffice_staff_rows';

export default function StaffPage() {
  const { token } = useAuth?.() || {};
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const [departments, setDepartments] = useState([]);
  const [associations, setAssociations] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [religions, setReligions] = useState([]);
  const [castes, setCastes] = useState([]);

  useEffect(() => {
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
    date.setFullYear(date.getFullYear() + 58);
    return date.toISOString().slice(0, 10);
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

    for (const [key, message] of required) {
      if (!String(form[key] || '').trim()) {
        return message;
      }
    }

    if (form.pay_type === 'Fixed' && !String(form.fixed_pay || '').trim()) {
      return 'Fixed pay is required for Fixed pay type';
    }

    if (!/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(form.emailUser)) {
      return 'Enter a valid email username (before @git.edu)';
    }

    if (!/^\d{2,10}$/.test(form.biometric_code)) {
      return 'Biometric employee code must be 2 to 10 digits';
    }

    if (rows.some((row) => row.email === `${form.emailUser}@git.edu`)) {
      return 'Email already exists in staff list';
    }

    return '';
  };

  const onSubmit = (event) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

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
      formData: {
        ...form,
        date_of_superannuation: form.date_of_superannuation || computeSuperannuationDate(form.dob)
      },
      created_at: new Date().toISOString()
    };

    setRows((previous) => [newRow, ...previous]);
    showNotification('Staff added successfully', 'success');
    closeModal();
  };

  const onDelete = (rowId, rowName) => {
    const confirmed = window.confirm(`Delete staff \"${rowName}\"?`);
    if (!confirmed) {
      return;
    }

    setRows((previous) => previous.filter((row) => row.id !== rowId));
    showNotification('Staff deleted successfully', 'success');
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

            <div className="mb-10 text-center">
              <h1 className="mb-2 text-4xl font-extrabold text-gray-900">Staff</h1>
              <p className="text-lg text-gray-600">Create, filter and manage staff details</p>
            </div>

            <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:w-80">
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

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => showNotification('Generate Statistics is not connected yet.', 'info')}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                  Generate Statistics
                </button>
                <button
                  type="button"
                  onClick={() => showNotification('Staff Filter page is not connected yet.', 'info')}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                >
                  Staff Filter
                </button>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Add Staff
                </button>
              </div>
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
                      filteredRows.map((row, index) => (
                        <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 text-sm text-gray-900">{index + 1}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{row.employee_type}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{row.department_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{row.designation_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{row.association_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => showNotification(`Staff: ${row.name} (${row.email})`, 'info')}
                                className="px-3 py-1 text-xs font-medium text-white bg-slate-700 rounded-md hover:bg-slate-800"
                              >
                                View
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
              </div>

              <form onSubmit={onSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                {error && <div className="p-3 text-sm text-red-700 border border-red-200 rounded bg-red-50">{error}</div>}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                  <InputField
                    label="Email *"
                    value={form.emailUser}
                    onChange={(value) => setForm({ ...form, emailUser: value.toLowerCase().replace(/[^a-z0-9._-]/g, '') })}
                    suffix="@git.edu"
                  />
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
                    onChange={(value) => setForm({ ...form, associations_id: value })}
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
                    onChange={(value) => setForm({ ...form, designations_id: value })}
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
                    <InputField
                      label="Payscale"
                      value={form.payscale}
                      onChange={(value) => setForm({ ...form, payscale: value })}
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
