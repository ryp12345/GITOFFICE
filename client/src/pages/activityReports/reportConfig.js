// Column, filter and document metadata for every page under the HOD and e-Governance admin
// "Professional Activity" and "Research" menus. Each entry follows the matching Laravel blade in
// resources/views/{HOD,egov}/..., keyed by the server report it reads.
//
// column.type:
//   'staff'      - fname mname lname of the owning staff member
//   'egov'       - E-Gov ID, linked to the uploaded document
//   'date'       - dd-Mon-yyyy
//   'link'       - external URL
// column.naWhen(row) - Laravel printed --NA-- instead of the value when this holds.
//
// dateFilter.mode:
//   'span'   - row[from] >= From and row[to] <= To (an activity with a start and an end date)
//   'within' - every listed column lies inside [From, To]

const PA_ATTENDED_FOLDER = '/uploads/professional_activity/attended';
const PA_CONDUCTED_FOLDER = '/uploads/professional_activity/conducted';
const researchFolder = (name) => `/uploads/research/${name}`;

const STANDARD_LEVELS = ['Q1', 'Q2', 'Q3', 'Q4', 'SCI', 'Web of Science', 'Scopus Indexed', 'UGC General'];

const notSponsored = (row) => row.sponsored === 'No';
const isBook = (row) => row.type === 'Book';
const hasStandardLevel = (row) => STANDARD_LEVELS.includes(row.level);

const STAFF = { key: 'staff_name', label: 'Staff Name', type: 'staff' };
const EGOV = { key: 'egov_id', label: 'E-Gov ID', type: 'egov' };
const FROM_DATE = { key: 'from_date', label: 'From Date', type: 'date' };
const TO_DATE = { key: 'to_date', label: 'To Date', type: 'date' };
const NO_OF_DAYS = { key: 'no_of_days', label: 'No Of Days' };

const SPAN_FILTER = { mode: 'span', from: 'from_date', to: 'to_date', fromLabel: 'From Date', toLabel: 'To Date' };

export const DEPARTMENT_REPORTS = {
  'pa-attended-teaching': {
    title: 'Professional Activity Attended',
    group: 'Professional Activity · Teaching',
    documentFolder: PA_ATTENDED_FOLDER,
    exportName: 'attended_data',
    dateFilter: SPAN_FILTER,
    columns: [
      STAFF,
      EGOV,
      { key: 'title', label: 'Title', wrap: true },
      { key: 'role', label: 'Role' },
      { key: 'level', label: 'Level' },
      { key: 'organizer', label: 'Organizer', wrap: true },
      { key: 'category', label: 'Category' },
      FROM_DATE,
      TO_DATE,
      NO_OF_DAYS,
      { key: 'sponsored', label: 'Sponsored' },
      { key: 'sponsored_by', label: 'Sponsored By', naWhen: notSponsored, wrap: true },
    ],
  },

  'pa-conducted-teaching': {
    title: 'Professional Activity Conducted',
    group: 'Professional Activity · Teaching',
    documentFolder: PA_CONDUCTED_FOLDER,
    exportName: 'conducted_data',
    dateFilter: SPAN_FILTER,
    columns: [
      STAFF,
      EGOV,
      { key: 'title', label: 'Title', wrap: true },
      { key: 'role', label: 'Role' },
      { key: 'level', label: 'Level' },
      { key: 'organizer', label: 'Organizer', wrap: true },
      { key: 'category', label: 'Category' },
      FROM_DATE,
      TO_DATE,
      NO_OF_DAYS,
      { key: 'sponsored', label: 'Sponsored' },
      { key: 'sponsoring_agency_name_address', label: 'Sponsoring Agency Name And Address', naWhen: notSponsored, wrap: true },
      { key: 'place', label: 'Place' },
    ],
  },

  'pa-attended-nonteaching': {
    title: 'Professional Activity Attended',
    group: 'Professional Activity · Non-Teaching',
    documentFolder: PA_ATTENDED_FOLDER,
    exportName: 'nt_attended_data',
    dateFilter: SPAN_FILTER,
    columns: [
      STAFF,
      EGOV,
      { key: 'title', label: 'Title', wrap: true },
      { key: 'role', label: 'Role' },
      { key: 'level', label: 'Level' },
      { key: 'category', label: 'Category' },
      FROM_DATE,
      TO_DATE,
      NO_OF_DAYS,
      { key: 'organizer', label: 'Organizer', wrap: true },
      { key: 'sponsored', label: 'Sponsored' },
      { key: 'sponsored_by', label: 'Sponsored By', naWhen: notSponsored, wrap: true },
    ],
  },

  'pa-conducted-nonteaching': {
    title: 'Professional Activity Conducted',
    group: 'Professional Activity · Non-Teaching',
    documentFolder: PA_CONDUCTED_FOLDER,
    exportName: 'nt_conducted_data',
    dateFilter: SPAN_FILTER,
    columns: [
      STAFF,
      EGOV,
      { key: 'title', label: 'Title', wrap: true },
      { key: 'role', label: 'Role' },
      { key: 'level', label: 'Level' },
      { key: 'category', label: 'Category' },
      FROM_DATE,
      TO_DATE,
      NO_OF_DAYS,
      { key: 'organizer', label: 'Organizer', wrap: true },
      { key: 'sponsored', label: 'Sponsored' },
      { key: 'sponsoring_agency_name_address', label: 'Sponsoring Agency Name And Address', naWhen: notSponsored, wrap: true },
    ],
  },

  'conference-attended': {
    title: 'Conference Attended',
    group: 'Research · Conference',
    documentFolder: researchFolder('Conference_Attended'),
    exportName: 'conference_attended_data',
    dateFilter: SPAN_FILTER,
    columns: [
      STAFF,
      EGOV,
      { key: 'conference_name', label: 'Conference Name', wrap: true },
      { key: 'attended_as', label: 'Attended As' },
      FROM_DATE,
      TO_DATE,
      NO_OF_DAYS,
      { key: 'title', label: 'Title', wrap: true },
      { key: 'place', label: 'Place' },
      { key: 'sponsored', label: 'Sponsored' },
      { key: 'sponsored_by', label: 'Sponsored By', naWhen: notSponsored },
      { key: 'amount', label: 'Amount' },
      { key: 'weblink', label: 'Web-Link', type: 'link' },
      { key: 'type_of_level', label: 'Type Of Level' },
      { key: 'issn_no', label: 'ISSN No' },
    ],
  },

  'conference-conducted': {
    title: 'Conference Conducted',
    group: 'Research · Conference',
    documentFolder: researchFolder('Conference_Conducted'),
    exportName: 'conference_conducted_data',
    dateFilter: SPAN_FILTER,
    columns: [
      STAFF,
      EGOV,
      { key: 'conference_name', label: 'Conference Name', wrap: true },
      { key: 'co_organizer', label: 'Co Organizer' },
      { key: 'no_of_participants', label: 'No Of Participants' },
      FROM_DATE,
      TO_DATE,
      NO_OF_DAYS,
      { key: 'place', label: 'Place' },
      { key: 'publisher', label: 'Publisher' },
      { key: 'weblink', label: 'Web-Link', type: 'link' },
      { key: 'type_of_level', label: 'Type Of Level' },
      { key: 'issn_no', label: 'ISSN No' },
      { key: 'role', label: 'Role' },
      { key: 'sponsored', label: 'Sponsored' },
      { key: 'sponsoring_agency', label: 'Sponsoring Agency', naWhen: notSponsored },
    ],
  },

  publication: {
    title: 'Publication',
    group: 'Research',
    documentFolder: researchFolder('Publications'),
    exportName: 'publication_data',
    dateFilter: { mode: 'within', columns: ['date'], fromLabel: 'Date Of Publication', toLabel: 'To Date Of Publication' },
    columns: [
      STAFF,
      EGOV,
      { key: 'level', label: 'Level' },
      { key: 'other_level', label: 'Other Level', naWhen: hasStandardLevel },
      { key: 'title', label: 'Title', wrap: true },
      { key: 'date', label: 'Date Of Publication', type: 'date' },
      { key: 'journal', label: 'Name Of Journal', wrap: true },
      { key: 'doi_number', label: 'DOI No' },
      { key: 'link', label: 'Web-Link', type: 'link' },
      { key: 'role', label: 'Role' },
    ],
  },

  'funded-project': {
    title: 'Funded Project',
    group: 'Research',
    documentFolder: researchFolder('fundedproject'),
    exportName: 'funded_project_data',
    dateFilter: { mode: 'within', columns: ['application_date'], fromLabel: 'Application Date', toLabel: 'To Application Date' },
    columns: [
      STAFF,
      EGOV,
      { key: 'proposal_title', label: 'Proposal Title', wrap: true },
      { key: 'role', label: 'Role' },
      { key: 'amount', label: 'Amount' },
      { key: 'type', label: 'Type' },
      { key: 'proposal_status', label: 'Proposal Status' },
      { key: 'application_date', label: 'Application Date', type: 'date' },
      { key: 'fund_received', label: 'Fund Received' },
      { key: 'project_status', label: 'Project Status' },
      { key: 'completion_year', label: 'Completion Year' },
    ],
  },

  'book-chapter': {
    title: 'Book Chapter',
    group: 'Research',
    documentFolder: researchFolder('Book_Chapters'),
    exportName: 'book_chapter_data',
    dateFilter: { mode: 'within', columns: ['date'], fromLabel: 'From Date', toLabel: 'To Date' },
    columns: [
      STAFF,
      EGOV,
      { key: 'title', label: 'Title', wrap: true },
      { key: 'book_level', label: 'Book Level' },
      { key: 'publisher_name', label: 'Publisher Name' },
      { key: 'edition', label: 'Edition' },
      { key: 'doi', label: 'DOI Number' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'issue', label: 'Issue' },
      { key: 'type', label: 'Type' },
      { key: 'chapter_title', label: 'Chapter Title', naWhen: isBook, wrap: true },
      { key: 'start_page_no', label: 'Start Page No', naWhen: isBook },
      { key: 'end_page_no', label: 'End Page No', naWhen: isBook },
    ],
  },

  consultancy: {
    title: 'Consultancy',
    group: 'Research',
    documentFolder: researchFolder('Consultancy'),
    exportName: 'consultancy_data',
    dateFilter: SPAN_FILTER,
    columns: [
      STAFF,
      EGOV,
      { key: 'consultancy_title', label: 'Consultancy Title', wrap: true },
      { key: 'agency', label: 'Agency', wrap: true },
      FROM_DATE,
      TO_DATE,
      { key: 'amount', label: 'Amount' },
    ],
  },

  patent: {
    title: 'Patents',
    group: 'Research',
    documentFolder: researchFolder('patents'),
    exportName: 'patent_data',
    dateFilter: { mode: 'within', columns: ['appl_date', 'publication_date'], fromLabel: 'Application Date', toLabel: 'Publication Date' },
    columns: [
      STAFF,
      EGOV,
      { key: 'appl_no', label: 'Application No' },
      { key: 'appl_date', label: 'Application Date', type: 'date' },
      { key: 'publication_date', label: 'Publication Date', type: 'date' },
      { key: 'title', label: 'Title', wrap: true },
      { key: 'status', label: 'Status' },
      { key: 'stream_domain', label: 'Stream/Domain' },
      { key: 'patent_no', label: 'Patent No' },
      { key: 'publication_no', label: 'Publication No' },
    ],
  },

  copyright: {
    title: 'Copyrights',
    group: 'Research',
    documentFolder: researchFolder('Copyrights'),
    exportName: 'copyright_data',
    dateFilter: { mode: 'within', columns: ['copyright_date'], fromLabel: 'Copyright Date', toLabel: 'To Copyright Date' },
    columns: [
      STAFF,
      EGOV,
      { key: 'copyright_title', label: 'Copyright Title', wrap: true },
      { key: 'copyright_date', label: 'Copyright Date', type: 'date' },
      { key: 'author_name', label: 'Author Name' },
      { key: 'status', label: 'Status' },
      { key: 'description', label: 'Description', wrap: true },
    ],
  },

  achievement: {
    title: 'Achievements',
    group: 'Research',
    documentFolder: researchFolder('Achievement'),
    exportName: 'achievement_data',
    dateFilter: null,
    columns: [
      STAFF,
      { key: 'award', label: 'Award', wrap: true },
      { key: 'year', label: 'Year' },
      { key: 'awarding_body', label: 'Awarding Body', wrap: true },
      { key: 'details', label: 'Details', wrap: true },
    ],
  },

  'reviewer-editor': {
    title: 'Reviewer/Editor',
    group: 'Research',
    documentFolder: researchFolder('Review_Editor'),
    exportName: 'reviewer_editor_data',
    dateFilter: { mode: 'within', columns: ['reviewed_date'], fromLabel: 'Review Date', toLabel: 'To Review Date' },
    columns: [
      STAFF,
      EGOV,
      { key: 'level', label: 'Level' },
      { key: 'other_level', label: 'Other Level', naWhen: hasStandardLevel },
      { key: 'title', label: 'Title', wrap: true },
      { key: 'reviewed_date', label: 'Review Date', type: 'date' },
      { key: 'journal_name', label: 'Journal Name', wrap: true },
      { key: 'publisher_name', label: 'Publisher Name' },
      { key: 'category', label: 'Category' },
    ],
  },
};
