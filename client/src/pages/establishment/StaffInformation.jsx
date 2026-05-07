
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import { getDepartments } from '../../api/departmentApi';
import { getAssociations } from '../../api/associationApi';
import { getDesignations } from '../../api/designationApi';
import { getReligions } from '../../api/religionApi';
import { getCasteCategories } from '../../api/casteCategoryApi';
import { getFilteredStaff } from '../../api/staffApi';
import api from '../../api/axios';

export default function StaffInformation() {
  const renderCell = (v) => {
    if (v === null || v === undefined || v === '') return '-';
    if (Array.isArray(v)) {
      return v
        .map(item => {
          if (item === null || item === undefined) return '';
          if (typeof item === 'string') return item;
          if (typeof item === 'object') return item.design_name || item.name || item.designation || JSON.stringify(item);
          return String(item);
        })
        .filter(Boolean)
        .join(', ');
    }
    if (typeof v === 'object') {
      return v.design_name || v.name || v.designation || JSON.stringify(v);
    }
    return String(v);
  };

  const formatDateDMY = (value) => {
    if (!value) return '-';
    // Accept YYYY-MM-DD strings directly
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-');
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const m = Number(month) - 1;
      if (m < 0 || m > 11) return '-';
      return `${day}-${monthNames[m]}-${year}`;
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2,'0');
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDesignations = (v) => {
    if (!v) return '-';
    if (Array.isArray(v)) {
      const names = v.map(item => {
        if (!item) return '';
        if (typeof item === 'string') return item.trim();
        if (typeof item === 'object') {
          // Only include active designations when status exists
          if (item.status && item.status !== 'active') return '';
          return item.design_name || item.name || '';
        }
        return String(item);
      }).filter(Boolean);
      return [...new Set(names)].join(', ');
    }
    if (typeof v === 'string') {
      const parts = v.split(/,|;/).map(s => s.trim()).filter(Boolean);
      return [...new Set(parts)].join(', ');
    }
    if (typeof v === 'object') {
      if (v.status && v.status !== 'active') return '-';
      return v.design_name || v.name || JSON.stringify(v);
    }
    return String(v);
  };
  // Export to Excel handler
  const handleExportExcel = () => {
    const exportData = filteredRows.map((row, idx) => ({
      'S.No': idx + 1,
      'Staff Name': renderCell([row.fname, row.mname, row.lname].filter(Boolean).join(' ')),
      'Employee Type': renderCell(row.employee_type),
      'Department': renderCell(row.departments_list || row.departments),
      'Association': renderCell(row.asso_name || row.associations),
      'Religion': renderCell(row.religion_name),
      'Designation': formatDesignations(row.designations_list || row.designations),
      'Qualification': renderCell(row.qual_name),
      'Gender': renderCell(row.gender),
      'Date of Birth': formatDateDMY(row.dob),
      'Date of Joining': formatDateDMY(row.doj),
      'Date Of Superannuation': formatDateDMY(row.date_of_superanuation || row.date_of_superannuation),
      'Date Of Confirmation': formatDateDMY(row.date_of_confirmation),
      'Date Of Increment': formatDateDMY(row.date_of_increment),
      'Blood Group': renderCell(row.bloodgroup),
      'PAN Card No': renderCell(row.pan_card),
      'Adhar Card No': renderCell(row.adhar_card),
      'Contact No': renderCell(row.contactno),
      'AICTE ID': renderCell(row.aicte_id),
      'VTU ID': renderCell(row.vtu_id),
      'Local Address': renderCell(row.local_address),
      'Permanent Address': renderCell(row.permanent_address)
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Staff');
    XLSX.writeFile(workbook, 'StaffInformation.xlsx');
  };
  const [departments, setDepartments] = useState([]);
  const [associations, setAssociations] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [religions, setReligions] = useState([]);
  const [casteCategories, setCasteCategories] = useState([]);
  const [staffRows, setStaffRows] = useState([]);
  const [upcomingSuperRows, setUpcomingSuperRows] = useState([]);
  const [upcomingYear, setUpcomingYear] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filter state
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedAssociations, setSelectedAssociations] = useState([]);
  const [selectedDesignations, setSelectedDesignations] = useState([]);
  const [selectedReligion, setSelectedReligion] = useState('all');
  const [selectedCasteCategory, setSelectedCasteCategory] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [selectedEmployeeType, setSelectedEmployeeType] = useState('all');

  // Fetch filter options on mount
  useEffect(() => {
    async function fetchOptions() {
      setLoading(true);
      try {
        const [deptRes, assoRes, desigRes, relRes] = await Promise.all([
          getDepartments(),
          getAssociations(),
          getDesignations(),
          getReligions()
        ]);
        setDepartments(deptRes.data?.data || deptRes.data || []);
        setAssociations(assoRes.data?.data || assoRes.data || []);
        setDesignations(desigRes.data?.data || desigRes.data || []);
        setReligions(relRes.data?.data || relRes.data || []);
      } catch (err) {
        setError('Failed to load filter options');
      } finally {
        setLoading(false);
      }
    }
    fetchOptions();
  }, []);

  // Fetch caste categories when religion changes
  useEffect(() => {
    async function fetchCastes() {
      if (!selectedReligion || selectedReligion === 'all') {
        setCasteCategories([]);
        return;
      }
      try {
        const res = await getCasteCategories(undefined, selectedReligion);
        setCasteCategories(res.data?.data || res.data || []);
      } catch (err) {
        setCasteCategories([]);
      }
    }
    fetchCastes();
  }, [selectedReligion]);

  // Multi-select handler
  const handleMultiSelect = (id, selected, setSelected) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Search handler
  const handleSearch = async () => {
    setLoading(true);
    setError('');
    try {
      const filters = {
        departments: selectedDepartments,
        associations: selectedAssociations,
        designations: selectedDesignations,
        religion_id: selectedReligion,
        castecategory_id: selectedCasteCategory,
        gender: selectedGender,
        employee_type: selectedEmployeeType
      };
      const res = await getFilteredStaff(filters);
      setStaffRows(res.data || []);
    } catch (err) {
      setError('Failed to fetch staff');
      setStaffRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch upcoming superannuation for the next year and show in table
  const handleUpcomingSuper = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/staff');
      const data = res?.data?.data || res?.data || [];
      const upcomingYearVar = new Date().getFullYear() + 1;
      const filtered = (Array.isArray(data) ? data : []).filter((r) => {
        const dt = r.date_of_superanuation || r.date_of_superannuation || r.date_of_superanuation;
        if (!dt) return false;
        const parsed = new Date(dt);
        if (isNaN(parsed.getTime())) return false;
        return parsed.getFullYear() === upcomingYear;
      });
      setUpcomingSuperRows(filtered);
      setUpcomingYear(upcomingYearVar);
      setSearch('');
      setPage(1);
    } catch (err) {
      setError('Failed to fetch upcoming superannuation list');
    } finally {
      setLoading(false);
    }
  };

  // Filtered and paginated rows
  const filteredRows = staffRows.filter((row) => {
    const query = search.toLowerCase();
    return (
      ([row.fname, row.mname, row.lname].filter(Boolean).join(' ').toLowerCase().includes(query)) ||
      (row.employee_type || '').toLowerCase().includes(query) ||
      (row.departments_list || '').toLowerCase().includes(query) ||
      (row.asso_name || '').toLowerCase().includes(query) ||
      (row.designations_list || '').toLowerCase().includes(query)
    );
  });
  const paginatedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to first page when search or staffRows change
  useEffect(() => { setPage(1); }, [search, staffRows]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-12">
              <div className="flex justify-start mb-2">
                <a
                  href="/staff"
                  className="inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded hover:bg-blue-200 transition"
                >
                  ← Back to Staff
                </a>
              </div>
              <h1 className="mb-2 text-4xl font-extrabold text-gray-900 text-center">Staff Filter</h1>
            </div>
            <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
              {/* You can add filter action buttons here if needed */}
            </div>
            <div className="overflow-hidden bg-white shadow-xl rounded-xl mb-8">
              <form className="p-6" onSubmit={e => { e.preventDefault(); handleSearch(); }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Department Multi-select */}
          <div>
            <label className="font-semibold">Department</label>
            <div className="max-h-32 overflow-y-auto border rounded p-2 mt-1">
              {departments.map(dep => (
                <div key={dep.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedDepartments.includes(dep.id)}
                    onChange={() => handleMultiSelect(dep.id, selectedDepartments, setSelectedDepartments)}
                  />
                  <span className="ml-2">{dep.dept_name}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Association Multi-select */}
          <div>
            <label className="font-semibold">Association</label>
            <div className="max-h-32 overflow-y-auto border rounded p-2 mt-1">
              {associations.map(asso => (
                <div key={asso.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedAssociations.includes(asso.id)}
                    onChange={() => handleMultiSelect(asso.id, selectedAssociations, setSelectedAssociations)}
                  />
                  <span className="ml-2">{asso.asso_name}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Designation Multi-select */}
          <div>
            <label className="font-semibold">Designation</label>
            <div className="max-h-32 overflow-y-auto border rounded p-2 mt-1">
              <div className="font-bold">Teaching</div>
              {designations.filter(d => d.emp_type === 'Teaching').map(des => (
                <div key={des.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedDesignations.includes(des.id)}
                    onChange={() => handleMultiSelect(des.id, selectedDesignations, setSelectedDesignations)}
                  />
                  <span className="ml-2">{des.design_name}</span>
                </div>
              ))}
              <div className="font-bold mt-2">Non-Teaching</div>
              {designations.filter(d => d.emp_type === 'Non-Teaching').map(des => (
                <div key={des.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedDesignations.includes(des.id)}
                    onChange={() => handleMultiSelect(des.id, selectedDesignations, setSelectedDesignations)}
                  />
                  <span className="ml-2">{des.design_name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* Religion Dropdown */}
          <div>
            <label className="font-semibold">Religion</label>
            <select
              className="w-full border rounded p-2 mt-1"
              value={selectedReligion}
              onChange={e => setSelectedReligion(e.target.value)}
            >
              <option value="all">All</option>
              {religions.map(rel => (
                <option key={rel.id} value={rel.id}>{rel.religion_name}</option>
              ))}
            </select>
          </div>
          {/* Caste Category Dropdown */}
          <div>
            <label className="font-semibold">Caste Category</label>
            <select
              className="w-full border rounded p-2 mt-1"
              value={selectedCasteCategory}
              onChange={e => setSelectedCasteCategory(e.target.value)}
            >
              <option value="all">All</option>
              {casteCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.caste_name}</option>
              ))}
            </select>
          </div>
          {/* Gender Radio */}
          <div>
            <label className="font-semibold block">Gender</label>
            <div className="flex gap-4 mt-1">
              <label><input type="radio" name="gender" value="all" checked={selectedGender === 'all'} onChange={() => setSelectedGender('all')} /> All</label>
              <label><input type="radio" name="gender" value="female" checked={selectedGender === 'female'} onChange={() => setSelectedGender('female')} /> Female</label>
              <label><input type="radio" name="gender" value="male" checked={selectedGender === 'male'} onChange={() => setSelectedGender('male')} /> Male</label>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* Employee Type Radio */}
          <div>
            <label className="font-semibold block">Employee Type</label>
            <div className="flex gap-4 mt-1">
              <label><input type="radio" name="employee_type" value="all" checked={selectedEmployeeType === 'all'} onChange={() => setSelectedEmployeeType('all')} /> All</label>
              <label><input type="radio" name="employee_type" value="Teaching" checked={selectedEmployeeType === 'Teaching'} onChange={() => setSelectedEmployeeType('Teaching')} /> Teaching</label>
              <label><input type="radio" name="employee_type" value="Non-teaching" checked={selectedEmployeeType === 'Non-teaching'} onChange={() => setSelectedEmployeeType('Non-teaching')} /> Non-teaching</label>
            </div>
          </div>
        </div>
        <div className="flex mt-6">
          <button type="submit" className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
        </form>
          </div>
            <div className="overflow-hidden bg-white shadow-xl rounded-xl">
              <div className="p-6">
                {error && <div className="text-red-600 mb-2">{error}</div>}
                {/* Upcoming superannuation separate table */}
                {upcomingSuperRows.length > 0 && (
                  <div className="mb-6 border rounded p-4 bg-gray-50">
                    <div className="mb-3 text-center">
                      <h2 className="text-lg font-bold">Upcoming Super Annuation List ({upcomingYear || (new Date().getFullYear() + 1)})</h2>
                    </div>
                    <div className="flex items-center justify-center mb-3">
                      <button
                        onClick={() => setUpcomingSuperRows([])}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        type="button"
                      >
                        Close
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 mb-2">
                        <thead className="bg-blue-600 text-white">
                          <tr>
                            <th className="px-2 py-1 text-left text-xs font-medium uppercase tracking-wider">S.No</th>
                            <th className="px-2 py-1 text-left text-xs font-medium uppercase tracking-wider">Staff Name</th>
                            <th className="px-2 py-1 text-left text-xs font-medium uppercase tracking-wider">Designation</th>
                            <th className="px-2 py-1 text-left text-xs font-medium uppercase tracking-wider">Date of Birth</th>
                            <th className="px-2 py-1 text-left text-xs font-medium uppercase tracking-wider">Date of Joining</th>
                            <th className="px-2 py-1 text-left text-xs font-medium uppercase tracking-wider">Due Date Of Retirement</th>
                          </tr>
                        </thead>
                        <tbody>
                          {upcomingSuperRows.map((r, i) => (
                            <tr key={r.id || i}>
                              <td className="px-2 py-1 border">{i + 1}</td>
                                <td className="px-2 py-1 border">{renderCell([r.fname, r.mname, r.lname].filter(Boolean).join(' '))}</td>
                                <td className="px-2 py-1 border">{formatDesignations(r.designations_list || r.designations)}</td>
                                <td className="px-2 py-1 border">{formatDateDMY(r.dob)}</td>
                                <td className="px-2 py-1 border">{formatDateDMY(r.doj)}</td>
                                <td className="px-2 py-1 border">{formatDateDMY(r.date_of_superanuation || r.date_of_superannuation)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center mb-4 gap-2 sm:gap-4 justify-between">
                  <div className="flex flex-1 items-center gap-2 sm:gap-4">
                    <div className="relative w-full sm:w-72">
                      <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search staff..."
                        className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <p className="font-semibold mb-2 sm:mb-0 sm:ml-4">Total Staff: <span className="text-lg">{filteredRows.length}</span></p>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={handleUpcomingSuper}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                      type="button"
                    >
                      Upcoming Super Annuation List
                    </button>
                    <button
                      onClick={handleExportExcel}
                      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                      type="button"
                    >
                      Export to Excel
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-blue-600">
                      <tr>
                        <th className="border px-2 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">S.No</th>
                        <th className="border px-2 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">Staff Name</th>
                        <th className="border px-2 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">Employee Type</th>
                        <th className="border px-2 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">Department</th>
                        <th className="border px-2 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">Association</th>
                        <th className="border px-2 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">Religion</th>
                        <th className="border px-2 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">Designation</th>
                        <th className="border px-2 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">Qualification</th>
                        <th className="border px-2 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">Gender</th>
                        <th className="border px-2 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">Date of Birth</th>
                        <th className="border px-2 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">Date of Joining</th>
                        <th className="border px-2 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">Date Of Superannuation</th>
                        <th className="border px-2 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">Date Of Confirmation</th>
                        <th className="border px-2 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">Date Of Increment</th>
                        <th className="border px-2 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">Blood Group</th>
                        <th className="border px-2 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">PAN Card No</th>
                        <th className="border px-2 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">Adhar Card No</th>
                        <th className="border px-2 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">Contact No</th>
                        <th className="border px-2 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">AICTE ID</th>
                        <th className="border px-2 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">VTU ID</th>
                        <th className="border px-2 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">Local Address</th>
                        <th className="border px-2 py-1 text-left text-xs font-medium text-white uppercase tracking-wider">Permanent Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="22" className="px-6 py-10 text-center text-gray-500">Loading...</td>
                        </tr>
                      ) : paginatedRows.length === 0 ? (
                        <tr>
                          <td colSpan="22" className="px-6 py-10 text-center text-gray-500">No staff found.</td>
                        </tr>
                      ) : (
                        paginatedRows.map((row, idx) => (
                          <tr key={row.id}>
                            <td className="border px-2 py-1">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                            <td className="border px-2 py-1">{renderCell([row.fname, row.mname, row.lname].filter(Boolean).join(' '))}</td>
                            <td className="border px-2 py-1">{renderCell(row.employee_type)}</td>
                            <td className="border px-2 py-1">{renderCell(row.departments_list || row.departments)}</td>
                            <td className="border px-2 py-1">{renderCell(row.asso_name || row.associations)}</td>
                            <td className="border px-2 py-1">{renderCell(row.religion_name)}</td>
                            <td className="border px-2 py-1">{formatDesignations(row.designations_list || row.designations)}</td>
                            <td className="border px-2 py-1">{renderCell(row.qual_name)}</td>
                            <td className="border px-2 py-1">{renderCell(row.gender)}</td>
                            <td className="border px-2 py-1">{formatDateDMY(row.dob)}</td>
                            <td className="border px-2 py-1">{formatDateDMY(row.doj)}</td>
                            <td className="border px-2 py-1">{formatDateDMY(row.date_of_superanuation || row.date_of_superannuation)}</td>
                            <td className="border px-2 py-1">{formatDateDMY(row.date_of_confirmation)}</td>
                            <td className="border px-2 py-1">{formatDateDMY(row.date_of_increment)}</td>
                            <td className="border px-2 py-1">{renderCell(row.bloodgroup)}</td>
                            <td className="border px-2 py-1">{renderCell(row.pan_card)}</td>
                            <td className="border px-2 py-1">{renderCell(row.adhar_card)}</td>
                            <td className="border px-2 py-1">{renderCell(row.contactno)}</td>
                            <td className="border px-2 py-1">{renderCell(row.aicte_id)}</td>
                            <td className="border px-2 py-1">{renderCell(row.vtu_id)}</td>
                            <td className="border px-2 py-1">{renderCell(row.local_address)}</td>
                            <td className="border px-2 py-1">{renderCell(row.permanent_address)}</td>
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
          </div>
        </main>
      </div>
    </div>
  );
}
