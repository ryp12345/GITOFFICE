const { pool } = require('../../config/db');
const { normalizeDateColumns } = require('../../utils/pgDate');

// Every DATE column across the professional activity and research tables.
const DATE_COLUMNS = [
  'from_date',
  'to_date',
  'date',
  'application_date',
  'appl_date',
  'publication_date',
  'copyright_date',
  'reviewed_date',
];

// Read-only department reports behind the HOD "Professional Activity" and "Research" menus.
// Laravel served each one from its own near-identical query in HodController /
// HodResearchController; here one registry describes the table, how a record reaches its
// staff, which employee type it belongs to and which count cards sit above the table.
//
// ownership:
//   { pivot, fk } - the record is shared through <pivot>.<fk> (attended/conducted tables)
//   null          - the record carries staff_id
//
// activeListOnly: Laravel only joined department_staff.status = 'active' into the listing for
// these reports. The research listings also show records of staff who have since left the
// department, while every count card counts active members only. Both behaviours are kept.

const PA_CATEGORY_COUNTS_TEACHING = [
  { label: 'Seminar', column: 'category', value: 'Seminar' },
  { label: 'Webinar', column: 'category', value: 'Webinar' },
  { label: 'Certification', column: 'category', value: 'Certification Program' },
  { label: 'Workshop', column: 'category', value: 'Workshop' },
  { label: 'FDP', column: 'category', value: 'FDP' },
  { label: 'STTP', column: 'category', value: 'STTP' },
  { label: 'MDP/EDP', column: 'category', value: 'MDP/EDP' },
  { label: 'Hackathon', column: 'category', value: 'Hackathon' },
  { label: 'Space-Talk', column: 'category', value: 'Space-Talk' },
  { label: 'Site Visit', column: 'category', value: 'Site Visit' },
];

const PA_CATEGORY_COUNTS_NON_TEACHING = [
  { label: 'Seminar', column: 'category', value: 'Seminar' },
  { label: 'Webinar', column: 'category', value: 'Webinar' },
  { label: 'Certification Program', column: 'category', value: 'Certification Program' },
  { label: 'Hackathon', column: 'category', value: 'Hackathon' },
];

const PA_ATTENDED = {
  table: 'professional_activity_attendees',
  ownership: { pivot: 'professional_activity_attendee_staff', fk: 'professional_activity_attendee_id' },
  activeListOnly: true,
  orderBy: 'from_date',
};

const PA_CONDUCTED = {
  table: 'professional_activity_conducteds',
  ownership: { pivot: 'professional_activity_conducted_staff', fk: 'professional_activity_conducted_id' },
  activeListOnly: true,
  orderBy: 'from_date',
};

const REPORTS = {
  'pa-attended-teaching': { ...PA_ATTENDED, employeeType: 'Teaching', counts: PA_CATEGORY_COUNTS_TEACHING },
  'pa-conducted-teaching': { ...PA_CONDUCTED, employeeType: 'Teaching', counts: PA_CATEGORY_COUNTS_TEACHING },
  'pa-attended-nonteaching': { ...PA_ATTENDED, employeeType: 'Non-Teaching', counts: PA_CATEGORY_COUNTS_NON_TEACHING },
  'pa-conducted-nonteaching': { ...PA_CONDUCTED, employeeType: 'Non-Teaching', counts: PA_CATEGORY_COUNTS_NON_TEACHING },

  'conference-attended': {
    table: 'conferences_attendees',
    ownership: { pivot: 'conferences_attendee_staff', fk: 'conferences_attendee_id' },
    employeeType: 'Teaching',
    orderBy: 'from_date',
    counts: [
      { label: 'Resource Person', column: 'attended_as', value: 'Resource Person' },
      { label: 'Paper Presenter', column: 'attended_as', value: 'Paper Presenter' },
      { label: 'Participant', column: 'attended_as', value: 'Participant' },
      { label: 'National', column: 'type_of_level', value: 'National' },
      { label: 'International', column: 'type_of_level', value: 'International' },
      // Laravel compared type_of_level here, which can never hold this value, so the card
      // always read 0. "Session Chair" is an attended_as role.
      { label: 'Session Chair', column: 'attended_as', value: 'Session Chair' },
    ],
  },
  'conference-conducted': {
    table: 'conferences_conducteds',
    ownership: { pivot: 'conferences_conducted_staff', fk: 'conferences_conducted_id' },
    employeeType: 'Teaching',
    orderBy: 'from_date',
    counts: [
      { label: 'National', column: 'type_of_level', value: 'National' },
      { label: 'International', column: 'type_of_level', value: 'International' },
      { label: 'Convener', column: 'role', value: 'Convener' },
      { label: 'Co-Convener', column: 'role', value: 'Co-convener' },
      { label: 'Team Member', column: 'role', value: 'Team Member' },
      { label: 'Coordinator', column: 'role', value: 'Coordinator' },
    ],
  },
  publication: {
    table: 'publications',
    ownership: null,
    employeeType: 'Teaching',
    orderBy: 'date',
    counts: [
      { label: 'Q1', column: 'level', value: 'Q1' },
      { label: 'Q2', column: 'level', value: 'Q2' },
      { label: 'Q3', column: 'level', value: 'Q3' },
      { label: 'Q4', column: 'level', value: 'Q4' },
      { label: 'Web of Science', column: 'level', value: 'Web of Science' },
      { label: 'Scopus Indexed', column: 'level', value: 'Scopus Indexed' },
      { label: 'UGC General', column: 'level', value: 'UGC General' },
      { label: 'SCI', column: 'level', value: 'SCI' },
      { label: 'Author', column: 'role', value: 'Author' },
      { label: 'Co-Author', column: 'role', value: 'Co-Author' },
      { label: 'Corresponding-Author', column: 'role', value: 'Corresponding-Author' },
    ],
  },
  'funded-project': {
    table: 'funded_projects',
    ownership: null,
    employeeType: 'Teaching',
    orderBy: 'application_date',
    counts: [
      { label: 'Govt Funded', column: 'type', value: 'Govt-funded' },
      { label: 'Private Funded', column: 'type', value: 'Private funded' },
      { label: 'Principle Investigator', column: 'role', value: 'Principle Investigator' },
      { label: 'Co-Investigator', column: 'role', value: 'Co-Investigator' },
      { label: 'Architect', column: 'role', value: 'Architect' },
    ],
  },
  'book-chapter': {
    table: 'book_publications',
    ownership: null,
    employeeType: 'Teaching',
    orderBy: 'date',
    counts: [
      { label: 'National', column: 'book_level', value: 'National' },
      { label: 'International', column: 'book_level', value: 'International' },
      { label: 'Book', column: 'type', value: 'Book' },
      { label: 'Chapter', column: 'type', value: 'Chapter' },
    ],
  },
  consultancy: {
    table: 'consultancies',
    ownership: null,
    employeeType: 'Teaching',
    orderBy: 'from_date',
    counts: [],
  },
  patent: {
    table: 'patents',
    ownership: null,
    employeeType: 'Teaching',
    orderBy: 'appl_date',
    counts: [
      { label: 'Granted', column: 'status', value: 'Granted' },
      { label: 'Pending', column: 'status', value: 'Pending' },
      { label: 'Rejected', column: 'status', value: 'Rejected' },
      { label: 'Awarded', column: 'status', value: 'Awarded' },
      { label: 'Published', column: 'status', value: 'Published' },
    ],
  },
  copyright: {
    table: 'copyrights',
    ownership: null,
    employeeType: 'Teaching',
    orderBy: 'copyright_date',
    counts: [
      { label: 'Applied', column: 'status', value: 'Applied' },
      { label: 'Awarded', column: 'status', value: 'Awarded' },
    ],
  },
  achievement: {
    table: 'general_achievements',
    ownership: null,
    employeeType: 'Teaching',
    activeListOnly: true,
    orderBy: 'year',
    counts: [],
  },
  'reviewer-editor': {
    table: 'reviewer_editors',
    ownership: null,
    employeeType: 'Teaching',
    orderBy: 'reviewed_date',
    counts: [
      { label: 'Q1', column: 'level', value: 'Q1' },
      { label: 'Q2', column: 'level', value: 'Q2' },
      { label: 'Q3', column: 'level', value: 'Q3' },
      { label: 'Q4', column: 'level', value: 'Q4' },
      { label: 'Web of Science', column: 'level', value: 'Web of Science' },
      { label: 'Scopus Indexed', column: 'level', value: 'Scopus Indexed' },
    ],
  },
};

function getReport(key) {
  const report = Object.prototype.hasOwnProperty.call(REPORTS, key) ? REPORTS[key] : null;
  if (!report) {
    const error = new Error('Unknown report');
    error.statusCode = 404;
    throw error;
  }
  return report;
}

// MySQL compared these enum strings case-insensitively and ignored trailing spaces, which the
// Laravel counts relied on (e.g. level = "Q1 "). Normalising both sides keeps the same totals.
function normalize(value) {
  return value == null ? '' : String(value).trim().toLowerCase();
}

// One row per (record, staff member) pair. Membership and employee type are tested with
// EXISTS rather than joins, so a staff member with several department_staff or employee_types
// rows does not duplicate their records the way the Laravel joins could.
async function listDepartmentReport(reportKey, departmentId) {
  const report = getReport(reportKey);

  const ownerJoin = report.ownership
    ? `JOIN ${report.ownership.pivot} p ON p.${report.ownership.fk} = r.id
       JOIN staff s ON s.id = p.staff_id`
    : 'JOIN staff s ON s.id = r.staff_id';

  const activeMembership = `EXISTS (
      SELECT 1 FROM department_staff ds
       WHERE ds.staff_id = s.id
         AND ds.department_id = $1
         AND LOWER(COALESCE(ds.status, 'active')) = 'active'
    )`;

  const anyMembership = `EXISTS (
      SELECT 1 FROM department_staff ds
       WHERE ds.staff_id = s.id
         AND ds.department_id = $1
    )`;

  const { rows } = await pool.query(
    `SELECT DISTINCT ON (r.${report.orderBy}, r.id, s.id)
            r.*,
            s.id AS owner_staff_id,
            s.fname,
            s.mname,
            s.lname,
            ${activeMembership} AS is_active_member
       FROM ${report.table} r
       ${ownerJoin}
      WHERE ${report.activeListOnly ? activeMembership : anyMembership}
        AND EXISTS (
              SELECT 1 FROM employee_types et
               WHERE et.staff_id = s.id
                 AND LOWER(et.employee_type) = LOWER($2)
            )
      ORDER BY r.${report.orderBy} DESC NULLS LAST, r.id DESC, s.id`,
    [departmentId, report.employeeType]
  );

  rows.forEach((row) => normalizeDateColumns(row, DATE_COLUMNS));

  const activeRows = rows.filter((row) => row.is_active_member);
  const counts = report.counts.map((card) => ({
    label: card.label,
    count: activeRows.filter((row) => normalize(row[card.column]) === normalize(card.value)).length,
  }));

  return { rows, counts };
}

module.exports = {
  REPORTS,
  getReport,
  listDepartmentReport,
};
