import React from 'react';

function formatDate(d) {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date)) return '';
  return date.toISOString().slice(0, 10);
}

function calcDuration(start, end) {
  if (!start) return '-';
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  if (isNaN(startDate) || isNaN(endDate)) return '-';
  const diff = Math.max(0, endDate - startDate);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return days + ' days';
}

export default function Association({ staff }) {
  // Association table data
  const associationRows = Array.isArray(staff?.association_staff) && staff.association_staff.length > 0
    ? staff.association_staff.map(a => ({
        association_name: a.association_name || a.asso_name || a.name || '-',
        start_date: a.start_date,
        tenure_end_date: a.closing_date, // correct column for Tenure End Date
        end_date: a.end_date,
        duration: a.duration || calcDuration(a.start_date, a.end_date),
        status: a.status
      }))
    : [
        {
          association_name: staff?.association_name,
          start_date: staff?.association_start_date,
          tenure_end_date: staff?.association_tenure_end_date || staff?.association_closing_date,
          end_date: staff?.association_end_date,
          duration: staff?.association_duration || calcDuration(staff?.association_start_date, staff?.association_end_date),
          status: staff?.association_status
        }
      ];

  // Institution table data
  const institutionRows = Array.isArray(staff?.institutions) && staff.institutions.length > 0
    ? staff.institutions.map(inst => ({
        ...inst,
        duration: inst.duration || calcDuration(inst.start_date, inst.end_date)
      }))
    : [
        {
          institution_name: staff?.institution_name,
          start_date: staff?.institution_start_date,
          end_date: staff?.institution_end_date,
          duration: staff?.institution_duration || calcDuration(staff?.institution_start_date, staff?.institution_end_date),
          status: staff?.institution_status
        }
      ];

  return (
    <div>
      <h2 className="text-xl font-bold text-blue-700 mb-4">Staff Association</h2>
      <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden mb-8">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">S.no</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Association</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Start Date</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Tenure End Date</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">End Date</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Duration</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Status</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Action</th>
          </tr>
        </thead>
        <tbody>
          {associationRows.map((a, idx) => (
            <tr key={idx} className="even:bg-gray-50">
              <td className="px-3 py-2 border-b text-sm">{idx + 1}</td>
              <td className="px-3 py-2 border-b text-sm">{a.association_name || '-'}</td>
              <td className="px-3 py-2 border-b text-sm">{a.start_date ? formatDate(a.start_date) : '-'}</td>
              <td className="px-3 py-2 border-b text-sm">{a.tenure_end_date ? formatDate(a.tenure_end_date) : '-'}</td>
              <td className="px-3 py-2 border-b text-sm">{a.end_date ? formatDate(a.end_date) : '-'}</td>
              <td className="px-3 py-2 border-b text-sm">{a.duration || '-'}</td>
              <td className="px-3 py-2 border-b text-sm">{a.status || '-'}</td>
              <td className="px-3 py-2 border-b text-sm">
                <button className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs">Action</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="text-xl font-bold text-blue-700 mb-4">Staff Institution</h2>
      <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">S.no</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Institution</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Start Date</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">End Date</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Duration</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Status</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Action</th>
          </tr>
        </thead>
        <tbody>
          {institutionRows.map((inst, idx) => (
            <tr key={idx} className="even:bg-gray-50">
              <td className="px-3 py-2 border-b text-sm">{idx + 1}</td>
              <td className="px-3 py-2 border-b text-sm">{inst.institution_name || '-'}</td>
              <td className="px-3 py-2 border-b text-sm">{inst.start_date ? formatDate(inst.start_date) : '-'}</td>
              <td className="px-3 py-2 border-b text-sm">{inst.end_date ? formatDate(inst.end_date) : '-'}</td>
              <td className="px-3 py-2 border-b text-sm">{inst.duration || '-'}</td>
              <td className="px-3 py-2 border-b text-sm">{inst.status || '-'}</td>
              <td className="px-3 py-2 border-b text-sm">
                <button className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs">Action</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}