const dashboardModel = require('../models/principalDashboard.model');
const LeaveRules = require('./leaveRules.service');
const { getPunchedEmployeeCodes, isWeeklyOff } = require('./biometric.service');

const LIST_LIMIT = 8;

function toYmd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
}

// Dean Admin approves short leave (< 5 days); the Principal approves longer leave and
// leave of staff holding an additional designation. Same rules as the leave approval pages.
function approverRole(user) {
  return normalizeRole(user?.role) === 'deanadmin' ? 'dean' : 'principal';
}

function pickLeaveRow(a) {
  return {
    id: a.id,
    staff_name: a.staff_name,
    dept_shortname: a.dept_shortname,
    leave_shortname: a.leave_shortname,
    no_of_days: Number(a.no_of_days) || 0,
    start_date: a.start_date,
    end_date: a.end_date,
    appl_status: a.appl_status,
  };
}

async function getLeaveSummary(user, todayYmd) {
  const role = approverRole(user);
  const weekAhead = new Date();
  weekAhead.setDate(weekAhead.getDate() + 7);
  const weekAheadYmd = toYmd(weekAhead);

  const [open, upcoming] = await Promise.all([
    dashboardModel.getOpenLeaveApplications(),
    dashboardModel.getLeaveBetween(todayYmd, weekAheadYmd),
  ]);

  const annotated = await LeaveRules.annotateApplications(open, role);
  const awaiting = annotated.filter((a) => a.can_approve);
  // Leave that has not ended yet still needs a timely decision; the rest is old backlog.
  const current = awaiting.filter((a) => a.end_date >= todayYmd);
  const backlog = awaiting.filter((a) => a.end_date < todayYmd);

  const onLeaveToday = upcoming.filter((a) => a.start_date <= todayYmd && a.end_date >= todayYmd);
  const startingSoon = upcoming.filter((a) => a.start_date > todayYmd);

  const byDept = new Map();
  onLeaveToday.forEach((a) => {
    const key = a.dept_shortname || 'Not set';
    byDept.set(key, (byDept.get(key) || 0) + 1);
  });

  return {
    approver: role,
    awaiting_total: awaiting.length,
    awaiting_current: current.length,
    awaiting_backlog: backlog.length,
    oldest_backlog_date: backlog.length ? backlog[0].start_date : null,
    awaiting_list: current.slice(0, LIST_LIMIT).map(pickLeaveRow),
    on_leave_today: onLeaveToday.length,
    on_leave_today_list: onLeaveToday.slice(0, LIST_LIMIT).map(pickLeaveRow),
    on_leave_today_by_department: [...byDept.entries()]
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count),
    starting_next_7_days: startingSoon.length,
  };
}

async function getAttendanceSummary(todayYmd) {
  const today = new Date();
  const holiday = await dashboardModel.isHoliday(todayYmd);
  const offDay = holiday || (isWeeklyOff(today) ? 'Weekly off' : null);

  const roster = await dashboardModel.getAttendanceRoster(todayYmd);
  let punched;
  try {
    punched = await getPunchedEmployeeCodes(todayYmd);
  } catch (e) {
    return { available: false, off_day: offDay };
  }

  const departments = new Map();
  let present = 0;
  let onLeave = 0;
  let missing = 0;
  for (const r of roster) {
    const dept = departments.get(r.department) || { department: r.department, expected: 0, present: 0, on_leave: 0, missing: 0 };
    dept.expected += 1;
    if (punched.has(String(r.employeecode).trim())) { dept.present += 1; present += 1; }
    else if (r.on_leave) { dept.on_leave += 1; onLeave += 1; }
    else { dept.missing += 1; missing += 1; }
    departments.set(r.department, dept);
  }

  return {
    available: true,
    off_day: offDay,
    expected: roster.length,
    present,
    on_leave: onLeave,
    // On a holiday / weekly off nobody is expected, so missing punches are not meaningful.
    missing: offDay ? null : missing,
    by_department: [...departments.values()]
      .map((d) => ({ ...d, missing: offDay ? null : d.missing }))
      .sort((a, b) => (b.missing || 0) - (a.missing || 0) || b.expected - a.expected),
  };
}

async function getDashboard(user) {
  const todayYmd = toYmd(new Date());
  const [staff, leave, attendance, recruitment] = await Promise.all([
    dashboardModel.getStaffSummary(),
    getLeaveSummary(user, todayYmd),
    getAttendanceSummary(todayYmd).catch(() => ({ available: false, off_day: null })),
    dashboardModel.getRecruitmentSummary(),
  ]);
  return { date: todayYmd, staff, leave, attendance, recruitment };
}

module.exports = {
  getDashboard,
  getAttendanceSummary,
  toYmd,
};
