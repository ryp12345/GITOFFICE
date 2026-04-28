import { useEffect, useState } from 'react';
import api from '../api/axios';

/**
 * Hook to fetch Form 16 files for a given staff member
 * @param {number} staffId - The staff member ID
 * @returns {Object} { files, loading, error, refetch }
 */
export function useForm16Files(staffId) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFiles = async () => {
    if (!staffId) {
      setFiles([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/staff/${staffId}/form-16`);
      const data = res?.data?.data || [];
      setFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to fetch Form 16 files';
      setError(msg);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [staffId]);

  return { files, loading, error, refetch: fetchFiles };
}

/**
 * Hook to upload a single Form 16 PDF
 * @param {number} staffId - The staff member ID
 * @returns {Object} { upload, uploading, error }
 */
export function useUploadForm16(staffId) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const upload = async (year, file) => {
    if (!staffId || !year || !file) {
      setError('Staff ID, year, and file are required');
      return null;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('year', String(year));
      formData.append('file', file);

      const res = await api.post(`/staff/${staffId}/form-16`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      return res?.data?.data || null;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to upload Form 16';
      setError(msg);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, error };
}

/**
 * Hook to delete a Form 16 file
 * @param {number} staffId - The staff member ID
 * @returns {Object} { remove, deleting, error }
 */
export function useDeleteForm16(staffId) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const remove = async (fileId) => {
    if (!staffId || !fileId) {
      setError('Staff ID and file ID are required');
      return false;
    }

    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/staff/${staffId}/form-16/${fileId}`);
      return true;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to delete Form 16';
      setError(msg);
      return false;
    } finally {
      setDeleting(false);
    }
  };

  return { remove, deleting, error };
}
