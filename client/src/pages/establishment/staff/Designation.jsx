import React from 'react';

function formatDate(d) {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date)) return '-';
  return date.toISOString().slice(0, 10);
}

export default function Designation({ staff }) {
  const designations = Array.isArray(staff?.designation_staff) && staff.designation_staff.length > 0
    ? staff.designation_staff.map(d => ({
        designation_name: d.designation_name || d.design_name || d.name || '-',
        pay_type: d.pay_type,
        fixed_pay: d.fixed_pay,
        payscale: d.payscale,
        start_date: d.start_date,
        end_date: d.end_date,
        duration: d.duration,
        status: d.status
      }))
    : [
        {
          designation_name: staff?.designation_name,
          pay_type: staff?.pay_type,
          fixed_pay: staff?.fixed_pay,
          payscale: staff?.payscale,
          start_date: staff?.designation_start_date,
          end_date: staff?.designation_end_date,
          duration: staff?.designation_duration,
          status: staff?.designation_status
        }
      ];
  return (
    <div>
      <h2 className="text-xl font-bold text-blue-700 mb-4">Staff Designation</h2>
      <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden mb-8">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">S.no</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Designation</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Pay Type</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Fixed Pay</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Payscale</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Start Date</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">End Date</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Duration</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Status</th>
          </tr>
        </thead>
        <tbody>
          {designations.map((d, idx) => (
            <tr key={idx} className="even:bg-gray-50">
              <td className="px-3 py-2 border-b text-sm">{idx + 1}</td>
              <td className="px-3 py-2 border-b text-sm">{d.designation_name || '-'}</td>
              <td className="px-3 py-2 border-b text-sm">{d.pay_type || '-'}</td>
              <td className="px-3 py-2 border-b text-sm">{d.fixed_pay || '-'}</td>
              <td className="px-3 py-2 border-b text-sm">{d.payscale || '-'}</td>
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