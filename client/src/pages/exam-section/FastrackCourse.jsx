
import { useEffect, useMemo, useState, useRef } from 'react';
import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import SidebarExamSection from '../../components/layout/SidebarExamSection';
import {
  getFastrackCourses,
  getFastrackCoursesByAcademicYear,
  getFastrackLookup,
  createFastrackCourse,
  updateFastrackCourse,
  deleteFastrackCourse,
  downloadFastrackTemplate,
  uploadFastrackExcel,
  exportFastrackCourses
} from '../../api/examSectionApi';

const emptyForm = {
  course_code: '',
  course_name: '',
  department_id: '',
  ft_instance_id: '',
  no_of_students: '',
};

const YEARS = [];
const currentYear = new Date().getFullYear();
for (let y = currentYear; y >= 2020; y--) {
  YEARS.push(`${y}-${y + 1}`);
}

export default function FastrackCoursePage() {
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [instances, setInstances] = useState([]);
  const [courseTypes, setCourseTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [selectedInstance, setSelectedInstance] = useState('');
  const [academicYear, setAcademicYear] = useState(`${currentYear}-${currentYear + 1}`);
  const [useFilter, setUseFilter] = useState(false);
  const fileInputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const [coursesRes, lookupRes] = await Promise.all([
        useFilter
          ? getFastrackCoursesByAcademicYear({ fastrack_instance_id: selectedInstance, academic_year: academicYear })
          : getFastrackCourses(),
        getFastrackLookup()
      ]);
      const coursesData = coursesRes?.data?.data || coursesRes?.data || [];
      setRows(Array.isArray(coursesData) ? coursesData : []);
      const lookupData = lookupRes?.data?.data || lookupRes?.data || {};
      setDepartments(Array.isArray(lookupData.departments) ? lookupData.departments : []);
      setInstances(Array.isArray(lookupData.instances) ? lookupData.instances : []);
      setCourseTypes(Array.isArray(lookupData.courseTypes) ? lookupData.courseTypes : []);
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to fetch data';
      showNotification(msg, 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [useFilter, selectedInstance, academicYear]);

  const onClose = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  };

  const openCreate = () => {
    onClose();
    setIsModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      course_code: row.course_code || '',
      course_name: row.course_name || '',
      department_id: row.department_id || '',
      ft_instance_id: row.ft_instance_id || '',
      no_of_students: row.no_of_students || '',
    });
    setIsModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.course_code.trim()) {
      setError('Course code is required');
      return;
    }
    if (!form.course_name.trim()) {
      setError('Course name is required');
      return;
    }
    if (!form.ft_instance_id) {
      setError('Fastrack instance is required');
      return;
    }
    if (!form.no_of_students && form.no_of_students !== 0) {
      setError('Number of students is required');
      return;
    }

    try {
      const payload = {
        course_code: form.course_code,
        course_name: form.course_name,
        department_id: form.department_id || null,
        ft_instance_id: form.ft_instance_id,
        no_of_students: form.no_of_students,
      };
      if (editingId) {
        await updateFastrackCourse(editingId, payload);
        showNotification('Fastrack Course Updated Successfully', 'success');
      } else {
        await createFastrackCourse(payload);
        showNotification('Fastrack Course added successfully', 'success');
      }
      onClose();
      load();
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to save';
      setError(msg);
      showNotification(msg, 'error');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      await deleteFastrackCourse(id);
      load();
      showNotification('Fastrack Course Deleted successfully', 'success');
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to delete course';
      alert(msg);
      showNotification(msg, 'error');
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const handleDownloadTemplate = async () => {
    try {
      const templateHeaders = [
        'Sl.No',
        'Course Code*',
        'Course Name*',
        'department_id*',
        'USN*',
        'Student Name*',
        'Department Name',
        'Department ID'
      ];

      const deptRows = Array.isArray(departments) ? departments : [];
      const blankCells = Array(6).fill('<td style="padding:8px;"></td>').join('');
      const noteText = 'Note I: The first blank row in the template should be left empty. Note II: For the column department_id, enter the department id from the right-side reference list.';

      let tableContent = '<table border="1" cellspacing="0" cellpadding="0">';
      tableContent += '<tr>' + templateHeaders.map((header) => `<th style="background:#1976d2;color:#ffffff;padding:8px;text-align:left;">${header}</th>`).join('') + '</tr>';
      tableContent += `<tr><td colspan="6" style="padding:8px;color:#d32f2f;font-weight:bold;">${noteText}</td><td style="padding:8px;"></td><td style="padding:8px;"></td></tr>`;
      tableContent += `<tr>${blankCells}<td style="padding:8px;font-weight:bold;background:#f3f4f6;">Department Name</td><td style="padding:8px;font-weight:bold;background:#f3f4f6;">Department ID</td></tr>`;
      deptRows.forEach((dept) => {
        const departmentName = dept.dept_shortname || dept.dept_name || dept.department || '';
        const departmentId = dept.id != null ? String(dept.id) : '';
        tableContent += `<tr>${blankCells}<td style="padding:8px;">${departmentName}</td><td style="padding:8px;">${departmentId}</td></tr>`;
      });
      for (let i = 0; i < 8; i += 1) {
        tableContent += `<tr>${blankCells}<td style="padding:8px;"></td><td style="padding:8px;"></td></tr>`;
      }
      tableContent += '</table>';

      const blob = new Blob([tableContent], { type: 'application/vnd.ms-excel' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'fastrack_course_template.xls';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showNotification('Template downloaded successfully', 'success');
    } catch (e) {
      console.error('Download error:', e);
      showNotification(e.message || 'Failed to download template', 'error');
    }
  };

  const handleUploadExcel = async () => {
    if (!fileInputRef.current || !fileInputRef.current.files || !fileInputRef.current.files[0]) {
      showNotification('Please select a file to upload', 'error');
      return;
    }
    if (!selectedInstance) {
      showNotification('Please select a Fastrack Instance before uploading', 'error');
      return;
    }

    const file = fileInputRef.current.files[0];
    const formData = new FormData();
    formData.append('fileinput', file);
    formData.append('fastrack_instance', selectedInstance);

    try {
      const res = await uploadFastrackExcel(formData);
      showNotification(res.message || 'File uploaded successfully', 'success');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      load();
    } catch (e) {
      const msg = e.response?.status === 401
        ? 'Session expired. Please login again.'
        : (e.response?.data?.message || e.message || 'Failed to upload file');
      showNotification(msg, 'error');
    }
  };

  const handleExportCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('Please login again to export courses', 'error');
        return;
      }

      const response = await fetch('/api/exam-section/fastrack/course_details/export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        let msg = 'Failed to export courses';
        try {
          const errData = await response.json();
          msg = errData?.message || msg;
        } catch (_) {
          if (response.status === 401) msg = 'Session expired. Please login again.';
        }
        showNotification(msg, 'error');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fastrack_courses_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showNotification('Courses exported successfully', 'success');
    } catch (e) {
      showNotification(e.message || 'Failed to export courses', 'error');
    }
  };

  const getDepartmentName = (id) => {
    const dept = departments.find(d => d.id === id);
    return dept ? dept.dept_shortname : 'N/A';
  };

  const getInstanceName = (id) => {
    const inst = instances.find(i => i.id === id);
    return inst ? inst.ft_instance_name : 'N/A';
  };

  const getCourseType = (course) => {
    return course.course_type || '--NA--';
  };

  const getStatusBadge = (status) => {
    const badgeClass = {
      'Pending': 'bg-red-500',
      'Approved': 'bg-green-500',
      'Verified': 'bg-blue-500'
    }[status] || 'bg-gray-300';
    return <span className={`badge ${badgeClass} text-white px-2 py-1 rounded text-xs`}>{status || '--NA--'}</span>;
  };

  const totalStudents = useMemo(() => {
    return rows.reduce((sum, r) => sum + (parseInt(r.no_of_students, 10) || 0), 0);
  }, [rows]);

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(r => {
      const deptName = getDepartmentName(r.department_id).toLowerCase();
      const courseType = getCourseType(r).toLowerCase();
      const instanceName = getInstanceName(r.ft_instance_id).toLowerCase();
      return (
        r.course_code?.toLowerCase().includes(q) ||
        r.course_name?.toLowerCase().includes(q) ||
        deptName.includes(q) ||
        courseType.includes(q) ||
        instanceName.includes(q)
      );
    });
  }, [rows, search, departments, instances, courseTypes]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => { setPage(1); }, [search, rows]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <SidebarExamSection />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-full mx-auto">
            <Notification show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ show: false, message: '', type: '' })} />

            {/* Filter Section */}
            <div className="grid grid-cols-12 gap-x-6 mb-6">
              <div className="col-span-12 md:col-span-6">
                <div className="box">
                  <div className="box-body">
                    <div className="flex flex-col md:flex-row gap-x-4 w-full">
                      <div className="md:w-1/2 w-full mb-4 md:mb-0">
                        <label className="block mb-2 text-sm font-medium text-gray-700">Fastrack Instance</label>
                        <select
                          value={selectedInstance}
                          onChange={(e) => {
                            setSelectedInstance(e.target.value);
                            setUseFilter(true);
                          }}
                          className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Fastrack Instance</option>
                          {instances.map(inst => (
                            <option key={inst.id} value={inst.id}>{inst.ft_instance_name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:w-1/2 w-full">
                        <label className="block mb-2 text-sm font-medium text-gray-700">Academic Year</label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const parts = academicYear.split('-');
                              const newYear = `${parseInt(parts[0]) - 1}-${parseInt(parts[1]) - 1}`;
                              setAcademicYear(newYear);
                            }}
                            className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                          >
                            &lt;
                          </button>
                          <span className="px-4 py-2 bg-primary text-white rounded font-bold">{academicYear}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const parts = academicYear.split('-');
                              const newYear = `${parseInt(parts[0]) + 1}-${parseInt(parts[1]) + 1}`;
                              setAcademicYear(newYear);
                            }}
                            className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                          >
                            &gt;
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="box mb-6">
              <div className="box-body flex flex-wrap items-center gap-3">
                <button
                  onClick={openCreate}
                  className="flex items-center justify-center px-6 py-3 font-medium text-white transition-all duration-300 transform rounded-lg shadow-lg bg-blue-600 hover:bg-blue-700 hover:-translate-y-1 hover:scale-105"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                  Add Fastrack Course Details
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center px-6 py-3 font-medium text-white transition-all duration-300 transform rounded-lg shadow-lg bg-green-600 hover:bg-green-700 hover:-translate-y-1 hover:scale-105"
                  onClick={handleDownloadTemplate}
                >
                  Download Template
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center px-6 py-3 font-medium text-white transition-all duration-300 transform rounded-lg shadow-lg bg-blue-600 hover:bg-blue-700 hover:-translate-y-1 hover:scale-105"
                >
                  Upload
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleUploadExcel}
                  accept=".xlsx,.xls"
                  className="hidden"
                />
              </div>
            </div>

            {/* Table */}
            <div className="mb-10 overflow-hidden bg-white shadow-xl rounded-xl">
              <div className="px-6 py-4 border-b border-gray-200">
                <h1 className="box-title text-lg font-semibold text-gray-800">
                  Fastrack Course Details for Academic Year - <span className="text-danger">{academicYear}</span>
                </h1>
              </div>
              <div className="overflow-x-auto">
                <div className="flex justify-end mt-4">
                  <h1 className="box-title ml-2 text-lg font-semibold text-gray-800">
                    Fastrack Course Details for Instance - <span id="selected_instance" className="text-danger text-lg"></span>
                  </h1>
                  <button
                    type="button"
                    onClick={handleExportCourses}
                    className="bg-green-500 text-white px-4 py-2 rounded-md mb-2 focus:outline-none hover:bg-green-600"
                  >
                    Export to Excel
                  </button>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">S.NO</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Course Code</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Course Name</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Course Type</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Department</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">No of Students</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Theory Class</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Lab Class</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                      <th className="px-4 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan="11" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan="11" className="px-6 py-12 text-center text-gray-500">No courses found</td></tr>
                    ) : (
                      paginated.map((row, idx) => (
                        <tr key={row.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors duration-150`}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.course_code}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.course_name}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{getCourseType(row)}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{getDepartmentName(row.department_id)}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.no_of_students}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.classes_conducted ?? '--NA--'}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.labs_conducted ?? '--NA--'}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{getStatusBadge(row.staff_status)}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => openEdit(row)}
                                className="p-2 text-white transition-colors duration-200 bg-blue-600 rounded-lg hover:bg-blue-700"
                                title="Edit Course"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => remove(row.id)}
                                className="p-2 text-white transition-colors duration-200 bg-red-600 rounded-lg hover:bg-red-700"
                                title="Delete Course"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold bg-gray-50">
                      <td colSpan="5" className="text-right px-4 py-3 text-sm text-gray-700">Total Students</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{totalStudents}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
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

            {/* Add/Edit Modal */}
            {isModalOpen && (
              <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
                <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />
                  <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                    <div className="px-6 py-4 bg-blue-600">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium leading-6 text-white">{editingId ? 'Edit Fastrack Course' : 'Add Fastrack Course Details'}</h3>
                        <button className="text-white hover:text-gray-200" onClick={onClose}>
                          <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                    <div className="px-6 py-5 bg-white">
                      {error && <div className="mb-4 p-3 rounded border border-red-200 text-red-700 bg-red-50 text-sm">{error}</div>}
                      <form className="space-y-5" onSubmit={submit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Course Code <span className="text-red-500">*</span></label>
                            <input type="text" value={form.course_code} onChange={e => setForm({ ...form, course_code: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Course Code" required />
                          </div>
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Course Name <span className="text-red-500">*</span></label>
                            <input type="text" value={form.course_name} onChange={e => setForm({ ...form, course_name: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Course Name" required />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Department <span className="text-red-500">*</span></label>
                            <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                              <option value="">Choose a Department</option>
                              {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.dept_name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Fastrack Instance Name <span className="text-red-500">*</span></label>
                            <select value={form.ft_instance_id} onChange={e => setForm({ ...form, ft_instance_id: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                              <option value="">Choose Fastrack Instance</option>
                              {instances.map(inst => (
                                <option key={inst.id} value={inst.id}>{inst.ft_instance_name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">No of Students <span className="text-red-500">*</span></label>
                            <input type="number" value={form.no_of_students} onChange={e => setForm({ ...form, no_of_students: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="No Of Students" required />
                          </div>
                        </div>

                        <div className="flex justify-end space-x-4 pt-4">
                          <button type="button" onClick={onClose} className="inline-flex justify-center px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancel</button>
                          <button type="submit" className="inline-flex justify-center px-6 py-3 text-sm font-medium text-white border border-transparent rounded-lg shadow-sm bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">{editingId ? 'Update Fastrack Course' : 'Add Fastrack Course'}</button>
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
