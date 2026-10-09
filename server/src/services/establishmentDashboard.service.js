const establishmentModel = require('../models/establishmentDashboard.model');
const principalModel = require('../models/principalDashboard.model');
const { getAttendanceSummary, toYmd } = require('./principalDashboard.service');

const LIST_LIMIT = 8;

async function getLeaveToday(todayYmd) {
  const weekAhead = new Date();
  weekAhead.setDate(weekAhead.getDate() + 7);
  const rows = await principalModel.getLeaveBetween(todayYmd, toYmd(weekAhead));
  const today = rows.filter((a) => a.start_date <= todayYmd && a.end_date >= todayYmd);
  return {
    on_leave_today: today.length,
    on_leave_today_list: today.slice(0, LIST_LIMIT),
    starting_next_7_days: rows.filter((a) => a.start_date > todayYmd).length,
  };
}

async function getDashboard() {
  const now = new Date();
  const todayYmd = toYmd(now);
  const year = now.getFullYear();

  const [staff, composition, events, quality, pipeline, leaveToday, holidays, attendance] = await Promise.all([
    principalModel.getStaffSummary(),
    establishmentModel.getComposition(year),
    establishmentModel.getServiceEvents(year, todayYmd),
    establishmentModel.getDataQuality(year),
    establishmentModel.getLeavePipeline(todayYmd),
    getLeaveToday(todayYmd),
    establishmentModel.getUpcomingHolidays(todayYmd),
    getAttendanceSummary(todayYmd).catch(() => ({ available: false, off_day: null })),
  ]);

  return {
    date: todayYmd,
    year,
    staff: { ...staff, ...composition },
    attendance,
    leave: { ...pipeline, ...leaveToday },
    service_events: events,
    data_quality: quality,
    holidays,
  };
}

module.exports = {
  getDashboard,
};

// Staff behind one "Staff Records to Complete" count.
async function getDataQualityStaff(check) {
  const rows = await establishmentModel.getDataQualityStaff(check, new Date().getFullYear());
  if (rows === null) {
    const error = new Error('Unknown data quality check');
    error.statusCode = 400;
    throw error;
  }
  return rows;
}

module.exports.getDataQualityStaff = getDataQualityStaff;
