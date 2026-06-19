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
  const [form16File, setForm16File] = useState(null);

  const empType = editForm.employee_type || editForm.emp_type_name || editForm.latest_employee_type?.[0]?.employee_type || '';

  const handleSave = async () => {
    if (!editForm.fname || !editForm.lname) {
      setEditError('First name and last name are required.');
      return;
    }
    setSaving(true);
    setEditError('');
    try {
      const allowed = [
        'fname','mname','lname','local_address','permanent_address','dob','doj','religion_id','castecategory_id','gender','date_of_superanuation','bloodgroup','pan_card','adhar_card','contactno','emergency_no','emergency_name','employeecode','EmployeeCode',
        'vtu_id','aicte_id','esi_no','un_no','pf','date_of_increment','date_of_confirmation','employee_type'
      ];
      const payload = {};
      for (const key of allowed) {
        const val = editForm[key];
        if (val !== undefined && val !== null && val !== '') {
          payload[key] = val;
        }
      }
      if (editForm.biometric_code) {
        payload.employeecode = editForm.biometric_code;
      }
      if (editForm.date_of_superannuation) {
        payload.date_of_superanuation = editForm.date_of_superannuation;
      }
      if (editForm.emailUser || editForm.email) {
        payload.email = editForm.emailUser || editForm.email;
      }
      await updateStaffById(id, payload);

      // Handle Form-16 file upload if selected
      if (form16File) {
        try {
          const formData = new FormData();
          formData.append('file', form16File);
          const token = localStorage.getItem('token');
          if (token) {
            const { default: axios } = await import('../../../api/axios');
            await axios.post(`/staff/${id}/form-16`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
          }
        } catch (fileErr) {
          console.warn('Form-16 upload failed:', fileErr);
        }
      }

      if (typeof setNotification === 'function') {
        setNotification({ show: true, message: 'Staff updated successfully!', type: 'success' });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
      }
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to update staff.';
      setEditError(errorMsg);
      console.error('Update error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditForm(staff || {});
    setEditError('');
    setForm16File(null);
  };

  const getConfirmationDate = () => {
    if (!staff) return '';
    const confirmAssoc = staff.association_staff?.find(
      a => a.association_id === 6 || a.asso_name === 'Confirmed' || a.association_name === 'Confirmed'
    );
    if (confirmAssoc?.start_date) return confirmAssoc.start_date;
    if (staff.date_of_confirmation) return staff.date_of_confirmation;
    return '';
  };

  return (
    <div className="w-full">
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-white p-6 rounded-lg shadow"
        onSubmit={e => { e.preventDefault(); handleSave(); }}
        autoComplete="off"
      >
        {editError && <div className="col-span-1 md:col-span-2 text-red-600 text-sm mb-2">{editError}</div>}

        <Input label="First Name" value={editForm.fname || ''} onChange={v => setEditForm(f => ({ ...f, fname: v }))} />
        <Input label="Middle Name" value={editForm.mname || ''} onChange={v => setEditForm(f => ({ ...f, mname: v }))} />
        <Input label="Last Name" value={editForm.lname || ''} onChange={v => setEditForm(f => ({ ...f, lname: v }))} />

        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">Employee Type</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={empType}
            onChange={e => setEditForm(f => ({ ...f, employee_type: e.target.value }))}
          >
            <option value="">Select Employee Type</option>
            <option value="Teaching">Teaching</option>
            <option value="Non-Teaching">Non-Teaching</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">Email</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={editForm.emailUser || editForm.email || ''}
              onChange={e => setEditForm(f => ({ ...f, emailUser: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="youremail"
            />
            <span className="px-3 py-2 text-sm text-gray-600 bg-gray-100 border border-l-0 border-gray-300 rounded-lg">@git.edu</span>
          </div>
        </div>

        <Input label="Biometric Employee Code" value={editForm.biometric_code || editForm.EmployeeCode || ''} onChange={v => setEditForm(f => ({ ...f, biometric_code: v, EmployeeCode: v }))} />

        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">Religion</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={editForm.religion_id || ''}
            onChange={e => setEditForm(f => ({ ...f, religion_id: e.target.value }))}
          >
            <option value="">Select Religion</option>
            {(staff?.religions || []).map(r => (
              <option key={r.id} value={r.id}>{r.religion_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">Caste Category</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={editForm.castecategory_id || ''}
            onChange={e => setEditForm(f => ({ ...f, castecategory_id: e.target.value }))}
          >
            <option value="">Select Caste Category</option>
            {(staff?.castecategories || []).filter(c => !editForm.religion_id || String(c.religion_id) === String(editForm.religion_id))
              .map(c => (
                <option key={c.id} value={c.id}>
                  {[c.caste_name, c.subcastes_name, c.category, c.category_no].filter(Boolean).join(' - ')}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">Gender</label>
          <div className="flex gap-x-6 pt-2">
            {['female', 'male', 'others'].map(g => (
              <label key={g} className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="gender"
                  value={g}
                  checked={editForm.gender === g}
                  onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}
                />
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </label>
            ))}
          </div>
        </div>

        <Input label="Date of Birth" type="date" value={editForm.dob || ''} onChange={v => setEditForm(f => ({ ...f, dob: v }))} />
        <Input label="Date of Joining" type="date" value={editForm.doj || ''} onChange={v => setEditForm(f => ({ ...f, doj: v }))} />
        <Input label="Date of Superannuation" type="date" value={editForm.date_of_superannuation || editForm.date_of_superanuation || ''} onChange={v => setEditForm(f => ({ ...f, date_of_superannuation: v }))} />

        <Input
          label="Date of Confirmation"
          type="date"
          value={getConfirmationDate()}
          readOnly
          className="bg-gray-50"
        />

        <Input label="Date of Increment" type="date" value={editForm.date_of_increment || ''} onChange={v => setEditForm(f => ({ ...f, date_of_increment: v }))} />

        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">Blood Group</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={editForm.bloodgroup || ''}
            onChange={e => setEditForm(f => ({ ...f, bloodgroup: e.target.value }))}
          >
            <option value="">Select Blood Group</option>
            <option value="A+">A + (Positive)</option>
            <option value="A-">A - (Negative)</option>
            <option value="B+">B + (Positive)</option>
            <option value="B-">B - (Negative)</option>
            <option value="AB+">AB + (Positive)</option>
            <option value="AB-">AB - (Negative)</option>
            <option value="O+">O + (Positive)</option>
            <option value="O-">O - (Negative)</option>
          </select>
        </div>

        <Input label="PAN Card" value={editForm.pan_card || ''} onChange={v => setEditForm(f => ({ ...f, pan_card: v.toUpperCase() }))} />
        <Input label="Aadhaar Card" value={editForm.adhar_card || ''} onChange={v => setEditForm(f => ({ ...f, adhar_card: v.replace(/\D/g, '') }))} />

        {empType === 'Teaching' && (
          <>
            <Input label="AICTE ID" value={editForm.aicte_id || ''} onChange={v => setEditForm(f => ({ ...f, aicte_id: v }))} />
            <Input label="VTU ID" value={editForm.vtu_id || ''} onChange={v => setEditForm(f => ({ ...f, vtu_id: v }))} />
          </>
        )}

        {empType === 'Non-Teaching' && (
          <>
            <Input label="ESI No" value={editForm.esi_no || ''} onChange={v => setEditForm(f => ({ ...f, esi_no: v }))} />
            <Input label="UAN No" value={editForm.un_no || ''} onChange={v => setEditForm(f => ({ ...f, un_no: v }))} />
          </>
        )}

        <Input label="PF Number" value={editForm.pf || ''} onChange={v => setEditForm(f => ({ ...f, pf: v }))} />

        <Input label="Local Address" value={editForm.local_address || ''} onChange={v => setEditForm(f => ({ ...f, local_address: v }))} />
        <Input label="Permanent Address" value={editForm.permanent_address || ''} onChange={v => setEditForm(f => ({ ...f, permanent_address: v }))} />
        <Input label="Contact No" value={editForm.contactno || ''} onChange={v => setEditForm(f => ({ ...f, contactno: v.replace(/\D/g, '') }))} />
        <Input label="Emergency No" value={editForm.emergency_no || ''} onChange={v => setEditForm(f => ({ ...f, emergency_no: v.replace(/\D/g, '') }))} />
        <Input label="Emergency Name" value={editForm.emergency_name || ''} onChange={v => setEditForm(f => ({ ...f, emergency_name: v }))} />

        <div className="col-span-1 md:col-span-2">
          <label className="block mb-1 text-sm font-medium text-gray-700">Form-16 (PDF up to 500 KB)</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={e => setForm16File(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {form16File && <p className="text-xs text-gray-500 mt-1">Selected: {form16File.name}</p>}
        </div>

        <div className="col-span-1 md:col-span-2 flex justify-end gap-3 mt-4">
          <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" disabled={saving}>
            {saving ? 'Updating...' : 'Update Information'}
          </button>
          <button type="button" className="px-4 py-2 bg-gray-200 rounded-md" onClick={handleCancel} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
