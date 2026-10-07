// Field-level metadata for every Research menu. Each entry declares the columns the Laravel
// blade rendered, the inputs its form posted, and the option lists its FormRequest allowed.

export const ATTENDEE_ROLES = ['Resource Person', 'Paper Presenter', 'Participant', 'Session Chair'];
export const CONDUCTED_ROLES = ['Convener', 'Co-convener', 'Team Member', 'Coordinator'];
export const LEVELS = ['Q1', 'Q2', 'Q3', 'Q4', 'SCI', 'Web of Science', 'Scopus Indexed', 'UGC General', 'Other'];
export const CATEGORIES = ['Journal', 'Conference Proceeding'];
export const PUBLICATION_TYPES = ['Journal', 'Conference Proceeding'];
export const PUBLICATION_ROLES = ['Author', 'Co-Author', 'Corresponding-Author'];
export const BOOK_LEVELS = ['National', 'International'];
export const BOOK_TYPES = ['Book', 'Chapter'];
export const FUNDED_ROLES = ['Principle Investigator', 'Co-Investigator', 'Architect'];
export const FUNDED_TYPES = ['Govt-funded', 'Private funded'];
export const PROPOSAL_STATUSES = ['Accepted', 'Pending', 'Rejected'];
export const PROJECT_STATUSES = ['On-Going', 'Completed'];
export const CONSULTANCY_TYPES = ['consultancy', 'testing'];
// consultancies.role is NOT NULL and CHECK-constrained to these three values.
export const CONSULTANCY_ROLES = ['Chief Coordinator', 'Coordinator', 'Team Member'];
export const PATENT_STATUSES = ['Granted', 'Pending', 'Rejected', 'Awarded', 'Published'];
export const COPYRIGHT_STATUSES = ['Applied', 'Awarded'];
export const YES_NO = ['Yes', 'No'];
export const SPONSORED_BY_OPTIONS = ['KLS GIT', 'Other'];
export const LEVEL_ONLY_OPTIONS = ['National', 'International'];

export const RESEARCH_RESOURCES = {
  'conference-attended': {
    singular: 'Conference Attended',
    plural: 'Conferences Attended',
    searchFields: ['egov_id', 'conference_name', 'title', 'place', 'attended_as', 'sponsored_by'],
    columns: [
      { key: 'egov_id', label: 'E-Gov ID', type: 'egov' },
      { key: 'conference_name', label: 'Conference Name' },
      { key: 'attended_as', label: 'Attended As' },
      { key: 'from_date', label: 'From date', type: 'date' },
      { key: 'to_date', label: 'To Date', type: 'date' },
      { key: 'no_of_days', label: 'No Of Days' },
      { key: 'title', label: 'Paper Title' },
      { key: 'place', label: 'Place' },
      { key: 'sponsored', label: 'Sponsored' },
      { key: 'sponsored_by', label: 'Sponsored By', notApplicableWhen: 'sponsored' },
      { key: 'amount', label: 'Amount' },
      { key: 'weblink', label: 'Weblink', type: 'link' },
      { key: 'type_of_level', label: 'Type Of Level' },
      { key: 'issn_no', label: 'ISSN Number' },
    ],
    fields: [
      { name: 'conference_name', label: 'Conference Name', required: true, placeholder: 'Conference Name' },
      { name: 'attended_as', label: 'Attended As', type: 'select', options: ATTENDEE_ROLES, required: true, placeholder: 'Choose an option' },
      { name: 'from_date', label: 'From date', type: 'date', required: true },
      { name: 'to_date', label: 'To Date', type: 'date', required: true },
      { name: 'no_of_days', label: 'No Of Days', type: 'computedDays', required: true },
      { name: 'title', label: 'Paper Title', placeholder: 'Paper Title', span: 2 },
      { name: 'place', label: 'Place', placeholder: 'Place' },
      { name: 'sponsored', label: 'Sponsored', type: 'select', options: YES_NO, required: true, placeholder: 'Choose One' },
      { name: 'sponsored_by', label: 'Sponsored By', type: 'select', options: SPONSORED_BY_OPTIONS, showWhen: { field: 'sponsored', value: 'Yes' }, placeholder: 'Choose One' },
      { name: 'other_sponsored', label: 'Other Sponsor', showWhen: { field: 'sponsored_by', value: 'Other' }, placeholder: 'Other Sponsor' },
      { name: 'amount', label: 'Amount', type: 'number' },
      { name: 'weblink', label: 'Weblink', placeholder: 'Weblink' },
      { name: 'type_of_level', label: 'Type Of Level', type: 'select', options: LEVEL_ONLY_OPTIONS, required: true, placeholder: 'Choose One' },
      { name: 'issn_no', label: 'ISSN Number', placeholder: 'ISSN Number' },
    ],
  },

  'conference-conducted': {
    singular: 'Conference Conducted',
    plural: 'Conferences Conducted',
    searchFields: ['egov_id', 'conference_name', 'co_organizer', 'place', 'publisher', 'role', 'sponsoring_agency'],
    columns: [
      { key: 'egov_id', label: 'E-Gov ID', type: 'egov' },
      { key: 'conference_name', label: 'Conference Name' },
      { key: 'co_organizer', label: 'Co Organizer' },
      { key: 'no_of_participants', label: 'No Of Participants' },
      { key: 'sponsored', label: 'Sponsored' },
      { key: 'sponsoring_agency', label: 'Sponsoring Agency', notApplicableWhen: 'sponsored' },
      { key: 'from_date', label: 'From date', type: 'date' },
      { key: 'to_date', label: 'To Date', type: 'date' },
      { key: 'no_of_days', label: 'No Of Days' },
      { key: 'place', label: 'Place' },
      { key: 'publisher', label: 'Publisher' },
      { key: 'role', label: 'Role' },
      { key: 'weblink', label: 'Weblink', type: 'link' },
      { key: 'type_of_level', label: 'Type Of Level' },
      { key: 'issn_no', label: 'ISSN Number' },
    ],
    fields: [
      { name: 'conference_name', label: 'Conference Name', required: true, placeholder: 'Conference Name' },
      { name: 'co_organizer', label: 'Co Organizer', placeholder: 'Co Organizer' },
      { name: 'no_of_participants', label: 'No Of Participants', type: 'number', required: true, placeholder: 'No Of Participants' },
      { name: 'sponsored', label: 'Sponsored', type: 'select', options: YES_NO, required: true, placeholder: 'Choose One' },
      { name: 'sponsoring_agency', label: 'Sponsoring Agency', showWhen: { field: 'sponsored', value: 'Yes' }, placeholder: 'Sponsoring Agency' },
      { name: 'from_date', label: 'From date', type: 'date', required: true },
      { name: 'to_date', label: 'To Date', type: 'date', required: true },
      { name: 'no_of_days', label: 'No Of Days', type: 'computedDays', required: true },
      { name: 'place', label: 'Place', required: true, placeholder: 'Place' },
      { name: 'publisher', label: 'Publisher', placeholder: 'Publisher' },
      { name: 'role', label: 'Role', type: 'select', options: CONDUCTED_ROLES, required: true, placeholder: 'Choose the role' },
      { name: 'weblink', label: 'Weblink', placeholder: 'Weblink' },
      { name: 'type_of_level', label: 'Type Of Level', type: 'select', options: LEVEL_ONLY_OPTIONS, required: true, placeholder: 'Choose One' },
      { name: 'issn_no', label: 'ISSN Number', placeholder: 'ISSN Number' },
    ],
  },

  publication: {
    singular: 'Publication',
    plural: 'Publications',
    searchFields: ['egov_id', 'title', 'journal', 'doi_number', 'level', 'role'],
    columns: [
      { key: 'egov_id', label: 'E-Gov ID', type: 'egov' },
      { key: 'level', label: 'Journal Level' },
      { key: 'other_level', label: 'Other Level' },
      { key: 'title', label: 'Paper Title' },
      { key: 'date', label: 'Date of Publication', type: 'date' },
      { key: 'journal', label: 'Name of the Journal' },
      { key: 'publication_type', label: 'Publication Type' },
      { key: 'doi_number', label: 'DOI Number' },
      { key: 'link', label: 'Web Link of the Publication', type: 'link' },
      { key: 'role', label: 'Role of the Author' },
      { key: 'volume', label: 'Volume' },
      { key: 'issue', label: 'Issue' },
      { key: 'page_no', label: 'Page No' },
      { key: 'year', label: 'Year' },
    ],
    fields: [
      { name: 'level', label: 'Journal Level', type: 'select', options: LEVELS, required: true, placeholder: 'Choose Level' },
      { name: 'other_level', label: 'Other Level', showWhen: { field: 'level', value: 'Other' }, placeholder: 'Other Level' },
      { name: 'title', label: 'Paper Title', required: true, placeholder: 'Paper Title', span: 2 },
      { name: 'date', label: 'Date of Publication', type: 'date', required: true },
      { name: 'publication_type', label: 'Publication Type', type: 'select', options: PUBLICATION_TYPES, required: true, placeholder: 'Choose One' },
      { name: 'journal', label: 'Name of the Journal', placeholder: 'Name of the Journal' },
      { name: 'doi_number', label: 'DOI Number', placeholder: 'DOI Number' },
      { name: 'link', label: 'Web Link of the Publication', placeholder: 'https://' },
      { name: 'role', label: 'Role of the Author', type: 'select', options: PUBLICATION_ROLES, required: true, placeholder: 'Choose One' },
      { name: 'volume', label: 'Volume', placeholder: 'Volume' },
      { name: 'issue', label: 'Issue', placeholder: 'Issue' },
      { name: 'page_no', label: 'Page No', placeholder: 'Page No' },
      { name: 'year', label: 'Year', placeholder: 'Year' },
    ],
  },

  'book-chapter': {
    singular: 'Book / Chapter',
    plural: 'Books and Chapters',
    searchFields: ['egov_id', 'title', 'publisher_name', 'doi', 'chapter_title', 'type', 'book_level'],
    columns: [
      { key: 'egov_id', label: 'E-Gov ID', type: 'egov' },
      { key: 'title', label: 'Title' },
      { key: 'book_level', label: 'Book Level' },
      { key: 'publisher_name', label: 'Publisher Name' },
      { key: 'edition', label: 'Edition' },
      { key: 'doi', label: 'DOI Number' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'issue', label: 'Issue' },
      { key: 'type', label: 'Type' },
      { key: 'chapter_title', label: 'Chapter Title' },
      { key: 'start_page_no', label: 'Start Page No' },
      { key: 'end_page_no', label: 'End Page No' },
    ],
    fields: [
      { name: 'title', label: 'Title', required: true, placeholder: 'Title', span: 2 },
      { name: 'book_level', label: 'Book Level', type: 'select', options: BOOK_LEVELS, required: true, placeholder: 'Choose One' },
      { name: 'type', label: 'Type', type: 'select', options: BOOK_TYPES, required: true, placeholder: 'Choose One' },
      { name: 'publisher_name', label: 'Publisher Name', required: true, placeholder: 'Publisher Name' },
      { name: 'edition', label: 'Edition', placeholder: 'Edition' },
      { name: 'doi', label: 'DOI Number', placeholder: 'DOI Number' },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'issue', label: 'Issue', placeholder: 'Issue' },
      { name: 'chapter_title', label: 'Chapter Title', showWhen: { field: 'type', value: 'Chapter' }, placeholder: 'Chapter Title', span: 2 },
      { name: 'start_page_no', label: 'Start Page No', type: 'number', showWhen: { field: 'type', value: 'Chapter' } },
      { name: 'end_page_no', label: 'End Page No', type: 'number', showWhen: { field: 'type', value: 'Chapter' } },
    ],
  },

  'funded-project': {
    singular: 'Funded Project',
    plural: 'Funded Projects',
    searchFields: ['egov_id', 'proposal_title', 'role', 'type', 'proposal_status', 'project_status'],
    columns: [
      { key: 'egov_id', label: 'E-Gov ID', type: 'egov' },
      { key: 'proposal_title', label: 'Proposal Title' },
      { key: 'role', label: 'Role' },
      { key: 'type', label: 'Type' },
      { key: 'amount', label: 'Amount' },
      { key: 'proposal_status', label: 'Proposal Status' },
      { key: 'application_date', label: 'Application Date', type: 'date' },
      { key: 'fund_received', label: 'Fund Received' },
      { key: 'project_status', label: 'Project Status' },
      { key: 'completion_year', label: 'Completion Year' },
    ],
    fields: [
      { name: 'proposal_title', label: 'Proposal Title', required: true, placeholder: 'Proposal Title', span: 2 },
      { name: 'role', label: 'Role', type: 'select', options: FUNDED_ROLES, required: true, placeholder: 'Choose Role' },
      { name: 'type', label: 'Type', type: 'select', options: FUNDED_TYPES, required: true, placeholder: 'Choose Type' },
      { name: 'amount', label: 'Amount', type: 'number', required: true, placeholder: 'Amount' },
      { name: 'proposal_status', label: 'Proposal Status', type: 'select', options: PROPOSAL_STATUSES, required: true, placeholder: 'Choose Proposal Status' },
      { name: 'application_date', label: 'Application Date', type: 'date', required: true },
      { name: 'fund_received', label: 'Fund Received', type: 'number', placeholder: 'Fund Received' },
      { name: 'project_status', label: 'Project Status', type: 'select', options: PROJECT_STATUSES, required: true, placeholder: 'Select Project Status' },
      { name: 'completion_year', label: 'Completion Year', type: 'number', required: true, placeholder: 'Completion Year' },
    ],
  },

  consultancy: {
    singular: 'Consultancy',
    plural: 'Consultancies',
    // ConsultancyController allowed a 20 MB upload while every other research menu capped at 500 KB.
    maxDocumentBytes: 20000 * 1024,
    searchFields: ['egov_id', 'consultancy_title', 'agency', 'consultancy_type', 'role'],
    columns: [
      { key: 'egov_id', label: 'E-Gov ID', type: 'egov' },
      { key: 'consultancy_title', label: 'Consultancy/Testing' },
      { key: 'agency', label: 'Agency' },
      { key: 'role', label: 'Role' },
      { key: 'from_date', label: 'From Date', type: 'date' },
      { key: 'to_date', label: 'To Date', type: 'date' },
      { key: 'amount', label: 'Amount' },
      { key: 'consultancy_type', label: 'Consultancy Type' },
    ],
    fields: [
      { name: 'consultancy_title', label: 'Consultancy Title', required: true, placeholder: 'Consultancy Title', span: 2 },
      { name: 'agency', label: 'Agency', required: true, placeholder: 'Agency' },
      { name: 'role', label: 'Role', type: 'select', options: CONSULTANCY_ROLES, required: true, placeholder: 'Choose Role' },
      { name: 'from_date', label: 'From Date', type: 'date', required: true },
      { name: 'to_date', label: 'To Date', type: 'date', required: true },
      { name: 'amount', label: 'Amount', type: 'number', placeholder: 'Amount' },
      { name: 'consultancy_type', label: 'Consultancy Type', type: 'select', options: CONSULTANCY_TYPES, required: true, placeholder: 'Choose Level' },
    ],
  },

  patent: {
    singular: 'Patent',
    plural: 'Patents',
    searchFields: ['egov_id', 'appl_no', 'title', 'stream_domain', 'status', 'patent_no', 'publication_no'],
    columns: [
      { key: 'egov_id', label: 'E-Gov ID', type: 'egov' },
      { key: 'appl_no', label: 'Application No' },
      { key: 'appl_date', label: 'Application Date', type: 'date' },
      { key: 'title', label: 'Title' },
      { key: 'stream_domain', label: 'Stream Domain' },
      { key: 'status', label: 'Status' },
      { key: 'patent_no', label: 'Patents No' },
      { key: 'publication_no', label: 'Publication No' },
      { key: 'publication_date', label: 'Publication Date', type: 'date' },
    ],
    fields: [
      { name: 'appl_no', label: 'Application No', required: true, placeholder: 'Application No' },
      { name: 'appl_date', label: 'Application Date', type: 'date', required: true },
      { name: 'title', label: 'Title', required: true, placeholder: 'Title', span: 2 },
      { name: 'stream_domain', label: 'Stream Domain', placeholder: 'Stream Domain' },
      { name: 'status', label: 'Status', type: 'select', options: PATENT_STATUSES, required: true, placeholder: 'Choose Status' },
      { name: 'patent_no', label: 'Patents No', required: true, placeholder: 'Patents No' },
      { name: 'publication_no', label: 'Publication No', required: true, placeholder: 'Publication No' },
      { name: 'publication_date', label: 'Publication Date', type: 'date', required: true },
    ],
  },

  copyright: {
    singular: 'Copyright',
    plural: 'Copyrights',
    searchFields: ['egov_id', 'copyright_title', 'author_name', 'status', 'description'],
    columns: [
      { key: 'egov_id', label: 'E-Gov ID', type: 'egov' },
      { key: 'copyright_title', label: 'Copyright Title' },
      { key: 'copyright_date', label: 'Copyright Date', type: 'date' },
      { key: 'author_name', label: 'Author Name' },
      { key: 'status', label: 'Status' },
      { key: 'description', label: 'Description' },
    ],
    fields: [
      { name: 'copyright_title', label: 'Copyright Title', required: true, placeholder: 'Copyright Title', span: 2 },
      { name: 'copyright_date', label: 'Copyright Date', type: 'date', required: true },
      { name: 'author_name', label: 'Author Name', required: true, placeholder: 'Author Name' },
      { name: 'status', label: 'Status', type: 'select', options: COPYRIGHT_STATUSES, required: true, placeholder: 'Choose Status' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Description', span: 2 },
    ],
  },

  'reviewer-editor': {
    singular: 'Reviewer/Editor',
    plural: 'Reviewers/Editors',
    searchFields: ['egov_id', 'title', 'journal_name', 'publisher_name', 'level', 'category'],
    columns: [
      { key: 'egov_id', label: 'E-Gov ID', type: 'egov' },
      { key: 'level', label: 'Level' },
      { key: 'other_level', label: 'Other Level' },
      { key: 'title', label: 'Title' },
      { key: 'reviewed_date', label: 'Review Date', type: 'date' },
      { key: 'journal_name', label: 'Journal Name' },
      { key: 'publisher_name', label: 'Publisher Name' },
      { key: 'category', label: 'Category' },
    ],
    fields: [
      { name: 'title', label: 'Title', required: true, placeholder: 'Title', span: 2 },
      { name: 'journal_name', label: 'Journal Name', required: true, placeholder: 'Journal Name' },
      { name: 'publisher_name', label: 'Publisher Name', required: true, placeholder: 'Publisher Name' },
      { name: 'reviewed_date', label: 'Review Date', type: 'date', required: true },
      { name: 'level', label: 'Level', type: 'select', options: LEVELS, required: true, placeholder: 'Choose Level' },
      { name: 'other_level', label: 'Other Level', showWhen: { field: 'level', value: 'Other' }, placeholder: 'Other Level' },
      { name: 'category', label: 'Category', type: 'select', options: CATEGORIES, required: true, placeholder: 'Choose One' },
    ],
  },

  achievement: {
    singular: 'General Achievement',
    plural: 'General Achievements',
    // GeneralAchievementsController never stored an e-Gov ID, so this table has no egov_id column.
    hasEgovId: false,
    searchFields: ['award', 'year', 'details', 'awarding_body'],
    columns: [
      { key: 'award', label: 'Award' },
      { key: 'year', label: 'Year' },
      { key: 'details', label: 'Details' },
      { key: 'awarding_body', label: 'Awarding Body' },
    ],
    fields: [
      { name: 'award', label: 'Award', required: true, placeholder: 'Award', span: 2 },
      { name: 'year', label: 'Year', type: 'number', required: true, placeholder: 'Year' },
      { name: 'awarding_body', label: 'Awarding Body', required: true, placeholder: 'Awarding Body' },
      { name: 'details', label: 'Details', type: 'textarea', placeholder: 'Details', span: 2 },
    ],
  },
};