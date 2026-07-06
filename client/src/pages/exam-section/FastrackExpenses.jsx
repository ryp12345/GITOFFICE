import { useEffect, useMemo, useState } from 'react';
import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import SidebarExamSection from '../../components/layout/SidebarExamSection';
import { getExpenses, getExpensesByAcademicYear, createExpense, updateExpense, deleteExpense, getExpenseMasters } from '../../api/examSectionApi';

const YEARS = [];
const currentYear = new Date().getFullYear();
for (let y = currentYear; y >= 2020; y--) {
  YEARS.push(`${y}-${y + 1}`);
}

export default function FastrackExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [expenseMasters, setExpenseMasters] = useState([]);
  const [academicYear, setAcademicYear] = useState(`${currentYear}-${currentYear + 1}`);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ academic_year: '', ft_expense_master_id: '', expense_amount: '' });

  const [addRows, setAddRows] = useState([{ ft_expense_master_id: '', expense_amount: '' }]);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const loadExpenses = async (year) => {
    setLoading(true);
    try {
      const res = await getExpensesByAcademicYear({ academic_year: year });
      const data = res?.data?.data || res?.data || [];
      setExpenses(Array.isArray(data) ? data : []);
    } catch (e) {
      showNotification(e.response?.data?.message || e.message || 'Failed to load expenses', 'error');
    }
    setLoading(false);
  };

  const loadExpenseMasters = async () => {
    try {
      const res = await getExpenseMasters();
      const data = res?.data?.data || res?.data || [];
      setExpenseMasters(Array.isArray(data) ? data : []);
    } catch (e) {
      showNotification(e.response?.data?.message || e.message || 'Failed to load expense titles', 'error');
    }
  };

  useEffect(() => {
    loadExpenseMasters();
  }, []);

  useEffect(() => {
    loadExpenses(academicYear);
  }, [academicYear]);

  const handleAddRow = () => {
    setAddRows([...addRows, { ft_expense_master_id: '', expense_amount: '' }]);
  };

  const handleRemoveRow = (index) => {
    setAddRows(addRows.filter((_, i) => i !== index));
  };

  const handleAddRowChange = (index, field, value) => {
    const updated = [...addRows];
    updated[index][field] = value;
    setAddRows(updated);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const validRows = addRows.filter(r => r.ft_expense_master_id && r.expense_amount !== '');
    if (validRows.length === 0) {
      showNotification('Please fill at least one expense entry', 'error');
      return;
    }
    const payload = validRows.map(r => ({
      academic_year: academicYear,
      ft_expense_master_id: r.ft_expense_master_id,
      expense_amount: parseFloat(r.expense_amount),
    }));
    try {
      await createExpense(payload);
      showNotification('Fastrack Expenses added successfully', 'success');
      setIsAddModalOpen(false);
      setAddRows([{ ft_expense_master_id: '', expense_amount: '' }]);
      loadExpenses(academicYear);
    } catch (e) {
      showNotification(e.response?.data?.message || e.message || 'Failed to add expenses', 'error');
    }
  };

  const openEdit = (expense) => {
    setEditingId(expense.id);
    setEditForm({
      academic_year: expense.academic_year || '',
      ft_expense_master_id: expense.ft_expense_master_id || '',
      expense_amount: expense.expense_amount || '',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.ft_expense_master_id || editForm.expense_amount === '') {
      showNotification('Expense title and amount are required', 'error');
      return;
    }
    try {
      await updateExpense(editingId, {
        academic_year: editForm.academic_year,
        ft_expense_master_id: editForm.ft_expense_master_id,
        expense_amount: parseFloat(editForm.expense_amount),
      });
      showNotification('Fastrack Expense updated successfully', 'success');
      setIsEditModalOpen(false);
      setEditingId(null);
      loadExpenses(academicYear);
    } catch (e) {
      showNotification(e.response?.data?.message || e.message || 'Failed to update expense', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await deleteExpense(id);
      showNotification('Fastrack Expense deleted successfully', 'success');
      loadExpenses(academicYear);
    } catch (e) {
      showNotification(e.response?.data?.message || e.message || 'Failed to delete expense', 'error');
    }
  };

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

  const handleYearChange = (e) => {
    setAcademicYear(e.target.value);
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => e.academic_year === academicYear);
  }, [expenses, academicYear]);

  const masterMap = useMemo(() => {
    const map = {};
    expenseMasters.forEach(m => { map[m.id] = m.title; });
    return map;
  }, [expenseMasters]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <SidebarExamSection />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Notification show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ show: false, message: '', type: '' })} />
            <div className="mb-12 text-center">
              <h1 className="mb-2 text-4xl font-extrabold text-gray-900">Fastrack Expenses Details</h1>
              <p className="text-lg text-gray-600">Manage Fastrack expenses for selected academic year</p>
            </div>

            <div className="bg-white shadow-xl rounded-xl mb-8 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-lg font-semibold text-gray-800">Fastrack Expenses Details</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex items-center gap-4">
                    <button onClick={handleYearPrev} className="p-2 border border-gray-300 rounded hover:bg-gray-50">&lt;</button>
                    <span className="px-4 py-2 bg-primary text-black rounded font-bold">{academicYear}</span>
                    <button onClick={handleYearNext} className="p-2 border border-gray-300 rounded hover:bg-gray-50">&gt;</button>
                  </div>
                  <div className="flex items-end">
                    <button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center px-6 py-3 font-medium text-white transition-all duration-300 transform rounded-lg shadow-lg bg-blue-600 hover:bg-blue-700 hover:-translate-y-1 hover:scale-105">
                      Add Expenses
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 dark:bg-black/20">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">S.No</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expense Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expense Amount</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                    ) : filteredExpenses.length === 0 ? (
                      <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-500">No Fastrack Expenses Found</td></tr>
                    ) : (
                      filteredExpenses.map((expense, idx) => (
                        <tr key={expense.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 text-sm text-gray-900">{idx + 1}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{masterMap[expense.ft_expense_master_id] || '--NA--'}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{expense.expense_amount}</td>
                          <td className="px-6 py-4 text-center text-sm font-medium">
                            <div className="flex items-center justify-center space-x-2">
                              <button onClick={() => openEdit(expense)} className="p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700" title="Edit">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button onClick={() => handleDelete(expense.id)} className="p-2 text-white bg-red-600 rounded-lg hover:bg-red-700" title="Delete">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setIsAddModalOpen(false)} />
            <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="px-6 py-4 bg-blue-600 flex items-center justify-between">
                <h3 className="text-lg font-medium leading-6 text-white">Add New Fastrack Expenses</h3>
                <button className="text-white hover:text-gray-200" onClick={() => setIsAddModalOpen(false)}>
                  <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleAddSubmit}>
                <div className="px-6 py-4 bg-white">
                  <div className="max-w-sm space-y-3 pb-4">
                    <label className="ti-form-label font-bold">Academic Year:<span className="text-red-500">*</span></label>
                    <select value={academicYear} disabled className="ti-form-select font-bold bg-gray-100">
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sl.No</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expense Title</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expense Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {addRows.map((row, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 text-sm text-gray-900">{idx + 1}</td>
                            <td className="px-4 py-3">
                              <select
                                value={row.ft_expense_master_id}
                                onChange={(e) => handleAddRowChange(idx, 'ft_expense_master_id', e.target.value)}
                                className="ti-form-select"
                                required
                              >
                                <option value="">Choose Expense Title</option>
                                {expenseMasters.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={row.expense_amount}
                                onChange={(e) => handleAddRowChange(idx, 'expense_amount', e.target.value)}
                                className="ti-form-input"
                                placeholder="Amount"
                                required
                              />
                            </td>
                            <td className="px-4 py-3">
                              {idx > 0 && (
                                <button type="button" onClick={() => handleRemoveRow(idx)} className="p-2 text-white bg-red-600 rounded-lg hover:bg-red-700" title="Remove">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4">
                    <button type="button" onClick={handleAddRow} className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-lg shadow-sm bg-blue-600 hover:bg-blue-700">
                      Add Row
                    </button>
                  </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Close</button>
                  <button type="submit" className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700">Add</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setIsEditModalOpen(false)} />
            <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="px-6 py-4 bg-blue-600 flex items-center justify-between">
                <h3 className="text-lg font-medium leading-6 text-white">Edit Fastrack Expenses</h3>
                <button className="text-white hover:text-gray-200" onClick={() => setIsEditModalOpen(false)}>
                  <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="px-6 py-5 bg-white space-y-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Academic Year</label>
                    <select
                      value={editForm.academic_year}
                      onChange={(e) => setEditForm({ ...editForm, academic_year: e.target.value })}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Expense Title <span className="text-red-500">*</span></label>
                    <select
                      value={editForm.ft_expense_master_id}
                      onChange={(e) => setEditForm({ ...editForm, ft_expense_master_id: e.target.value })}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Choose Expense Title</option>
                      {expenseMasters.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Expense Amount <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      value={editForm.expense_amount}
                      onChange={(e) => setEditForm({ ...editForm, expense_amount: e.target.value })}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Expense Amount"
                      required
                    />
                  </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700">Update</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}