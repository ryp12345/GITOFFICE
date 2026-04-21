import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { updateStaffById } from '../../../api/staffApi';
import Input from './Input.jsx';

export default function PersonalInfo({ staff, setNotification }) {
  const [editForm, setEditForm] = useState(staff || {});
  useEffect(() => {
    setEditForm(staff || {});
  }, [staff]);
  const [editError, setEditError] = useState('');
  const { id } = useParams();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editForm.fname || !editForm.lname || !editForm.emailUser) {
      setEditError('First name, last name, and email are required.');
      return;
    }
    setSaving(true);
    setEditError('');
    try {
      const allowed = [
        'fname','mname','lname','local_address','permanent_address','dob','doj','religion_id','castecategory_id','gender','date_of_superanuation','bloodgroup','pan_card','adhar_card','contactno','emergency_no','emergency_name','employeecode','pay_type','fixed_pay','payscale','gcr','duration'
      ];
      const payload = {};
      for (const key of allowed) {
        if (editForm[key] !== undefined) payload[key] = editForm[key];
      }
      if (editForm.biometric_code) {
        payload.employeecode = editForm.biometric_code;
      }
      if (editForm.date_of_superannuation) {
        payload.date_of_superanuation = editForm.date_of_superannuation;
      }
      if (editForm.emailUser) {
        payload.email = editForm.emailUser;
      }
      await updateStaffById(id, payload);
      if (typeof setNotification === 'function') {
        setNotification({ show: true, message: 'Staff updated successfully!', type: 'success' });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
      }
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setEditError('Failed to update staff.');
    } finally {
      setSaving(false);
    }
  };
  const handleCancel = () => {
    setEditForm(staff || {});
    setEditError('');
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {editError && <div className="col-span-2 text-red-600 text-sm mb-2">{editError}</div>}
        <Input label="First Name" value={editForm.fname || ''} onChange={v => { setEditForm(f => ({ ...f, fname: v })); }} />
        <Input label="Middle Name" value={editForm.mname || ''} onChange={v => { setEditForm(f => ({ ...f, mname: v })); }} />
        <Input label="Last Name" value={editForm.lname || ''} onChange={v => { setEditForm(f => ({ ...f, lname: v })); }} />
        <Input label="Email" value={editForm.emailUser || ''} onChange={v => { setEditForm(f => ({ ...f, emailUser: v })); }} type="email" />
        <Input label="Biometric Code" value={editForm.biometric_code || ''} onChange={v => { setEditForm(f => ({ ...f, biometric_code: v })); }} />
        <Input label="Date of Birth" type="date" value={editForm.dob || ''} onChange={v => { setEditForm(f => ({ ...f, dob: v })); }} />
        <Input label="Date of Joining" type="date" value={editForm.doj || ''} onChange={v => { setEditForm(f => ({ ...f, doj: v })); }} />
        <Input label="Date of Superannuation" type="date" value={editForm.date_of_superannuation || ''} onChange={v => { setEditForm(f => ({ ...f, date_of_superannuation: v })); }} />
        <Input label="PAN Card" value={editForm.pan_card || ''} onChange={v => { setEditForm(f => ({ ...f, pan_card: v })); }} />
        <Input label="Aadhaar Card" value={editForm.adhar_card || ''} onChange={v => { setEditForm(f => ({ ...f, adhar_card: v })); }} />
        <Input label="Contact No" value={editForm.contactno || ''} onChange={v => { setEditForm(f => ({ ...f, contactno: v })); }} />
        <Input label="Local Address" value={editForm.local_address || ''} onChange={v => { setEditForm(f => ({ ...f, local_address: v })); }} />
        <Input label="Permanent Address" value={editForm.permanent_address || ''} onChange={v => { setEditForm(f => ({ ...f, permanent_address: v })); }} />
        <Input label="Emergency No" value={editForm.emergency_no || ''} onChange={v => { setEditForm(f => ({ ...f, emergency_no: v })); }} />
        <Input label="Emergency Name" value={editForm.emergency_name || ''} onChange={v => { setEditForm(f => ({ ...f, emergency_name: v })); }} />
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">Blood Group</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={editForm.bloodgroup || ''}
            onChange={e => setEditForm(f => ({ ...f, bloodgroup: e.target.value }))}
          >
            <option value="">Select Blood Group</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
          </select>
        </div>
        <Input label="GC Resolution No" value={editForm.gcr || ''} onChange={v => { setEditForm(f => ({ ...f, gcr: v })); }} />
        <Input label="Duration" value={editForm.duration || ''} onChange={v => { setEditForm(f => ({ ...f, duration: v })); }} />
        <div className="col-span-2 flex gap-3 mt-4">
          <button className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={handleSave} disabled={saving}>Save</button>
          <button className="px-4 py-2 bg-gray-200 rounded-md" onClick={handleCancel} disabled={saving}>Cancel</button>
        </div>
      </div>
    </div>
  );
}