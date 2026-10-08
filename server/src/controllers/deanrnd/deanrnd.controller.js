const deanrndModel = require('../../models/deanrnd.model');
const announcementsModel = require('../../models/announcements.model');
const reportsModel = require('../../models/departmentActivityReports.model');

// The Dean R&D sees every department: report queries run with no department (null), over
// staff who are active in some department, exactly as DeanRndController /
// DeanrndResearchController did.
const ALL_DEPARTMENTS = null;

const ACTIVITY_REPORTS = [
  'pa-attended-teaching',
  'pa-conducted-teaching',
  'pa-attended-nonteaching',
  'pa-conducted-nonteaching',
];

// The reports Laravel added up for the "Research Activities" card.
const RESEARCH_REPORTS = [
  'conference-attended',
  'conference-conducted',
  'publication',
  'funded-project',
  'patent',
  'copyright',
  'achievement',
  'book-chapter',
  'consultancy',
  'reviewer-editor',
];

// GET /api/deanrnd/dashboard
async function getDashboard(_req, res, next) {
  try {
    const [totals, fundsReceived, gitSponsoredEvents, phdCompleted, phdPursuing, events, notices] = await Promise.all([
      reportsModel.countDepartmentRecords([...ACTIVITY_REPORTS, ...RESEARCH_REPORTS], ALL_DEPARTMENTS),
      deanrndModel.totalFundsReceived(),
      deanrndModel.gitSponsoredEventCount(),
      deanrndModel.listPhdStaff('Completed'),
      deanrndModel.listPhdStaff('Persuing'),
      announcementsModel.listEvents(),
      announcementsModel.listNotices(),
    ]);

    const researchActivities = RESEARCH_REPORTS.reduce((sum, key) => sum + (totals[key] || 0), 0);

    res.json({
      success: true,
      data: {
        summary: {
          scholars: phdCompleted.length,
          researchScholars: phdPursuing.length,
          researchActivities,
          gitSponsoredEvents,
          fundsReceived,
        },
        totals,
        phdCompleted,
        phdPursuing,
        events,
        notices,
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/deanrnd/reports/:report
async function getReport(req, res, next) {
  try {
    reportsModel.getReport(req.params.report);
    const { rows, counts } = await reportsModel.listDepartmentReport(req.params.report, ALL_DEPARTMENTS, {
      activeMembersOnly: true,
    });

    res.json({ success: true, data: { department: null, rows, counts } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard,
  getReport,
};
