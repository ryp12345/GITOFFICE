import React from 'react';

function formatDate(d) {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date)) return '-';
  return date.toISOString().slice(0, 10);
}

export default function Department({ staff }) {
  const departments = Array.isArray(staff?.department_staff) && staff.department_staff.length > 0
    ? staff.department_staff.map(d => ({
        department_name: d.department_name || d.dept_name || d.name || '-',
        start_date: d.start_date,
        end_date: d.end_date,
        duration: d.duration,
        status: d.status
      }))
    : [
        {
          department_name: staff?.department_name,
          start_date: staff?.department_start_date,
          end_date: staff?.department_end_date,
          duration: staff?.department_duration,
          status: staff?.department_status
        }
      ];
  return (
    <div>
      <h2 className="text-xl font-bold text-blue-700 mb-4">Staff Department</h2>
      <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden mb-8">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">S.no</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Department</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Start Date</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">End Date</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Duration</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Status</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((d, idx) => (
            <tr key={idx} className="even:bg-gray-50">
              <td className="px-3 py-2 border-b text-sm">{idx + 1}</td>
              <td className="px-3 py-2 border-b text-sm">{d.department_name || '-'}</td>
              <td className="px-3 py-2 border-b text-sm">{d.start_date ? formatDate(d.start_date) : '-'}</td>
              <td className="px-3 py-2 border-b text-sm">{d.end_date ? formatDate(d.end_date) : '-'}</td>
              <td className="px-3 py-2 border-b text-sm">{d.duration || '-'}</td>
              <td className="px-3 py-2 border-b text-sm">{d.status || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}