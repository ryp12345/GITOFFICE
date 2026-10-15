import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import { PROFILE_PHOTO_RULE, useProfilePhoto, validateProfilePhoto } from '../../context/ProfilePhotoContext';
import { getErrorMessage } from '../../utils/errors';
import { toast } from '../../notifications/notifier';

// Lets the signed-in staff member replace their own photo (Laravel "update profile" photo field).
export default function ProfilePhotoModal({ open, onClose, name }) {
  const { photoUrl, uploadPhoto } = useProfilePhoto();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Fresh state each time the modal opens.
  useEffect(() => {
    if (!open) return;
    setFile(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  }, [open]);

  useEffect(() => {
    if (!file) { setPreviewUrl(''); return undefined; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  if (!open) return null;

  const handlePick = (e) => {
    const picked = e.target.files?.[0] || null;
    const problem = picked ? validateProfilePhoto(picked) : '';
    setError(problem);
    setFile(problem ? null : picked);
    if (problem && inputRef.current) inputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!file) { setError('Choose a photo to upload.'); return; }
    setSaving(true);
    setError('');
    try {
      await uploadPhoto(file);
      toast.success('Profile photo updated successfully.');
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update profile photo.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true" aria-labelledby="profile-photo-title">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 id="profile-photo-title" className="text-lg font-bold text-slate-800">Update Profile Photo</h3>
          <button type="button" onClick={() => !saving && onClose()} className="text-xl font-bold text-slate-500 hover:text-slate-700" aria-label="Close">&times;</button>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <Avatar src={photoUrl} name={name} className="h-24 w-24 text-2xl" ringClassName="ring-2 ring-slate-200" />
              <div className="mt-1 text-xs text-slate-500">Current</div>
            </div>
            {previewUrl && (
              <>
                <span className="text-2xl text-slate-400" aria-hidden="true">→</span>
                <div className="text-center">
                  <img src={previewUrl} alt="New photo preview" className="h-24 w-24 rounded-full object-cover ring-2 ring-blue-400" />
                  <div className="mt-1 text-xs text-blue-600">New</div>
                </div>
              </>
            )}
          </div>

          <div>
            <label htmlFor="profile-photo-input" className="mb-1 block text-sm font-semibold text-slate-700">Choose profile photo</label>
            <input
              id="profile-photo-input"
              ref={inputRef}
              type="file"
              accept="image/jpeg,.jpg,.jpeg"
              onChange={handlePick}
              disabled={saving}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="mt-1 text-xs text-red-500">*{PROFILE_PHOTO_RULE}</p>
          </div>

          {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving || !file} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Uploading...' : 'Save Photo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
