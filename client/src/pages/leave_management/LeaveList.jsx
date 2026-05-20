import { useEffect, useMemo, useState } from 'react';
import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import {
	getDeanLeaveApplications,
	approveDeanLeaveApplication,
	rejectDeanLeaveApplication,
} from '../../api/deanApi';

function normalizeLeaveStatus(status) {
	return String(status || '').trim().toLowerCase();
}

function getStatusClass(status) {
	const normalized = normalizeLeaveStatus(status);
	if (normalized === 'pending') return 'bg-gray-500 text-white';
	if (normalized === 'recommended') return 'bg-yellow-500 text-white';
	if (normalized === 'approved') return 'bg-green-500 text-white';
	if (normalized === 'rejected') return 'bg-red-500 text-white';
	if (normalized === 'cancelled') return 'bg-red-500 text-white';
	return 'bg-gray-400 text-white';
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

export default function LeaveListPage() {
	const { token } = useAuth() || {};

	const [rows, setRows] = useState([]);
	const [month, setMonth] = useState(String(new Date().getMonth() + 1));
	const [year, setYear] = useState(String(new Date().getFullYear()));
	const [searchQuery, setSearchQuery] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [processing, setProcessing] = useState(false);
	const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

	const entriesPerPage = 10;

	const notify = (message, type = 'success') => {
		setNotification({ show: true, message, type });
	};

	const loadRows = async () => {
		if (!token) {
			setRows([]);
			setLoading(false);
			return;
		}

		setLoading(true);
		try {
			const response = await getDeanLeaveApplications(token, { month, year });
			const payload = response?.data?.data || {};
			const applications = Array.isArray(payload.applications) ? payload.applications : [];
			setRows(applications);
		} catch (error) {
			setRows([]);
			notify(error?.response?.data?.message || 'Failed to load leave list.', 'error');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadRows();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [token, month, year]);

	const filteredRows = useMemo(() => {
		const q = String(searchQuery || '').trim().toLowerCase();
		if (!q) return rows;

		return rows.filter((row) => {
			const hay = [
				String(row.id || ''),
				String(row.staff_name || ''),
				String(row.shortname || row.dept_name || ''),
				String(row.leave_shortname || row.title || ''),
				String(row.start_date || ''),
				String(row.end_date || ''),
				String(row.appl_status || ''),
				String(row.alternate_staff || ''),
			].join(' ').toLowerCase();
			return hay.includes(q);
		});
	}, [rows, searchQuery]);

	const totalEntries = filteredRows.length;
	const totalPages = Math.max(1, Math.ceil(totalEntries / entriesPerPage));

	const paginatedRows = useMemo(() => {
		const start = (currentPage - 1) * entriesPerPage;
		return filteredRows.slice(start, start + entriesPerPage);
	}, [filteredRows, currentPage]);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, month, year]);

	const handleApprove = async (applicationId) => {
		const confirmed = window.confirm('Are you sure you want to Approve this leave application?');
		if (!confirmed) return;

		setProcessing(true);
		try {
			await approveDeanLeaveApplication(token, applicationId);
			notify('Leave approved successfully.');
			await loadRows();
		} catch (error) {
			notify(error?.response?.data?.message || 'Failed to approve leave.', 'error');
		} finally {
			setProcessing(false);
		}
	};

	const handleReject = async (applicationId) => {
		const confirmed = window.confirm('Are you sure you want to Reject this leave application?');
		if (!confirmed) return;

		setProcessing(true);
		try {
			await rejectDeanLeaveApplication(token, applicationId);
			notify('Leave rejected successfully.');
			await loadRows();
		} catch (error) {
			notify(error?.response?.data?.message || 'Failed to reject leave.', 'error');
		} finally {
			setProcessing(false);
		}
	};

	const exportToCsv = () => {
		if (filteredRows.length === 0) {
			notify('No data to export.', 'error');
			return;
		}

		const headers = ['#', 'Application Date', 'Name', 'Department', 'Leave Type', 'Leave From', 'Leave To', 'No Of Days', 'Alternate', 'Status'];
		const csvRows = [headers.join(',')];

		filteredRows.forEach((row) => {
			const cols = [
				row.id,
				formatDateDMY(row.application_date),
				`"${String(row.staff_name || '').replace(/"/g, '""')}"`,
				`"${String(row.shortname || row.dept_name || '').replace(/"/g, '""')}"`,
				`"${String(row.leave_shortname || row.title || '').replace(/"/g, '""')}"`,
				formatDateDMY(row.start_date),
				formatDateDMY(row.end_date),
				Number(row.no_of_days || 0),
				`"${String(row.alternate_staff || '').replace(/"/g, '""')}"`,
				String(row.appl_status || ''),
			];
			csvRows.push(cols.join(','));
		});

		const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `Dean_Leaves_List_${year}_${month}.csv`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	};

	const currentYear = new Date().getFullYear();
	const yearOptions = [];
	for (let y = currentYear; y >= 2024; y -= 1) yearOptions.push(String(y));

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
							onClose={() => setNotification({ show: false, message: '', type: 'info' })}
						/>

						<div className="mb-12 text-center">
							<h1 className="mb-2 text-4xl font-extrabold text-gray-900">Staff Leaves List</h1>
							<p className="text-lg text-gray-600">Manage Dean Admin leave list with quick actions</p>
						</div>

						<div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
							<div className="flex items-center gap-3 w-full sm:w-auto">
								<div className="relative w-64">
									<input
										type="text"
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										placeholder="Search leave list..."
										className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									/>
									<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
								</div>
							</div>

							<div className="flex flex-wrap items-center gap-3">
									<label htmlFor="monthSelect" className="text-sm font-semibold text-slate-700">Select Month:</label>
									<select
										id="monthSelect"
										value={month}
										onChange={(e) => setMonth(e.target.value)}
										className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									>
										{Array.from({ length: 12 }).map((_, index) => {
											const monthValue = String(index + 1);
											const monthLabel = new Date(2024, index, 1).toLocaleString('en', { month: 'long' });
											return <option key={monthValue} value={monthValue}>{monthLabel}</option>;
										})}
									</select>

									<label htmlFor="yearSelect" className="text-sm font-semibold text-slate-700">Select Year:</label>
									<select
										id="yearSelect"
										value={year}
										onChange={(e) => setYear(e.target.value)}
										className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									>
										{yearOptions.map((yearValue) => (
											<option key={yearValue} value={yearValue}>{yearValue}</option>
										))}
									</select>

								<button
									type="button"
									onClick={exportToCsv}
									className="flex items-center justify-center px-4 py-2 font-medium text-white transition-all duration-300 transform rounded-lg shadow bg-green-600 hover:bg-green-700"
								>
									Export to CSV
								</button>
							</div>
						</div>

						<div className="mb-10 overflow-hidden bg-white shadow-xl rounded-xl">

							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-gray-200">
									<thead className="bg-blue-600">
										<tr>
											<th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">S.NO</th>
											<th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Application Date</th>
											<th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Name</th>
											<th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Department</th>
											<th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Leave Type</th>
											<th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Leave From</th>
											<th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Leave To</th>
											<th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">No Of Days</th>
											<th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Alternate</th>
											<th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
											<th className="px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">Actions</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{loading ? (
											<tr>
												<td colSpan={11} className="px-6 py-12 text-center text-gray-500">Loading leave list...</td>
											</tr>
										) : paginatedRows.length === 0 ? (
											<tr>
												<td colSpan={11} className="px-6 py-12 text-center text-gray-500">No leave applications found</td>
											</tr>
										) : (
											paginatedRows.map((row) => {
												const status = normalizeLeaveStatus(row.appl_status || row.status);
												const canAct = status === 'recommended';

												return (
													<tr key={row.id} className="hover:bg-blue-50 transition-colors duration-150">
														<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.id}</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDateDMY(row.application_date)}</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.staff_name || 'N/A'}</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.shortname || '-'}</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.leave_shortname || row.title || 'N/A'}</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDateDMY(row.start_date)}</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDateDMY(row.end_date)}</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{Number(row.no_of_days || 0)}</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.alternate_staff || 'N/A'}</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm">
															<span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${getStatusClass(row.appl_status)}`}>
																{row.appl_status || 'N/A'}
															</span>
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
															{canAct ? (
																<div className="flex items-center justify-center space-x-2">
																	<button
																		type="button"
																		disabled={processing}
																		onClick={() => handleApprove(row.id)}
																		className="p-2 text-white transition-colors duration-200 bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
																		title="Approve"
																	>
																		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9.9997 15.1709L19.1921 5.97852L20.6063 7.39273L9.9997 17.9993L3.63574 11.6354L5.04996 10.2212L9.9997 15.1709Z"></path></svg>
																	</button>
																	<button
																		type="button"
																		disabled={processing}
																		onClick={() => handleReject(row.id)}
																		className="p-2 text-white transition-colors duration-200 bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
																		title="Reject"
																	>
																		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11.9997 10.5855L16.9495 5.63574L18.3637 7.04996L13.4139 11.9997L18.3637 16.9495L16.9495 18.3637L11.9997 13.4139L7.04996 18.3637L5.63574 16.9495L10.5855 11.9997L5.63574 7.04996L7.04996 5.63574L11.9997 10.5855Z"></path></svg>
																	</button>
																</div>
															) : status === 'pending' ? (
																<span className="text-xs text-slate-500">Waiting for Recommendation</span>
															) : (
																<span className="text-xs text-slate-400">-</span>
															)}
														</td>
													</tr>
												);
											})
										)}
									</tbody>
								</table>
							</div>

							{filteredRows.length > entriesPerPage && (
								<div className="flex justify-end items-center gap-2 px-6 pb-6">
									<button
										type="button"
										className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
										onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
										disabled={currentPage === 1}
									>
										Prev
									</button>
									<span className="text-sm text-gray-700">
										Page {currentPage} of {Math.ceil(filteredRows.length / entriesPerPage)}
									</span>
									<button
										type="button"
										className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
										onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
										disabled={currentPage >= totalPages}
									>
										Next
									</button>
								</div>
							)}
						</div>
					</div>
				</main>
			</div>
		</div>
	);
}
