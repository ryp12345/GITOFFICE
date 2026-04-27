// Helper to format date for input type="date"
function toInputDate(value) {
  if (!value) return '';
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

// Helper to format date as D-MMM-YYYY
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
import React, { useEffect, useState } from 'react';
import {
  getStaffQualifications,
  createStaffQualification,
  updateStaffQualification,
  deleteStaffQualification,
} from '../../../api/staffQualificationApi';
import { getQualifications } from '../../../api/qualificationApi';

const initialForm = {
  qualification_id: '',
  board_university: '',
  grade: '',
  yop: '',
  status: '',
};


export default function Qualification({ staffId, token }) {
  const [qualifications, setQualifications] = useState([]);
  const [staffQualifications, setStaffQualifications] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);


  const fetchQualifications = async () => {
    try {
      const res = await getQualifications(token);
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      setQualifications(data);
    } catch {
      setQualifications([]);
    }
  };

  const fetchStaffQualifications = async () => {
    setLoading(true);
    try {
      const res = await getStaffQualifications(staffId, token);
      setStaffQualifications(res.data);
    } catch {
      setStaffQualifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQualifications();
    fetchStaffQualifications();
    // eslint-disable-next-line
  }, [staffId]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const openCreateModal = () => {
    setEditingId(null);
    setError('');
    setForm(initialForm);
    setShowModal(true);
  };

  const openEditModal = (row) => {
    setEditingId(row.id);
    setError('');
    setForm({
      qualification_id: row.qualification_id,
      board_university: row.board_university,
      grade: row.grade,
      yop: toInputDate(row.yop),
      status: row.status,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingId(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.qualification_id || !form.board_university || !form.status) {
      setError('Qualification, Board/University, and Status are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        qualification_id: form.qualification_id,
        board_university: form.board_university,
        grade: form.grade,
        yop: form.yop,
        status: form.status,
      };
      if (editingId) {
        await updateStaffQualification(editingId, payload, token);
      } else {
        await createStaffQualification(staffId, payload, token);
      }
      await fetchStaffQualifications();
      closeModal();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save qualification');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!row?.id) return;
    if (!window.confirm('Delete this qualification record?')) return;
    try {
      await deleteStaffQualification(row.id, token);
      await fetchStaffQualifications();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete qualification');
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-blue-700">Qualification Details</h2>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Qualification
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">S.no</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Qualification Name</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Board/University</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Year of Passing</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Grade</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-gray-400">Loading...</td></tr>
            ) : staffQualifications.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-gray-400">No qualification records found.</td></tr>
            ) : (
              staffQualifications.map((row, idx) => (
                <tr key={row.id || idx} className="even:bg-gray-50">
                  <td className="px-3 py-2 border-b text-sm">{idx + 1}</td>
                  <td className="px-3 py-2 border-b text-sm">{row.qual_name}</td>
                  <td className="px-3 py-2 border-b text-sm">{row.board_university}</td>
                  <td className="px-3 py-2 border-b text-sm">{formatDateDMY(row.yop)}</td>
                  <td className="px-3 py-2 border-b text-sm">{row.grade}</td>
                  <td className="px-3 py-2 border-b text-sm">{row.status}</td>
                  <td className="px-3 py-2 border-b text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(row)}
                        className="p-2 text-white transition-colors duration-200 bg-blue-600 rounded-lg hover:bg-blue-700"
                        title="Edit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(row)}
                        className="p-2 text-white transition-colors duration-200 bg-red-600 rounded-lg hover:bg-red-700"
                        title="Delete"
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
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-800">
                {editingId ? 'Edit Qualification' : 'Add New Qualification'}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 text-xl font-bold">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block font-bold mb-1">Qualification Name</label>
                <select
                  name="qualification_id"
                  value={form.qualification_id}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Choose Qualification</option>
                  {qualifications.map((q) => (
                    <option key={q.id} value={q.id}>{q.qual_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Choose One</option>
                  <option value="Pursuing">Pursuing</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Year Of Passing</label>
                <input
                  type="date"
                  name="yop"
                  value={toInputDate(form.yop)}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Board Or University</label>
                <input
                  type="text"
                  name="board_university"
                  value={form.board_university}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Grade (CGPA)</label>
                <input
                  type="text"
                  name="grade"
                  value={form.grade}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 rounded-md text-gray-700 font-semibold hover:bg-gray-300"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700"
                  disabled={saving}
                >
                  {editingId ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

