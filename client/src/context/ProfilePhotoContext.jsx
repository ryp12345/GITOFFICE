import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { getMyProfilePhoto, uploadMyProfilePhoto } from '../api/profileApi';
import { resolveUploadUrl } from '../utils/uploads';

// Laravel's rule for profile photos (Staff/Teaching/updateprofile): JPG only, at most 500000 bytes.
export const PROFILE_PHOTO_MAX_BYTES = 500000;
export const PROFILE_PHOTO_RULE = 'Only JPG files up to 500 KB in size are accepted.';

export function validateProfilePhoto(file) {
  if (!file) return 'Choose a photo to upload.';
  const isJpeg = file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name || '');
  if (!isJpeg || file.size > PROFILE_PHOTO_MAX_BYTES) return PROFILE_PHOTO_RULE;
  return '';
}

const ProfilePhotoContext = createContext(null);

// Holds the signed-in user's own photo so the header and any other consumer update together.
export default function ProfilePhotoProvider({ children }) {
  const { user } = useAuth();
  const [photo, setPhoto] = useState({ url: '', hasStaffRecord: false, loaded: false });

  const applyPayload = useCallback((data) => {
    setPhoto({
      url: resolveUploadUrl(data?.profile_photo_url),
      hasStaffRecord: Boolean(data?.has_staff_record),
      loaded: true,
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setPhoto({ url: '', hasStaffRecord: false, loaded: true });
      return;
    }
    try {
      const res = await getMyProfilePhoto();
      applyPayload(res?.data);
    } catch (_err) {
      setPhoto({ url: '', hasStaffRecord: false, loaded: true });
    }
  }, [user?.id, applyPayload]);

  // Reload on login, logout and impersonation (each changes user.id).
  useEffect(() => {
    refresh();
  }, [refresh]);

  const uploadPhoto = useCallback(async (file) => {
    const problem = validateProfilePhoto(file);
    if (problem) throw new Error(problem);
    const res = await uploadMyProfilePhoto(file);
    applyPayload(res?.data);
    return res;
  }, [applyPayload]);

  const value = useMemo(() => ({
    photoUrl: photo.url,
    hasStaffRecord: photo.hasStaffRecord,
    loaded: photo.loaded,
    refresh,
    uploadPhoto,
  }), [photo, refresh, uploadPhoto]);

  return <ProfilePhotoContext.Provider value={value}>{children}</ProfilePhotoContext.Provider>;
}

export function useProfilePhoto() {
  const ctx = useContext(ProfilePhotoContext);
  if (!ctx) throw new Error('useProfilePhoto must be used inside ProfilePhotoProvider');
  return ctx;
}
