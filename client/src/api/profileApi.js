import api from './axios';

// Signed-in user's own profile photo.
export const getMyProfilePhoto = async () => {
  const res = await api.get('/profile/photo');
  return res.data;
};

export const uploadMyProfilePhoto = async (file) => {
  const formData = new FormData();
  formData.append('profile_photo', file);
  const res = await api.post('/profile/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};
