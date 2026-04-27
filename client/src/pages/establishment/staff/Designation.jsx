import React, { useEffect, useMemo, useState } from 'react';
import {
  changeStaffDesignationPayscale,
  createStaffAdditionalDesignation,
  deleteStaffAdditionalDesignation,
  deleteStaffDesignationRow,
  deleteStaffPayscaleRow,
  getDesignationOptionsByEmployeeType,
  getDepartmentOptions,
  getPayscaleOptions,
  getStaffDesignationPayscale,
  updateStaffAdditionalDesignation,
  updateStaffDesignationRow,
  updateStaffPayscaleRow,
} from '../../../api/staffDesignationPayscaleApi';

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

function durationText(startDate, endDate) {
  if (!startDate) return '-';
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '-';
  const totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  const years = Math.floor(Math.max(totalMonths, 0) / 12);
  const months = Math.max(totalMonths, 0) % 12;
  return `${years} Year ${months} Month`;
}

function getRangeStart(value) {
  if (!value) return Number.NEGATIVE_INFINITY;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? Number.NEGATIVE_INFINITY : date.getTime();
}

function getRangeEnd(value) {
  if (!value) return Number.POSITIVE_INFINITY;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? Number.POSITIVE_INFINITY : date.getTime();
}

function shouldAttachPayscaleToDesignation(designation, payscale) {
  if (!designation || !payscale) return false;

  const designationStart = getRangeStart(designation.start_date);
  const designationEnd = getRangeEnd(designation.end_date);
  const payscaleStart = getRangeStart(payscale.start_date);
  const payscaleEnd = getRangeEnd(payscale.end_date);

  if (!Number.isFinite(designationStart) || !Number.isFinite(payscaleStart)) {
    return false;
  }

  if (!designation.end_date) {
    return payscaleStart >= designationStart;
  }

  return payscaleStart >= designationStart && Number.isFinite(payscaleEnd) && payscaleEnd <= designationEnd;
}

function buildDesignationPayscaleMatrix(designationRows, payscaleRows) {
  return designationRows.map((designation) => {
    const relatedPayscales = payscaleRows.filter((payscale) =>
      shouldAttachPayscaleToDesignation(designation, payscale)
    );

    return {
      designation,
      payscales: relatedPayscales.length ? relatedPayscales : [null],
    };
  });
}

const mainFormDefaults = {
  designations_id: '',
  pay_type: '',
  payscales_id: '',
  payscale_level: '',
  consolidated_pay: '',
  fixed_pay: '',
  start_date: '',
  reason: '',
  gcr: '',
};

const additionalDefaults = {
  designation_id: '',
  dept_id: '',
  start_date: '',
  end_date: '',
  allowance_status: 'Allowance',
  gcr: '',
  gcr_close: '',
  status: 'active',
};

export default function Designation({ staff, setNotification, onDesignationUpdated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [employeeType, setEmployeeType] = useState(staff?.employee_type || staff?.emp_type_name || '');
  const [designationRows, setDesignationRows] = useState([]);
  const [payscaleRows, setPayscaleRows] = useState([]);
  const [additionalRows, setAdditionalRows] = useState([]);

  const [designationOptions, setDesignationOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [payscaleOptions, setPayscaleOptions] = useState([]);

  const [showMainModal, setShowMainModal] = useState(false);
  const [mainForm, setMainForm] = useState(mainFormDefaults);

  const [editingDesignation, setEditingDesignation] = useState(null);
  const [designationEditForm, setDesignationEditForm] = useState({});

  const [editingPayscale, setEditingPayscale] = useState(null);
  const [payscaleEditForm, setPayscaleEditForm] = useState({});

  const [showAdditionalModal, setShowAdditionalModal] = useState(false);
  const [editingAdditional, setEditingAdditional] = useState(null);
  const [additionalForm, setAdditionalForm] = useState(additionalDefaults);

  const additionalDesignationOptions = useMemo(
    () => designationOptions.filter((d) => Number(d.isadditional) === 1),
    [designationOptions]
  );

  const designationPayscaleMatrix = useMemo(
    () => buildDesignationPayscaleMatrix(designationRows, payscaleRows),
    [designationRows, payscaleRows]
  );

  const loadPage = async () => {
    if (!staff?.id) return;
    setLoading(true);
    setError('');
    try {
      const [infoRes, deptRes] = await Promise.all([
        getStaffDesignationPayscale(staff.id),
        getDepartmentOptions(),
      ]);

      const data = infoRes?.data || {};
      const nextEmployeeType = data.employeeType || staff?.employee_type || staff?.emp_type_name || '';
      setEmployeeType(nextEmployeeType);
      setDesignationRows(Array.isArray(data.designations) ? data.designations : []);
      setPayscaleRows(Array.isArray(data.payscales) ? data.payscales : []);
      setAdditionalRows(Array.isArray(data.additionalDesignations) ? data.additionalDesignations : []);

      const deptData = Array.isArray(deptRes?.data) ? deptRes.data : Array.isArray(deptRes) ? deptRes : [];
      setDepartmentOptions(deptData);

      if (nextEmployeeType) {
        const desigData = await getDesignationOptionsByEmployeeType(nextEmployeeType);
        setDesignationOptions(Array.isArray(desigData) ? desigData : []);
      } else {
        setDesignationOptions([]);
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load designation and payscale data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff?.id]);

  useEffect(() => {
    const fetchOptions = async () => {
      if (!mainForm.pay_type || !employeeType || (mainForm.pay_type === 'Fixed')) {
        setPayscaleOptions([]);
        return;
      }
      try {
        const rows = await getPayscaleOptions({
          pay_type: mainForm.pay_type,
          emp_type: employeeType,
          designation_id: mainForm.designations_id || null,
        });
        setPayscaleOptions(Array.isArray(rows) ? rows : []);
      } catch (_e) {
        setPayscaleOptions([]);
      }
    };
    fetchOptions();
  }, [mainForm.pay_type, mainForm.designations_id, employeeType]);

  const notify = (message, type = 'success') => {
    if (typeof setNotification === 'function') {
      setNotification({ show: true, message, type });
    }
  };

  const afterMutation = async () => {
    await loadPage();
    if (typeof onDesignationUpdated === 'function') {
      await onDesignationUpdated();
    }
  };

  const submitMainChange = async (e) => {
    e.preventDefault();
    if (!staff?.id) return;
    setSaving(true);
    setError('');
    try {
      await changeStaffDesignationPayscale(staff.id, mainForm);
      notify('Designation and payscale updated successfully');
      setShowMainModal(false);
      setMainForm(mainFormDefaults);
      await afterMutation();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to change designation and payscale');
    } finally {
      setSaving(false);
    }
  };

  const startEditDesignation = (row) => {
    setEditingDesignation(row);
    setDesignationEditForm({
      designations_id: row.designation_id || '',
      start_date: toInputDate(row.start_date),
      end_date: toInputDate(row.end_date),
      reason: row.reason || '',
      gcr: row.gcr || '',
      status: row.status || 'active',
    });
  };

  const saveDesignationEdit = async (e) => {
    e.preventDefault();
    if (!staff?.id || !editingDesignation?.id) return;
    setSaving(true);
    try {
      await updateStaffDesignationRow(staff.id, editingDesignation.id, designationEditForm);
      notify('Designation row updated successfully');
      setEditingDesignation(null);
      await afterMutation();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update designation row');
    } finally {
      setSaving(false);
    }
  };

  const removeDesignation = async (row) => {
    if (!staff?.id || !row?.id) return;
    if (!window.confirm('Delete this designation row?')) return;
    try {
      await deleteStaffDesignationRow(staff.id, row.id);
      notify('Designation row deleted successfully');
      await afterMutation();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete designation row');
    }
  };

  const startEditPayscale = (row) => {
    setEditingPayscale(row);
    setPayscaleEditForm({
      payscales_id: row.payscale_id || '',
      payscale_level: row.payscale_level || '',
      consolidated_pay: row.pay || '',
      fixed_pay: row.pay || '',
      start_date: toInputDate(row.start_date),
      end_date: toInputDate(row.end_date),
      reason: row.reason || '',
      gcr: row.gcr || '',
      status: row.status || 'active',
    });
  };

  const savePayscaleEdit = async (e) => {
    e.preventDefault();
    if (!staff?.id || !editingPayscale?.id || !editingPayscale?.pay_record_type) return;
    setSaving(true);
    try {
      await updateStaffPayscaleRow(
        staff.id,
        editingPayscale.pay_record_type,
        editingPayscale.id,
        payscaleEditForm
      );
      notify('Payscale row updated successfully');
      setEditingPayscale(null);
      await afterMutation();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update payscale row');
    } finally {
      setSaving(false);
    }
  };

  const removePayscale = async (row) => {
    if (!staff?.id || !row?.id || !row?.pay_record_type) return;
    if (!window.confirm('Delete this payscale row?')) return;
    try {
      await deleteStaffPayscaleRow(staff.id, row.pay_record_type, row.id);
      notify('Payscale row deleted successfully');
      await afterMutation();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete payscale row');
    }
  };

  const openAdditionalCreate = () => {
    setEditingAdditional(null);
    setAdditionalForm(additionalDefaults);
    setShowAdditionalModal(true);
  };

  const openAdditionalEdit = (row) => {
    setEditingAdditional(row);
    setAdditionalForm({
      designation_id: row.designation_id || '',
      dept_id: row.dept_id || '',
      start_date: toInputDate(row.start_date),
      end_date: toInputDate(row.end_date),
      allowance_status: row.allowance_status || 'Allowance',
      gcr: row.gcr || '',
      gcr_close: row.gcr_close || '',
      status: row.status || 'active',
    });
    setShowAdditionalModal(true);
  };

  const saveAdditional = async (e) => {
    e.preventDefault();
    if (!staff?.id) return;
    setSaving(true);
    try {
      if (editingAdditional?.id) {
        await updateStaffAdditionalDesignation(staff.id, editingAdditional.id, additionalForm);
        notify('Additional designation updated successfully');
      } else {
        await createStaffAdditionalDesignation(staff.id, additionalForm);
        notify('Additional designation assigned successfully');
      }
      setShowAdditionalModal(false);
      setEditingAdditional(null);
      setAdditionalForm(additionalDefaults);
      await afterMutation();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save additional designation');
    } finally {
      setSaving(false);
    }
  };

  const removeAdditional = async (row) => {
    if (!staff?.id || !row?.id) return;
    if (!window.confirm('Delete this additional designation row?')) return;
    try {
      await deleteStaffAdditionalDesignation(staff.id, row.id);
      notify('Additional designation deleted successfully');
      await afterMutation();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete additional designation');
    }
  };

  return (
    <div className="w-full space-y-8">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 sm:px-6">
          <h2 className="text-lg font-bold text-gray-800">Designation And Pay Scale</h2>
          <button
            onClick={() => setShowMainModal(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Change Designation &amp; Payscale
          </button>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th rowSpan={2} className="border-b border-r px-3 py-2 text-left text-sm font-semibold text-gray-700">S.no</th>
                <th colSpan={5} className="border-b border-r px-3 py-2 text-center text-sm font-semibold text-gray-700">Designation Details</th>
                <th colSpan={5} className="border-b px-3 py-2 text-center text-sm font-semibold text-gray-700">Pay Scale Details</th>
              </tr>
              <tr>
                <th className="border-b border-r px-3 py-2 text-left text-sm font-semibold text-gray-700">Designation Name</th>
                <th className="border-b border-r px-3 py-2 text-left text-sm font-semibold text-gray-700">Start Date</th>
                <th className="border-b border-r px-3 py-2 text-left text-sm font-semibold text-gray-700">End Date</th>
                <th className="border-b border-r px-3 py-2 text-left text-sm font-semibold text-gray-700">Duration</th>
                <th className="border-b border-r px-3 py-2 text-left text-sm font-semibold text-gray-700">Actions</th>
                <th className="border-b border-r px-3 py-2 text-left text-sm font-semibold text-gray-700">Payscale Title</th>
                <th className="border-b border-r px-3 py-2 text-left text-sm font-semibold text-gray-700">Start Date</th>
                <th className="border-b border-r px-3 py-2 text-left text-sm font-semibold text-gray-700">End Date</th>
                <th className="border-b border-r px-3 py-2 text-left text-sm font-semibold text-gray-700">Duration</th>
                <th className="border-b px-3 py-2 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="px-3 py-5 text-center text-sm text-gray-400">Loading...</td></tr>
              ) : designationPayscaleMatrix.length === 0 ? (
                <tr><td colSpan={11} className="px-3 py-5 text-center text-sm text-gray-400">No designation and payscale rows found.</td></tr>
              ) : designationPayscaleMatrix.map((group, groupIndex) => (
                group.payscales.map((payscale, payIndex) => {
                  const rowKey = `${group.designation.id || groupIndex}-${payscale?.pay_record_type || 'none'}-${payscale?.id || payIndex}`;
                  const inactive = String(group.designation.status || '').toLowerCase() === 'inactive';

                  return (
                    <tr key={rowKey} className={inactive ? 'bg-gray-100' : 'even:bg-gray-50'}>
                      {payIndex === 0 && (
                        <>
                          <td rowSpan={group.payscales.length} className="border-b border-r px-3 py-2 align-top text-sm">{groupIndex + 1}</td>
                          <td rowSpan={group.payscales.length} className="border-b border-r px-3 py-2 align-top text-sm">{group.designation.designation_name || '-'}</td>
                          <td rowSpan={group.payscales.length} className="border-b border-r px-3 py-2 align-top text-sm">{formatDateDMY(group.designation.start_date)}</td>
                          <td rowSpan={group.payscales.length} className="border-b border-r px-3 py-2 align-top text-sm">{formatDateDMY(group.designation.end_date)}</td>
                          <td rowSpan={group.payscales.length} className="border-b border-r px-3 py-2 align-top text-sm">{durationText(group.designation.start_date, group.designation.end_date)}</td>
                          <td rowSpan={group.payscales.length} className="border-b border-r px-3 py-2 align-top text-sm">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEditDesignation(group.designation)}
                                className="p-2 text-white transition-colors duration-200 bg-blue-600 rounded-lg hover:bg-blue-700"
                                title="Edit Designation"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                      <td className="border-b border-r px-3 py-2 text-sm">
                        {payscale ? (payscale.payscale_title || payscale.pay || '-') : '--NA--'}
                        {payscale?.pay_type ? <span className="ml-2 text-xs text-gray-500">({payscale.pay_type})</span> : null}
                      </td>
                      <td className="border-b border-r px-3 py-2 text-sm">{payscale ? formatDateDMY(payscale.start_date) : '--NA--'}</td>
                      <td className="border-b border-r px-3 py-2 text-sm">{payscale ? formatDateDMY(payscale.end_date) : '--NA--'}</td>
                      <td className="border-b border-r px-3 py-2 text-sm">{payscale ? durationText(payscale.start_date, payscale.end_date) : '--NA--'}</td>
                      <td className="border-b px-3 py-2 text-sm">
                        {payscale ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditPayscale(payscale)}
                              className="p-2 text-white transition-colors duration-200 bg-blue-600 rounded-lg hover:bg-blue-700"
                              title="Edit Payscale"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </div>
                        ) : '--NA--'}
                      </td>
                    </tr>
                  );
                })
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 sm:px-6">
          <h3 className="text-lg font-bold text-gray-800">Additional Designation</h3>
          <button
            onClick={openAdditionalCreate}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Assign Additional Designation
          </button>
        </div>

        <div className="overflow-auto">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">S.no</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Additional Designation</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Department</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Start Date</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">End Date</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Allowance Status</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Duration</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">GCR</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="px-3 py-5 text-center text-sm text-gray-400">Loading...</td></tr>
            ) : additionalRows.length === 0 ? (
              <tr><td colSpan={10} className="px-3 py-5 text-center text-sm text-gray-400">No additional designation rows found.</td></tr>
            ) : additionalRows.map((row, idx) => (
              <tr key={row.id || idx} className="even:bg-gray-50">
                <td className="px-3 py-2 border-b text-sm">{idx + 1}</td>
                <td className="px-3 py-2 border-b text-sm">{row.designation_name || '-'}</td>
                <td className="px-3 py-2 border-b text-sm">{row.department_name || '-'}</td>
                <td className="px-3 py-2 border-b text-sm">{formatDateDMY(row.start_date)}</td>
                <td className="px-3 py-2 border-b text-sm">{formatDateDMY(row.end_date)}</td>
                <td className="px-3 py-2 border-b text-sm">{row.allowance_status || '-'}</td>
                <td className="px-3 py-2 border-b text-sm">{durationText(row.start_date, row.end_date)}</td>
                <td className="px-3 py-2 border-b text-sm">{row.gcr || '-'}</td>
                <td className="px-3 py-2 border-b text-sm">{row.status || '-'}</td>
                <td className="px-3 py-2 border-b text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openAdditionalEdit(row)}
                      className="p-2 text-white transition-colors duration-200 bg-blue-600 rounded-lg hover:bg-blue-700"
                      title="Edit Additional Designation"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => removeAdditional(row)}
                      className="p-2 text-white transition-colors duration-200 bg-red-600 rounded-lg hover:bg-red-700"
                      title="Delete Additional Designation"
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
      </div>

      {showMainModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-800">
                Change Designation And Payscale of <span className="text-red-500">{staff?.name || staff?.fname || 'Staff'}</span>
              </h3>
              <button onClick={() => setShowMainModal(false)} className="text-gray-500 hover:text-gray-700 text-xl font-bold">&times;</button>
            </div>
            <form onSubmit={submitMainChange} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Designation</label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  value={mainForm.designations_id}
                  onChange={(e) => setMainForm((p) => ({ ...p, designations_id: e.target.value }))}
                  required
                >
                  <option value="">Select designation</option>
                  {designationOptions.map((d) => (
                    <option key={d.id} value={d.id}>{d.design_name || d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Pay Type</label>
                <div className="flex flex-wrap gap-4">
                  {(employeeType === 'Teaching' ? ['Payscale', 'Fixed'] : ['Consolidated', 'Payscale', 'Fixed']).map((t) => (
                    <label key={t} className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="pay_type"
                        value={t}
                        checked={mainForm.pay_type === t}
                        onChange={(e) => setMainForm((p) => ({ ...p, pay_type: e.target.value, payscales_id: '', consolidated_pay: '', fixed_pay: '' }))}
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </div>

              {mainForm.pay_type === 'Payscale' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Payscale</label>
                    <select
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      value={mainForm.payscales_id}
                      onChange={(e) => setMainForm((p) => ({ ...p, payscales_id: e.target.value }))}
                      required
                    >
                      <option value="">Select payscale</option>
                      {payscaleOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.payscale_title || p.title || (p.basepay ? `${p.basepay}` : p.id)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {employeeType !== 'Teaching' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Payscale Level</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        value={mainForm.payscale_level}
                        onChange={(e) => setMainForm((p) => ({ ...p, payscale_level: e.target.value }))}
                      />
                    </div>
                  )}
                </>
              )}

              {mainForm.pay_type === 'Consolidated' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Consolidated Pay</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={mainForm.consolidated_pay}
                    onChange={(e) => setMainForm((p) => ({ ...p, consolidated_pay: e.target.value }))}
                    required
                  />
                </div>
              )}

              {mainForm.pay_type === 'Fixed' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fixed Pay</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={mainForm.fixed_pay}
                    onChange={(e) => setMainForm((p) => ({ ...p, fixed_pay: e.target.value }))}
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  value={mainForm.start_date}
                  onChange={(e) => setMainForm((p) => ({ ...p, start_date: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Reason</label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  value={mainForm.reason}
                  onChange={(e) => setMainForm((p) => ({ ...p, reason: e.target.value }))}
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">GCR</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  value={mainForm.gcr}
                  onChange={(e) => setMainForm((p) => ({ ...p, gcr: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowMainModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingDesignation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-800">Edit Designation</h3>
              <button onClick={() => setEditingDesignation(null)} className="text-gray-500 hover:text-gray-700 text-xl font-bold">&times;</button>
            </div>
            <form onSubmit={saveDesignationEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Designation</label>
                <select className="w-full rounded-lg border border-gray-300 px-3 py-2" value={designationEditForm.designations_id || ''} onChange={(e) => setDesignationEditForm((p) => ({ ...p, designations_id: e.target.value }))} required>
                  <option value="">Select designation</option>
                  {designationOptions.map((d) => (
                    <option key={d.id} value={d.id}>{d.design_name || d.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                  <input type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2" value={designationEditForm.start_date || ''} onChange={(e) => setDesignationEditForm((p) => ({ ...p, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                  <input type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2" value={designationEditForm.end_date || ''} onChange={(e) => setDesignationEditForm((p) => ({ ...p, end_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Reason</label>
                <textarea className="w-full rounded-lg border border-gray-300 px-3 py-2" value={designationEditForm.reason || ''} onChange={(e) => setDesignationEditForm((p) => ({ ...p, reason: e.target.value }))} rows={2} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">GCR</label>
                <input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2" value={designationEditForm.gcr || ''} onChange={(e) => setDesignationEditForm((p) => ({ ...p, gcr: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select className="w-full rounded-lg border border-gray-300 px-3 py-2" value={designationEditForm.status || 'active'} onChange={(e) => setDesignationEditForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingDesignation(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving...' : 'Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingPayscale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-800">Edit Payscale</h3>
              <button onClick={() => setEditingPayscale(null)} className="text-gray-500 hover:text-gray-700 text-xl font-bold">&times;</button>
            </div>
            <form onSubmit={savePayscaleEdit} className="p-6 space-y-4">
              {(editingPayscale.pay_record_type === 'teaching_payscale' || editingPayscale.pay_record_type === 'nt_payscale' || editingPayscale.pay_record_type === 'ntc_payscale') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Payscale</label>
                  <input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2" value={payscaleEditForm.payscales_id || ''} onChange={(e) => setPayscaleEditForm((p) => ({ ...p, payscales_id: e.target.value }))} />
                </div>
              )}
              {editingPayscale.pay_record_type === 'nt_payscale' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Payscale Level</label>
                  <input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2" value={payscaleEditForm.payscale_level || ''} onChange={(e) => setPayscaleEditForm((p) => ({ ...p, payscale_level: e.target.value }))} />
                </div>
              )}
              {(editingPayscale.pay_record_type === 'consolidated_teaching' || editingPayscale.pay_record_type === 'fixed_nt') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Pay</label>
                  <input type="number" step="0.01" className="w-full rounded-lg border border-gray-300 px-3 py-2" value={editingPayscale.pay_record_type === 'fixed_nt' ? (payscaleEditForm.fixed_pay || '') : (payscaleEditForm.consolidated_pay || '')} onChange={(e) => setPayscaleEditForm((p) => editingPayscale.pay_record_type === 'fixed_nt' ? ({ ...p, fixed_pay: e.target.value }) : ({ ...p, consolidated_pay: e.target.value }))} />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                  <input type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2" value={payscaleEditForm.start_date || ''} onChange={(e) => setPayscaleEditForm((p) => ({ ...p, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                  <input type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2" value={payscaleEditForm.end_date || ''} onChange={(e) => setPayscaleEditForm((p) => ({ ...p, end_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Reason</label>
                <textarea className="w-full rounded-lg border border-gray-300 px-3 py-2" value={payscaleEditForm.reason || ''} onChange={(e) => setPayscaleEditForm((p) => ({ ...p, reason: e.target.value }))} rows={2} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">GCR</label>
                <input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2" value={payscaleEditForm.gcr || ''} onChange={(e) => setPayscaleEditForm((p) => ({ ...p, gcr: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select className="w-full rounded-lg border border-gray-300 px-3 py-2" value={payscaleEditForm.status || 'active'} onChange={(e) => setPayscaleEditForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingPayscale(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving...' : 'Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAdditionalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-800">{editingAdditional ? `Edit Additional Designation for ${staff?.name || staff?.fname || 'Staff'}` : `Assign Additional Designation for ${staff?.name || staff?.fname || 'Staff'}`}</h3>
              <button onClick={() => setShowAdditionalModal(false)} className="text-gray-500 hover:text-gray-700 text-xl font-bold">&times;</button>
            </div>
            <form onSubmit={saveAdditional} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Additional Designation</label>
                <select className="w-full rounded-lg border border-gray-300 px-3 py-2" value={additionalForm.designation_id || ''} onChange={(e) => setAdditionalForm((p) => ({ ...p, designation_id: e.target.value }))} required>
                  <option value="">Select additional designation</option>
                  {additionalDesignationOptions.map((d) => (
                    <option key={d.id} value={d.id}>{d.design_name || d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Department</label>
                <select className="w-full rounded-lg border border-gray-300 px-3 py-2" value={additionalForm.dept_id || ''} onChange={(e) => setAdditionalForm((p) => ({ ...p, dept_id: e.target.value }))}>
                  <option value="">Select department</option>
                  {departmentOptions.map((d) => (
                    <option key={d.id} value={d.id}>{d.dept_name || d.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                  <input type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2" value={additionalForm.start_date || ''} onChange={(e) => setAdditionalForm((p) => ({ ...p, start_date: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                  <input type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2" value={additionalForm.end_date || ''} onChange={(e) => setAdditionalForm((p) => ({ ...p, end_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Allowance Status</label>
                <div className="flex flex-wrap gap-4">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="radio" name="allowance_status" value="Allowance" checked={additionalForm.allowance_status === 'Allowance'} onChange={(e) => setAdditionalForm((p) => ({ ...p, allowance_status: e.target.value }))} /> With Allowance
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="radio" name="allowance_status" value="Grading" checked={additionalForm.allowance_status === 'Grading'} onChange={(e) => setAdditionalForm((p) => ({ ...p, allowance_status: e.target.value }))} /> With Grading
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="radio" name="allowance_status" value="Both" checked={additionalForm.allowance_status === 'Both'} onChange={(e) => setAdditionalForm((p) => ({ ...p, allowance_status: e.target.value }))} /> Both
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">GCR</label>
                <input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2" value={additionalForm.gcr || ''} onChange={(e) => setAdditionalForm((p) => ({ ...p, gcr: e.target.value }))} />
              </div>
              {editingAdditional && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">GCR Close</label>
                    <input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2" value={additionalForm.gcr_close || ''} onChange={(e) => setAdditionalForm((p) => ({ ...p, gcr_close: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                    <select className="w-full rounded-lg border border-gray-300 px-3 py-2" value={additionalForm.status || 'active'} onChange={(e) => setAdditionalForm((p) => ({ ...p, status: e.target.value }))}>
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                    </select>
                  </div>
                </>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdditionalModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving...' : editingAdditional ? 'Update' : 'Assign'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
