import React, { useEffect, useState } from 'react';
import { getDepartments } from '../../../api/departmentApi';
import {
  createStaffDepartment,
  deleteStaffDepartment,
  updateStaffDepartment,
} from '../../../api/staffDepartmentApi';

function toInputDate(value) {
  if (!value) return '';

  // Preserve plain date values as-is to avoid timezone shifts.
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateDMY(value) {
  if (!value) return '-';

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = Number(month) - 1;
    if (monthIndex < 0 || monthIndex > 11) return '-';
    return `${day}-${monthNames[monthIndex]}-${year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function calcDuration(start, end) {
  if (!start) return '-';
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return '-';
  const diff = Math.max(0, endDate - startDate);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return `${days} days`;
}

export default function Department({ staff, setNotification, onDepartmentUpdated }) {
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    department_id: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getDepartments();
        const rows = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
            ? res.data
            : [];
        if (mounted) setDepartmentOptions(rows);
      } catch (_e) {
        if (mounted) setDepartmentOptions([]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const departmentRows = Array.isArray(staff?.department_staff) && staff.department_staff.length > 0
    ? staff.department_staff.map((d) => ({
        id: d.id,
        department_id: d.department_id,
        department_name: d.department_name || d.dept_name || d.name || '-',
        start_date: d.start_date,
        end_date: d.end_date,
        duration: d.duration || calcDuration(d.start_date, d.end_date),
        status: d.status,
      }))
    : [
        {
          id: null,
          department_id: null,
          department_name: staff?.department_name,
          start_date: staff?.department_start_date,
          end_date: staff?.department_end_date,
          duration: staff?.department_duration || calcDuration(staff?.department_start_date, staff?.department_end_date),
          status: staff?.department_status,
        },
      ];

  const openCreateModal = () => {
    setEditingRow(null);
    setError('');
    setForm({
      department_id: '',
      start_date: toInputDate(new Date()),
      end_date: '',
    });
    setShowModal(true);
  };

  const openEditModal = (row) => {
    setEditingRow(row);
    setError('');
    setForm({
      department_id: row.department_id ? String(row.department_id) : '',
      start_date: toInputDate(row.start_date),
      end_date: toInputDate(row.end_date),
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingRow(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!staff?.id) {
      setError('Staff id not found');
      return;
    }
    if (!form.department_id || !form.start_date) {
      setError('Department and start date are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        department_id: Number(form.department_id),
        start_date: form.start_date,
        end_date: form.end_date || null,
      };

      if (editingRow?.id) {
        await updateStaffDepartment(staff.id, editingRow.id, payload);
        if (typeof setNotification === 'function') {
          setNotification({ show: true, message: 'Department updated successfully', type: 'success' });
        }
      } else {
        await createStaffDepartment(staff.id, payload);
        if (typeof setNotification === 'function') {
          setNotification({ show: true, message: 'Department added successfully', type: 'success' });
        }
      }

      if (typeof onDepartmentUpdated === 'function') {
        await onDepartmentUpdated();
      }
      closeModal();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save department');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!row?.id || !staff?.id) return;
    if (!window.confirm('Delete this department record?')) return;

    try {
      await deleteStaffDepartment(staff.id, row.id);
      if (typeof setNotification === 'function') {
        setNotification({ show: true, message: 'Department deleted successfully', type: 'success' });
      }
      if (typeof onDepartmentUpdated === 'function') {
        await onDepartmentUpdated();
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete department');
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-blue-700">Staff Department</h2>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold"
        >
          Change Department
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">S.no</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Department</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Start Date</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">End Date</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Duration</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {departmentRows.map((d, idx) => (
              <tr key={idx} className="even:bg-gray-50">
                <td className="px-3 py-2 border-b text-sm">{idx + 1}</td>
                <td className="px-3 py-2 border-b text-sm">{d.department_name || '-'}</td>
                <td className="px-3 py-2 border-b text-sm">{formatDateDMY(d.start_date)}</td>
                <td className="px-3 py-2 border-b text-sm">{formatDateDMY(d.end_date)}</td>
                <td className="px-3 py-2 border-b text-sm">{d.duration || '-'}</td>
                <td className="px-3 py-2 border-b text-sm">{d.status || '-'}</td>
                <td className="px-3 py-2 border-b text-sm">
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      onClick={() => openEditModal(d)}
                      className="p-2 text-white transition-colors duration-200 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Edit Department"
                      disabled={!d.id}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(d)}
                      className="p-2 text-white transition-colors duration-200 bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete Department"
                      disabled={!d.id}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-800">
                {editingRow ? 'Edit Department' : 'Change Department'}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">X</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Department</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={form.department_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, department_id: e.target.value }))}
                    required
                  >
                    <option value="">Select department</option>
                    {departmentOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.dept_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Effect from Date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={form.start_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={form.end_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-md bg-gray-200 text-gray-700" disabled={saving}>Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700" disabled={saving}>
                  {saving ? 'Saving...' : editingRow ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
