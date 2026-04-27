import React, { useEffect, useMemo, useState } from 'react';
import api from '../../../api/axios';

function normalizeRows(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.files)
        ? payload.files
        : Array.isArray(payload?.form16)
          ? payload.form16
          : Array.isArray(payload?.form_16)
            ? payload.form_16
            : [];

  return rows
    .map((item, idx) => {
      const year = Number(item.year || item.financial_year || item.assessment_year || 0);
      const fileUrl = item.file_url || item.url || item.path || item.file_path || item.document || '';
      const fileName = item.file_name || item.name || (typeof fileUrl === 'string' ? fileUrl.split('/').pop() : '') || `form16-${idx + 1}.pdf`;
      const uploadedAt = item.created_at || item.uploaded_at || item.date || '';

      if (!year || !fileUrl) return null;

      return {
        id: item.id || `${year}-${fileName}-${idx}`,
        year,
        part: item.part || item.part_type || '',
        fileName,
        fileUrl,
        uploadedAt
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.year - a.year);
}

function resolveFileUrl(fileUrl) {
  if (!fileUrl) return '#';
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;

  const normalized = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
  const apiBase = (import.meta.env.VITE_API_URL || '').trim() || api.defaults.baseURL || '';

  if (apiBase) {
    const cleanBase = String(apiBase).replace(/\/$/, '');
    const hostOnly = cleanBase.replace(/\/api$/, '');
    return `${hostOnly}${normalized}`;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}${normalized}`;
  }

  return normalized;
}

export default function Form16({ staff, setNotification }) {
  const staffId = staff?.id;
  const [rows, setRows] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');

  const groupedByYear = useMemo(() => {
    const grouped = rows.reduce((acc, row) => {
      const key = String(row.year);
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort((a, b) => Number(b[0]) - Number(a[0]))
      .map(([groupYear, files]) => ({ year: groupYear, files }));
  }, [rows]);

  const loadForm16Files = async () => {
    if (!staffId) {
      setRows([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.get(`/staff/${staffId}/form-16`);
      const data = response?.data?.data || response?.data || [];
      setRows(normalizeRows(data));
    } catch (_err) {
      const fallback = normalizeRows(staff?.form16 || staff?.form_16 || staff?.form16_files || []);
      setRows(fallback);
      if (!fallback.length) {
        setError('Unable to fetch uploaded Form 16 files right now.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForm16Files();
  }, [staffId]);

  const onFileChange = (event) => {
    const selected = event.target.files?.[0] || null;
    if (!selected) {
      setPdfFile(null);
      return;
    }

    const isPdf = selected.type === 'application/pdf' || /\.pdf$/i.test(selected.name);
    if (!isPdf) {
      setPdfFile(null);
      setError('Please select a valid PDF file.');
      return;
    }

    setError('');
    setPdfFile(selected);
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!staffId) {
      setError('Staff id is missing.');
      return;
    }

    if (!year || Number(year) < 2000 || Number(year) > 2100) {
      setError('Please enter a valid year.');
      return;
    }

    if (!pdfFile) {
      setError('Please select a PDF file to upload.');
      return;
    }

    const currentYearFiles = rows.filter((row) => Number(row.year) === Number(year));
    if (currentYearFiles.length > 0) {
      const confirmed = window.confirm(`A Form 16 already exists for year ${year}. Uploading will replace it. Continue?`);
      if (!confirmed) return;
    }

    setSaving(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('year', String(year));
      formData.append('file', pdfFile);

      await api.post(`/staff/${staffId}/form-16`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (typeof setNotification === 'function') {
        setNotification({ show: true, message: 'Form 16 uploaded successfully.', type: 'success' });
      }

      setPdfFile(null);
      setYear(new Date().getFullYear());
      await loadForm16Files();
    } catch (uploadErr) {
      const message = uploadErr?.response?.data?.message || 'Failed to upload Form 16. Please try again.';
      setError(message);
      if (typeof setNotification === 'function') {
        setNotification({ show: true, message, type: 'error' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (fileId) => {
    if (!fileId || deletingId) return;

    const confirmed = window.confirm('Delete this Form 16 PDF?');
    if (!confirmed) return;

    setDeletingId(fileId);
    setError('');

    try {
      await api.delete(`/staff/${staffId}/form-16/${fileId}`);
      if (typeof setNotification === 'function') {
        setNotification({ show: true, message: 'Form 16 deleted successfully.', type: 'success' });
      }
      await loadForm16Files();
    } catch (deleteErr) {
      const message = deleteErr?.response?.data?.message || 'Failed to delete Form 16 file.';
      setError(message);
      if (typeof setNotification === 'function') {
        setNotification({ show: true, message, type: 'error' });
      }
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-blue-700 mb-4">Upload Form 16</h2>
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              min="2000"
              max="2100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Form 16 PDF</label>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={onFileChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              required
            />
          </div>

          <button
            type="submit"
            className="h-10 rounded-md bg-blue-600 px-4 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? 'Uploading...' : 'Upload'}
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-blue-700 mb-4">Previously Uploaded Files (Year Wise)</h3>

        {loading ? (
          <div className="text-gray-500 text-sm">Loading files...</div>
        ) : groupedByYear.length === 0 ? (
          <div className="text-gray-500 text-sm">No Form 16 files uploaded yet.</div>
        ) : (
          <div className="space-y-5">
            {groupedByYear.map((group) => (
              <div key={group.year} className="rounded-md border border-gray-200">
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 font-semibold text-gray-800">
                  Year: {group.year}
                </div>
                <ul className="divide-y divide-gray-100">
                  {group.files.map((file) => (
                    <li key={file.id} className="px-4 py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{file.fileName}</p>
                        <p className="text-xs text-gray-500">Part: {String(file.part || '').toLowerCase() === 'part_b' ? 'Part B' : 'Part A'}</p>
                        <p className="text-xs text-gray-500">
                          Uploaded: {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : '-'}
                        </p>
                      </div>
                      <a
                        href={resolveFileUrl(file.fileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 inline-flex items-center rounded-md bg-blue-100 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-200"
                      >
                        View PDF
                      </a>
                      <a
                        href={resolveFileUrl(file.fileUrl)}
                        download={file.fileName}
                        className="shrink-0 inline-flex items-center rounded-md bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-200"
                      >
                        Download
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDelete(file.id)}
                        disabled={deletingId === file.id}
                        className="shrink-0 inline-flex items-center rounded-md bg-red-100 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60"
                      >
                        {deletingId === file.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
