
import { useEffect, useMemo, useState, useRef } from 'react';
import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import SidebarExamSection from '../../components/layout/SidebarExamSection';
import { getPayConfig, getPayConfigData, createPayConfig, updatePayConfig } from '../../api/examSectionApi';

const YEARS = [];
const currentYear = new Date().getFullYear();
for (let y = currentYear; y >= 2023; y--) {
  YEARS.push(`${y}-${y + 1}`);
}

export default function FastrackPayPage() {
  const [academicYear, setAcademicYear] = useState(`${currentYear}-${currentYear + 1}`);
  const [payData, setPayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [existingId, setExistingId] = useState(null);
  const [sliders, setSliders] = useState({
    management: 0,
    rem_theory: 0,
    rem_lab_teaching: 0,
    rem_lab_instructors: 0,
    rem_lab_peon: 0,
  });
  const [totals, setTotals] = useState({
    income: 0,
    expenses: 0,
    sessions_theory: 0,
    sessions_lab: 0,
  });
  const [initialized, setInitialized] = useState(false);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const formatIndianNumber = (num) => {
    const value = Number(num) || 0;
    return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const loadData = async (year) => {
    setLoading(true);
    try {
      const res = await getPayConfigData(year);
      const data = res?.data || res;
      setPayData(data);
      setExistingId(data?.fastrack_pays?.id || null);

      setTotals({
        income: data?.total_income?.total_income || 0,
        expenses: data?.total_expenses?.total_expenses || 0,
        sessions_theory: data?.total_sessions?.total_theory_class || 0,
        sessions_lab: data?.total_sessions?.total_lab_class || 0,
      });

      if (data?.fastrack_pays) {
        setSliders({
          management: data.fastrack_pays.management || 0,
          rem_theory: data.fastrack_pays.rem_theory || 0,
          rem_lab_teaching: data.fastrack_pays.rem_lab_teaching || 0,
          rem_lab_instructors: data.fastrack_pays.rem_lab_instructors || 0,
          rem_lab_peon: data.fastrack_pays.rem_lab_peon || 0,
        });
      } else {
        setSliders({ management: 0, rem_theory: 0, rem_lab_teaching: 0, rem_lab_instructors: 0, rem_lab_peon: 0 });
      }
      setInitialized(true);
    } catch (e) {
      showNotification(e.response?.data?.message || e.message || 'Failed to load pay data', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData(academicYear);
  }, [academicYear]);

  const handleYearPrev = () => {
    const parts = academicYear.split('-');
    const newYear = `${parseInt(parts[0]) - 1}-${parseInt(parts[1]) - 1}`;
    if (YEARS.includes(newYear)) setAcademicYear(newYear);
  };

  const handleYearNext = () => {
    const parts = academicYear.split('-');
    const newYear = `${parseInt(parts[0]) + 1}-${parseInt(parts[1]) + 1}`;
    if (YEARS.includes(newYear)) setAcademicYear(newYear);
  };

  const handleSliderChange = (field, value) => {
    setSliders((prev) => ({ ...prev, [field]: Number(value) }));
  };

  const managementAmount = useMemo(() => {
    const balance = totals.income - totals.expenses;
    return (balance * sliders.management) / 100;
  }, [totals, sliders.management]);

  const totalRemuneration = useMemo(() => {
    return (
      sliders.rem_theory * totals.sessions_theory +
      sliders.rem_lab_teaching * totals.sessions_lab +
      sliders.rem_lab_instructors * totals.sessions_lab +
      sliders.rem_lab_peon * totals.sessions_lab
    );
  }, [sliders, totals]);

  const finalBalance = useMemo(() => {
    return totals.income - totals.expenses - managementAmount - totalRemuneration;
  }, [totals, managementAmount, totalRemuneration]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        academic_year: academicYear,
        management: sliders.management,
        rem_theory: sliders.rem_theory,
        rem_lab_teaching: sliders.rem_lab_teaching,
        rem_lab_instructors: sliders.rem_lab_instructors,
        rem_lab_peon: sliders.rem_lab_peon,
      };

      if (existingId) {
        await updatePayConfig(existingId, payload);
        showNotification('Fastrack Pay Updated Successfully', 'success');
      } else {
        await createPayConfig(payload);
        showNotification('Fastrack Pays saved successfully', 'success');
        const updated = await getPayConfigData(academicYear);
        setPayData(updated);
        setExistingId(updated?.fastrack_pays?.id || null);
      }
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to save pay configuration';
      showNotification(msg, 'error');
    }
  };

  const handleReset = () => {
    setSliders({ management: 0, rem_theory: 0, rem_lab_teaching: 0, rem_lab_instructors: 0, rem_lab_peon: 0 });
  };

  const balance = useMemo(() => totals.income - totals.expenses, [totals]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <SidebarExamSection />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Notification show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ show: false, message: '', type: '' })} />
            <div className="mb-12 text-center">
              <h1 className="mb-2 text-4xl font-extrabold text-gray-900">Fastrack Pay Configuration</h1>
              <p className="text-lg text-gray-600">Manage remuneration settings for the selected academic year</p>
            </div>

            {/* Academic Year Selector */}
            <div className="flex items-center gap-4 mb-6">
              <button onClick={handleYearPrev} className="p-2 border border-gray-300 rounded hover:bg-gray-50">&lt;</button>
              <span className="px-4 py-2 bg-primary text-black rounded font-bold">{academicYear}</span>
              <button onClick={handleYearNext} className="p-2 border border-gray-300 rounded hover:bg-gray-50">&gt;</button>
            </div>

            {loading ? (
              <div className="p-6 text-center text-gray-500">Loading...</div>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* Fees Collected and Basic Expenditure */}
                <div className="bg-white shadow-xl rounded-xl mb-8 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800">Fees Collected and Basic Expenditure</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-blue-600">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Academic Year</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Total Income</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Total Expenses</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Balance (A)</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        <tr>
                          <td className="px-6 py-4 text-sm text-gray-900">{academicYear}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{formatIndianNumber(totals.income)}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{formatIndianNumber(totals.expenses)}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatIndianNumber(balance)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pay Configurations */}
                <div className="bg-white shadow-xl rounded-xl mb-8 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800">Pay Configurations</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-blue-600">
                        <tr>
                          <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">S.NO</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Particular</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">No of Sessions</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Control</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        <tr>
                          <td className="px-4 py-4 text-center text-sm text-gray-900">1</td>
                          <td className="px-4 py-4 text-sm text-gray-900">Management</td>
                          <td className="px-4 py-4 text-center text-sm text-gray-900">-NA-</td>
                          <td className="px-4 py-4">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={sliders.management}
                              onChange={(e) => handleSliderChange('management', e.target.value)}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="text-center text-sm font-semibold mt-1">{sliders.management}%</div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <input type="text" readOnly className="w-full text-right bg-gray-100 border border-gray-300 rounded px-2 py-1" value={formatIndianNumber(managementAmount)} />
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-4 text-center text-sm text-gray-900">2</td>
                          <td className="px-4 py-4 text-sm text-gray-900">Remuneration for Theory</td>
                          <td className="px-4 py-4 text-center text-sm text-gray-900">{totals.sessions_theory}</td>
                          <td className="px-4 py-4">
                            <input
                              type="range"
                              min="0"
                              max="3000"
                              step="10"
                              value={sliders.rem_theory}
                              onChange={(e) => handleSliderChange('rem_theory', e.target.value)}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="text-center text-sm font-semibold mt-1">₹ {sliders.rem_theory}</div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <input type="text" readOnly className="w-full text-right bg-gray-100 border border-gray-300 rounded px-2 py-1" value={formatIndianNumber(sliders.rem_theory * totals.sessions_theory)} />
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-4 text-center text-sm text-gray-900">3</td>
                          <td className="px-4 py-4 text-sm text-gray-900">Remuneration for Lab-Teaching</td>
                          <td className="px-4 py-4 text-center text-sm text-gray-900">{totals.sessions_lab}</td>
                          <td className="px-4 py-4">
                            <input
                              type="range"
                              min="0"
                              max="2000"
                              step="10"
                              value={sliders.rem_lab_teaching}
                              onChange={(e) => handleSliderChange('rem_lab_teaching', e.target.value)}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="text-center text-sm font-semibold mt-1">₹ {sliders.rem_lab_teaching}</div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <input type="text" readOnly className="w-full text-right bg-gray-100 border border-gray-300 rounded px-2 py-1" value={formatIndianNumber(sliders.rem_lab_teaching * totals.sessions_lab)} />
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-4 text-center text-sm text-gray-900">4</td>
                          <td className="px-4 py-4 text-sm text-gray-900">Remuneration for Lab-Instructors</td>
                          <td className="px-4 py-4 text-center text-sm text-gray-900">{totals.sessions_lab}</td>
                          <td className="px-4 py-4">
                            <input
                              type="range"
                              min="0"
                              max="1000"
                              step="10"
                              value={sliders.rem_lab_instructors}
                              onChange={(e) => handleSliderChange('rem_lab_instructors', e.target.value)}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="text-center text-sm font-semibold mt-1">₹ {sliders.rem_lab_instructors}</div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <input type="text" readOnly className="w-full text-right bg-gray-100 border border-gray-300 rounded px-2 py-1" value={formatIndianNumber(sliders.rem_lab_instructors * totals.sessions_lab)} />
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-4 text-center text-sm text-gray-900">5</td>
                          <td className="px-4 py-4 text-sm text-gray-900">Remuneration for Lab-Peon</td>
                          <td className="px-4 py-4 text-center text-sm text-gray-900">{totals.sessions_lab}</td>
                          <td className="px-4 py-4">
                            <input
                              type="range"
                              min="0"
                              max="500"
                              step="10"
                              value={sliders.rem_lab_peon}
                              onChange={(e) => handleSliderChange('rem_lab_peon', e.target.value)}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="text-center text-sm font-semibold mt-1">₹ {sliders.rem_lab_peon}</div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <input type="text" readOnly className="w-full text-right bg-gray-100 border border-gray-300 rounded px-2 py-1" value={formatIndianNumber(sliders.rem_lab_peon * totals.sessions_lab)} />
                          </td>
                        </tr>
                        <tr className="bg-gray-50 font-bold">
                          <td colSpan="4" className="px-4 py-3 text-right text-sm text-gray-700">Total Remuneration (B)</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">{formatIndianNumber(totalRemuneration)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end space-x-4 px-6 py-4 border-t">
                    <button type="button" onClick={handleReset} className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Reset</button>
                    {!existingId && <button type="submit" className="px-6 py-3 text-sm font-medium text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700">Submit</button>}
                  </div>
                </div>

                {/* Final Calculation */}
                <div className="bg-white shadow-xl rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800">Final Calculation details</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-blue-600">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Balance (A)</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Management</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Total Remuneration (B)</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Final Balance</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        <tr>
                          <td className="px-6 py-4 text-sm text-gray-900">{formatIndianNumber(balance)}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{formatIndianNumber(managementAmount)}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{formatIndianNumber(totalRemuneration)}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatIndianNumber(finalBalance)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
