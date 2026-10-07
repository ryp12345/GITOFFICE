const fs = require('fs');
const path = require('path');

const researchModel = require('../../models/research.model');
const { RESEARCH_DOCUMENT_ROOTS } = require('../../middlewares/upload.middleware');

const VALID_OPTION_MESSAGE = 'Please select a valid option from the provided choices';

const ATTENDEE_ROLES = ['Resource Person', 'Paper Presenter', 'Participant', 'Session Chair'];
const CONDUCTED_ROLES = ['Convener', 'Co-convener', 'Team Member', 'Coordinator'];
const LEVELS = ['Q1', 'Q2', 'Q3', 'Q4', 'SCI', 'Web of Science', 'Scopus Indexed', 'UGC General', 'Other'];
const CATEGORIES = ['Journal', 'Conference Proceeding'];
const BOOK_LEVELS = ['National', 'International'];
const BOOK_TYPES = ['Book', 'Chapter'];
const PUBLICATION_TYPES = ['Journal', 'Conference Proceeding'];
const PUBLICATION_ROLES = ['Author', 'Co-Author', 'Corresponding-Author'];
const FUNDED_ROLES = ['Principle Investigator', 'Co-Investigator', 'Architect'];
const FUNDED_TYPES = ['Govt-funded', 'Private funded'];
const PROPOSAL_STATUSES = ['Accepted', 'Pending', 'Rejected'];
const PROJECT_STATUSES = ['On-Going', 'Completed'];
const CONSULTANCY_TYPES = ['consultancy', 'testing'];
// consultancies.role is NOT NULL and constrained to these three values. ConsultancyController
// never assigned it, so the column is now a first-class part of the consultancy form.
const CONSULTANCY_ROLES = ['Chief Coordinator', 'Coordinator', 'Team Member'];
const PATENT_STATUSES = ['Granted', 'Pending', 'Rejected', 'Awarded', 'Published'];
const COPYRIGHT_STATUSES = ['Applied', 'Awarded'];
const YES_NO = ['Yes', 'No'];
const SPONSORED_BY_OPTIONS = ['KLS GIT', 'Other'];
const LEVEL_ONLY_OPTIONS = ['National', 'International'];

// Laravel enforced 500000 bytes on every research upload except consultancy (20000000).
const MAX_DOCUMENT_BYTES = 500 * 1024;
const CONSULTANCY_MAX_DOCUMENT_BYTES = 20000 * 1024;

const MAX_DAYS = 365;
const MIN_DAYS = 1;

function readString(body, field) {
  const value = body[field];
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(body, field) {
  const raw = readString(body, field);
  if (!raw) return null;

  const value = Number(raw);
  return Number.isFinite(value) ? value : NaN;
}

function isValidIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function inclusiveDayCount(fromDate, toDate) {
  if (!isValidIsoDate(fromDate) || !isValidIsoDate(toDate)) return 0;
  if (fromDate > toDate) return 0;
  return Math.round((new Date(toDate) - new Date(fromDate)) / 86400000) + 1;
}

function requireText(errors, body, field, label = field) {
  const value = readString(body, field);
  if (!value) errors[field] = `${label} is required field`;
  return value;
}

function requireOption(errors, body, field, allowed, label = field) {
  const value = readString(body, field);
  if (!value) {
    errors[field] = `${label} is required field`;
    return '';
  }
  if (!allowed.includes(value)) {
    errors[field] = VALID_OPTION_MESSAGE;
    return '';
  }
  return value;
}

function requireNumber(errors, body, field, label = field) {
  const value = readNumber(body, field);
  if (value === null) {
    errors[field] = `${label} is required field`;
    return null;
  }
  if (Number.isNaN(value)) {
    errors[field] = `${label} can be numbers only`;
    return null;
  }
  return value;
}

function optionalNumber(errors, body, field, label = field) {
  const raw = readString(body, field);
  if (!raw) return null;

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    errors[field] = `${label} can be numbers only`;
    return null;
  }
  return value;
}

function requireDate(errors, body, field, label = field) {
  const value = readString(body, field);
  if (!value) {
    errors[field] = `${label} is required field`;
    return '';
  }
  if (!isValidIsoDate(value)) {
    errors[field] = `${label} is not a valid date`;
    return '';
  }
  return value;
}

// Conferences additionally need the derived day count that Laravel stored on the row.
function resolveConferenceDates(errors, body, prefix) {
  const fromDate = requireDate(errors, body, `${prefix}from_date`);
  const toDate = requireDate(errors, body, `${prefix}to_date`);

  if (fromDate && toDate && fromDate > toDate) {
    errors[`${prefix}to_date`] = 'to_date must be greater than or equal to from_date';
    return { fromDate, toDate, noOfDays: null };
  }

  const noOfDays = inclusiveDayCount(fromDate, toDate);
  if (fromDate && toDate && noOfDays < MIN_DAYS) {
    errors[`${prefix}no_of_days`] = `no_of_days should be min ${MIN_DAYS} day`;
  } else if (noOfDays > MAX_DAYS) {
    errors[`${prefix}no_of_days`] = `no_of_days should be max ${MAX_DAYS} days`;
  }

  return { fromDate, toDate, noOfDays: noOfDays || null };
}

function resolveSponsoredBy(errors, body, prefix) {
  const sponsored = requireOption(errors, body, `${prefix}sponsored`, YES_NO, 'sponsored');
  if (!sponsored) return { sponsored: '', sponsoredBy: null };

  if (sponsored === 'No') return { sponsored, sponsoredBy: null };

  const choice = readString(body, `${prefix}sponsored_by`);
  const otherSponsor = readString(body, `${prefix}other_sponsored`);

  if (choice === 'KLS GIT') return { sponsored, sponsoredBy: 'KLS GIT' };

  if (choice === 'Other') {
    if (!otherSponsor) {
      errors[`${prefix}other_sponsored`] = 'other sponsor is required field';
      return { sponsored, sponsoredBy: null };
    }
    return { sponsored, sponsoredBy: otherSponsor };
  }

  if (!SPONSORED_BY_OPTIONS.includes(choice)) {
    errors[`${prefix}sponsored_by`] = VALID_OPTION_MESSAGE;
    return { sponsored, sponsoredBy: null };
  }

  return { sponsored, sponsoredBy: null };
}

// Publication and Reviewer/Editor share the level + "Other" free-text pair.
function resolveLevel(errors, body, prefix = '') {
  const level = requireOption(errors, body, `${prefix}level`, LEVELS, 'level');
  if (!level) return { level: '', otherLevel: null };

  if (level !== 'Other') return { level, otherLevel: null };

  const otherLevel = readString(body, `${prefix}other_level`);
  if (!otherLevel) {
    errors[`${prefix}other_level`] = 'other level is required field';
    return { level, otherLevel: null };
  }
  return { level, otherLevel };
}

const VALIDATORS = {
  'conference-attended'(body) {
    const errors = {};
    const { fromDate, toDate, noOfDays } = resolveConferenceDates(errors, body, '');
    const { sponsored, sponsoredBy } = resolveSponsoredBy(errors, body, '');

    return {
      errors,
      data: {
        conference_name: requireText(errors, body, 'conference_name', 'conference name'),
        attended_as: requireOption(errors, body, 'attended_as', ATTENDEE_ROLES, 'attended as'),
        from_date: fromDate,
        to_date: toDate,
        no_of_days: noOfDays,
        title: readString(body, 'title') || null,
        place: readString(body, 'place') || null,
        sponsored: sponsored || null,
        sponsored_by: sponsoredBy,
        amount: optionalNumber(errors, body, 'amount', 'Amount'),
        weblink: readString(body, 'weblink') || null,
        type_of_level: requireOption(errors, body, 'type_of_level', LEVEL_ONLY_OPTIONS, 'level'),
        issn_no: readString(body, 'issn_no') || null,
      },
    };
  },

  'conference-conducted'(body) {
    const errors = {};
    const { fromDate, toDate, noOfDays } = resolveConferenceDates(errors, body, '');
    const sponsored = requireOption(errors, body, 'sponsored', YES_NO, 'sponsored');

    if (sponsored === 'Yes' && !readString(body, 'sponsoring_agency')) {
      errors.sponsoring_agency = 'sponsoring agency name address is required field';
    }

    return {
      errors,
      data: {
        conference_name: requireText(errors, body, 'conference_name', 'conference name'),
        co_organizer: readString(body, 'co_organizer') || null,
        no_of_participants: requireNumber(errors, body, 'no_of_participants', 'No of participants'),
        sponsored: sponsored || null,
        sponsoring_agency: sponsored === 'Yes' ? readString(body, 'sponsoring_agency') || null : null,
        from_date: fromDate,
        to_date: toDate,
        no_of_days: noOfDays,
        place: requireText(errors, body, 'place', 'place'),
        publisher: readString(body, 'publisher') || null,
        role: requireOption(errors, body, 'role', CONDUCTED_ROLES, 'role'),
        weblink: readString(body, 'weblink') || null,
        type_of_level: requireOption(errors, body, 'type_of_level', LEVEL_ONLY_OPTIONS, 'level'),
        issn_no: readString(body, 'issn_no') || null,
      },
    };
  },

  publication(body) {
    const errors = {};
    const { level, otherLevel } = resolveLevel(errors, body);

    return {
      errors,
      data: {
        level: level || null,
        other_level: otherLevel,
        title: requireText(errors, body, 'title', 'title'),
        date: requireDate(errors, body, 'date'),
        journal: readString(body, 'journal') || null,
        doi_number: readString(body, 'doi_number') || null,
        link: readString(body, 'link') || null,
        role: requireOption(errors, body, 'role', PUBLICATION_ROLES, 'role'),
        volume: readString(body, 'volume') || null,
        issue: readString(body, 'issue') || null,
        page_no: readString(body, 'page_no') || null,
        year: readString(body, 'year') || null,
        publication_type: requireOption(errors, body, 'publication_type', PUBLICATION_TYPES, 'publication type'),
      },
    };
  },

  'book-chapter'(body) {
    const errors = {};
    const type = requireOption(errors, body, 'type', BOOK_TYPES, 'type');

    return {
      errors,
      data: {
        title: requireText(errors, body, 'title', 'title'),
        book_level: requireOption(errors, body, 'book_level', BOOK_LEVELS, 'Book_level'),
        publisher_name: requireText(errors, body, 'publisher_name', 'Publisher name'),
        edition: readString(body, 'edition') || null,
        doi: readString(body, 'doi') || null,
        date: requireDate(errors, body, 'date'),
        issue: readString(body, 'issue') || null,
        type: type || null,
        chapter_title: type === 'Chapter' ? readString(body, 'chapter_title') || null : null,
        start_page_no: type === 'Chapter' ? optionalNumber(errors, body, 'start_page_no', 'Start page no') : null,
        end_page_no: type === 'Chapter' ? optionalNumber(errors, body, 'end_page_no', 'End page no') : null,
      },
    };
  },

  'funded-project'(body) {
    const errors = {};

    return {
      errors,
      data: {
        proposal_title: requireText(errors, body, 'proposal_title', 'proposal title'),
        role: requireOption(errors, body, 'role', FUNDED_ROLES, 'role'),
        type: requireOption(errors, body, 'type', FUNDED_TYPES, 'type') || null,
        amount: requireNumber(errors, body, 'amount', 'Amount'),
        proposal_status: requireOption(errors, body, 'proposal_status', PROPOSAL_STATUSES, 'proposal status'),
        application_date: requireDate(errors, body, 'application_date', 'application date'),
        fund_received: optionalNumber(errors, body, 'fund_received', 'fund received'),
        project_status: requireOption(errors, body, 'project_status', PROJECT_STATUSES, 'project status'),
        completion_year: requireNumber(errors, body, 'completion_year', 'completion year'),
      },
    };
  },

  consultancy(body) {
    const errors = {};

    return {
      errors,
      data: {
        consultancy_title: requireText(errors, body, 'consultancy_title', 'consultancy title'),
        agency: requireText(errors, body, 'agency', 'agency'),
        from_date: requireDate(errors, body, 'from_date'),
        to_date: requireDate(errors, body, 'to_date'),
        amount: optionalNumber(errors, body, 'amount', 'Amount'),
        consultancy_type: requireOption(errors, body, 'consultancy_type', CONSULTANCY_TYPES, 'consultancy_type'),
        role: requireOption(errors, body, 'role', CONSULTANCY_ROLES, 'role'),
      },
    };
  },

  patent(body) {
    const errors = {};

    return {
      errors,
      data: {
        appl_no: requireText(errors, body, 'appl_no', 'application number'),
        appl_date: requireDate(errors, body, 'appl_date', 'application date'),
        title: requireText(errors, body, 'title', 'title'),
        stream_domain: readString(body, 'stream_domain') || null,
        status: requireOption(errors, body, 'status', PATENT_STATUSES, 'status'),
        patent_no: requireText(errors, body, 'patent_no', 'patentnumber'),
        publication_no: requireText(errors, body, 'publication_no', 'publication number'),
        publication_date: requireDate(errors, body, 'publication_date', 'publication_date'),
      },
    };
  },

  copyright(body) {
    const errors = {};

    return {
      errors,
      data: {
        copyright_title: requireText(errors, body, 'copyright_title', 'copyright_title'),
        copyright_date: requireDate(errors, body, 'copyright_date'),
        author_name: requireText(errors, body, 'author_name', 'author name'),
        status: requireOption(errors, body, 'status', COPYRIGHT_STATUSES, 'status'),
        description: readString(body, 'description') || null,
      },
    };
  },

  'reviewer-editor'(body) {
    const errors = {};
    const { level, otherLevel } = resolveLevel(errors, body);

    return {
      errors,
      data: {
        title: requireText(errors, body, 'title', 'title'),
        journal_name: requireText(errors, body, 'journal_name', 'journal name'),
        publisher_name: requireText(errors, body, 'publisher_name', 'publisher name'),
        reviewed_date: requireDate(errors, body, 'reviewed_date'),
        level: level || null,
        other_level: otherLevel,
        category: requireOption(errors, body, 'category', CATEGORIES, 'category'),
      },
    };
  },

  achievement(body) {
    const errors = {};

    return {
      errors,
      data: {
        award: requireText(errors, body, 'award', 'award'),
        year: requireNumber(errors, body, 'year', 'year'),
        details: readString(body, 'details') || null,
        awarding_body: requireText(errors, body, 'awarding_body', 'awarding body'),
      },
    };
  },
};

function badRequest(errors) {
  const error = new Error('Validation failed');
  error.statusCode = 422;
  error.errors = errors;
  return error;
}

function notFound() {
  const error = new Error('Research record not found');
  error.statusCode = 404;
  return error;
}

function documentRootFor(resourceKey) {
  const root = RESEARCH_DOCUMENT_ROOTS[resourceKey];
  if (!root) throw notFound();
  return root;
}

function removeStoredDocument(rootDir, filename) {
  if (!filename) return;

  try {
    const target = path.join(rootDir, filename);
    const normalizedRoot = path.resolve(rootDir);
    if (!path.resolve(target).startsWith(normalizedRoot)) return;
    if (fs.existsSync(target)) fs.unlinkSync(target);
  } catch (_error) {
    // A missing or locked file must not fail the request.
  }
}

function discardUpload(resourceKey, file) {
  if (file && file.filename) removeStoredDocument(documentRootFor(resourceKey), file.filename);
}

function maxDocumentBytesFor(resourceKey) {
  return resourceKey === 'consultancy' ? CONSULTANCY_MAX_DOCUMENT_BYTES : MAX_DOCUMENT_BYTES;
}

async function resolveOwningStaffId(req) {
  const staffId = await researchModel.resolveStaffId(req.user && req.user.id);
  if (!staffId) throw notFound();
  return staffId;
}

// A PDF is mandatory when creating and optional when editing, so an existing record can be
// corrected without re-uploading the PDF that is already stored against it.
function validatePayload(resourceKey, body, file, requireDocument) {
  const validator = VALIDATORS[resourceKey];
  if (!validator) throw notFound();

  const { errors, data } = validator(body);

  if (requireDocument && (!file || !file.filename)) {
    errors.document = 'document is required field';
  }

  if (Object.keys(errors).length > 0) return { errors };

  return { data };
}

async function list(req, res, next) {
  try {
    const staffId = await researchModel.resolveStaffId(req.user && req.user.id);
    const records = staffId ? await researchModel.list(req.params.resource, staffId) : [];

    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const resourceKey = req.params.resource;
    const staffId = await resolveOwningStaffId(req);

    const { data, errors } = validatePayload(resourceKey, req.body, req.file, true);
    if (errors) {
      discardUpload(resourceKey, req.file);
      throw badRequest(errors);
    }

    const record = await researchModel.create(resourceKey, staffId, data, req.file.filename);
    res.status(201).json({ success: true, message: 'Record added successfully.', data: record });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const resourceKey = req.params.resource;
    const staffId = await resolveOwningStaffId(req);

    const { data, errors } = validatePayload(resourceKey, req.body, req.file, false);
    if (errors) {
      discardUpload(resourceKey, req.file);
      throw badRequest(errors);
    }

    const result = await researchModel.update(
      resourceKey,
      Number(req.params.id),
      staffId,
      data,
      req.file ? req.file.filename : null
    );

    if (result.previousDocument) {
      removeStoredDocument(documentRootFor(resourceKey), result.previousDocument);
    }

    res.json({ success: true, message: 'Record updated successfully', data: result.record });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const resourceKey = req.params.resource;
    const staffId = await resolveOwningStaffId(req);

    const result = await researchModel.remove(resourceKey, Number(req.params.id), staffId);
    removeStoredDocument(documentRootFor(resourceKey), result.previousDocument);

    res.json({ success: true, message: 'Record deleted successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
  create,
  update,
  remove,
  maxDocumentBytesFor,
  ATTENDEE_ROLES,
  CONDUCTED_ROLES,
  LEVELS,
  CATEGORIES,
  BOOK_LEVELS,
  BOOK_TYPES,
  PUBLICATION_TYPES,
  PUBLICATION_ROLES,
  FUNDED_ROLES,
  FUNDED_TYPES,
  PROPOSAL_STATUSES,
  PROJECT_STATUSES,
CONSULTANCY_TYPES,
  CONSULTANCY_ROLES,
  PATENT_STATUSES,
  COPYRIGHT_STATUSES,
  YES_NO,
  SPONSORED_BY_OPTIONS,
  MAX_DOCUMENT_BYTES,
  CONSULTANCY_MAX_DOCUMENT_BYTES,
};