import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import Notification from '../../components/common/Notification';
import api from '../../api/axios';

export default function StaffStatisticsPage() {
  const navigate = useNavigate();
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchStatistics = async (params = {}) => {
    setLoading(true);
    try {
      const res = await api.get('/staff/statistics', { params });
      setStatistics(res?.data?.data || []);
    } catch (err) {
      setNotification({ show: true, message: 'Failed to load statistics', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    fetchStatistics({ start_date: startDate, end_date: endDate });
  };

  const handleExportExcel = () => {
    if (!statistics.length) {
      setNotification({ show: true, message: 'No data to export', type: 'error' });
      return;
    }
    // Prepare data for Excel
    const exportData = statistics.map((row, idx) => ({
      'SI. No.': idx + 1,
      'Designation': row.design_name,
      'Vac.': row.designation_type,
      'Scale of Pay': `${row.payscale_title} (${row.basepay || 'N/A'} - ${row.maxpay || 'N/A'})`,
      'Hindu M': row.hindu_male_count,
      'Hindu F': row.hindu_female_count,
      'Islam M': row.islam_male_count,
      'Islam F': row.islam_female_count,
      'Jainism M': row.jainism_male_count,
      'Jainism F': row.jainism_female_count,
      'Christian M': row.christian_male_count,
      'Christian F': row.christian_female_count,
      'Total M': row.total_male_count,
      'Total F': row.total_female_count,
    }));
    // Add totals row
    exportData.push({
      'SI. No.': '',
      'Designation': 'Total',
      'Vac.': '',
      'Scale of Pay': '',
      'Hindu M': statistics.reduce((a, b) => a + Number(b.hindu_male_count), 0),
      'Hindu F': statistics.reduce((a, b) => a + Number(b.hindu_female_count), 0),
      'Islam M': statistics.reduce((a, b) => a + Number(b.islam_male_count), 0),
      'Islam F': statistics.reduce((a, b) => a + Number(b.islam_female_count), 0),
      'Jainism M': statistics.reduce((a, b) => a + Number(b.jainism_male_count), 0),
      'Jainism F': statistics.reduce((a, b) => a + Number(b.jainism_female_count), 0),
      'Christian M': statistics.reduce((a, b) => a + Number(b.christian_male_count), 0),
      'Christian F': statistics.reduce((a, b) => a + Number(b.christian_female_count), 0),
      'Total M': statistics.reduce((a, b) => a + Number(b.total_male_count), 0),
      'Total F': statistics.reduce((a, b) => a + Number(b.total_female_count), 0),
    });

    // Add heading and date rows above the table
    const today = new Date();
    const dateString = today.toLocaleDateString();
    const colCount = Object.keys(exportData[0]).length;
    const headingRows = [
      ['Gogte Institute of Technology'],
      [`Date: ${dateString}`],
      ['Staff Statistics'],
      [], // Empty row for spacing
    ];
    // Convert exportData to array of arrays for appending
    const dataArray = [
      ...headingRows,
      Object.keys(exportData[0]),
      ...exportData.map(obj => Object.values(obj)),
    ];
    const ws = XLSX.utils.aoa_to_sheet(dataArray);

    // Merge heading, date, and subheading rows across all columns
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }, // Institute
      { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } }, // Date
      { s: { r: 2, c: 0 }, e: { r: 2, c: colCount - 1 } }, // Staff Statistics
    ];
    // (Cell styles for alignment are not supported in open-source SheetJS, but merging will visually center the text in Excel)

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff Statistics');
    // Enable styles in export (requires xlsx-style or SheetJS Pro for full support)
    XLSX.writeFile(wb, 'staff_statistics.xlsx');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Notification
              show={notification.show}
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification({ show: false, message: '', type: 'success' })}
            />
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">Staff Statistics</h1>
                <p className="text-gray-600">Grouped by Designation, Payscale, Gender, Religion</p>
              </div>
              <button
                onClick={() => navigate('/staff')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
                type="button"
              >
                ← Back to Staff
              </button>
            </div>
            <div className="flex flex-wrap gap-4 items-end mb-6 justify-between">
              <form onSubmit={handleFilter} className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded px-3 py-2" />
                </div>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Search</button>
              </form>
              <button
                onClick={handleExportExcel}
                className="px-4 py-2 bg-green-700 text-white rounded-lg shadow hover:bg-green-800"
                type="button"
              >
                Export to Excel
              </button>
            </div>
            <div className="overflow-x-auto bg-white shadow rounded-xl">
              <table className="min-w-full text-sm divide-y divide-gray-200">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="px-3 py-2">SI. No.</th>
                    <th className="px-3 py-2">Designation</th>
                    <th className="px-3 py-2">Vac.</th>
                    <th className="px-3 py-2">Scale of Pay</th>
                    <th colSpan={2} className="px-3 py-2">Hindu</th>
                    <th colSpan={2} className="px-3 py-2">Islam</th>
                    <th colSpan={2} className="px-3 py-2">Jainism</th>
                    <th colSpan={2} className="px-3 py-2">Christian</th>
                    <th colSpan={2} className="px-3 py-2">Total</th>
                  </tr>
                  <tr className="bg-blue-500">
                    <td></td><td></td><td></td><td></td>
                    <th className="px-2">M</th><th className="px-2">F</th>
                    <th className="px-2">M</th><th className="px-2">F</th>
                    <th className="px-2">M</th><th className="px-2">F</th>
                    <th className="px-2">M</th><th className="px-2">F</th>
                    <th className="px-2">M</th><th className="px-2">F</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={14} className="text-center py-8 text-gray-500">Loading...</td></tr>
                  ) : statistics.length === 0 ? (
                    <tr><td colSpan={14} className="text-center py-8 text-gray-500">No statistics found.</td></tr>
                  ) : (
                    <>
                      {statistics.map((row, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2">{idx + 1}</td>
                          <td className="px-3 py-2">{row.design_name}</td>
                          <td className="px-3 py-2">{row.designation_type}</td>
                          <td className="px-3 py-2">{row.payscale_title} ({row.basepay || 'N/A'} - {row.maxpay || 'N/A'})</td>
                          <td className="px-2 text-center">{row.hindu_male_count}</td>
                          <td className="px-2 text-center">{row.hindu_female_count}</td>
                          <td className="px-2 text-center">{row.islam_male_count}</td>
                          <td className="px-2 text-center">{row.islam_female_count}</td>
                          <td className="px-2 text-center">{row.jainism_male_count}</td>
                          <td className="px-2 text-center">{row.jainism_female_count}</td>
                          <td className="px-2 text-center">{row.christian_male_count}</td>
                          <td className="px-2 text-center">{row.christian_female_count}</td>
                          <td className="px-2 text-center">{row.total_male_count}</td>
                          <td className="px-2 text-center">{row.total_female_count}</td>
                        </tr>
                      ))}
                      {/* Totals row */}
                      <tr className="font-bold bg-blue-100">
                        <td colSpan={4}>Total</td>
                        <td className="px-2 text-center">{statistics.reduce((a, b) => a + Number(b.hindu_male_count), 0)}</td>
                        <td className="px-2 text-center">{statistics.reduce((a, b) => a + Number(b.hindu_female_count), 0)}</td>
                        <td className="px-2 text-center">{statistics.reduce((a, b) => a + Number(b.islam_male_count), 0)}</td>
                        <td className="px-2 text-center">{statistics.reduce((a, b) => a + Number(b.islam_female_count), 0)}</td>
                        <td className="px-2 text-center">{statistics.reduce((a, b) => a + Number(b.jainism_male_count), 0)}</td>
                        <td className="px-2 text-center">{statistics.reduce((a, b) => a + Number(b.jainism_female_count), 0)}</td>
                        <td className="px-2 text-center">{statistics.reduce((a, b) => a + Number(b.christian_male_count), 0)}</td>
                        <td className="px-2 text-center">{statistics.reduce((a, b) => a + Number(b.christian_female_count), 0)}</td>
                        <td className="px-2 text-center">{statistics.reduce((a, b) => a + Number(b.total_male_count), 0)}</td>
                        <td className="px-2 text-center">{statistics.reduce((a, b) => a + Number(b.total_female_count), 0)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
