const fs = require('fs');
const path = require('path');

const professionalActivityModel = require('../../models/professionalActivity.model');
const {
  professionalActivityAttendedRoot,
  professionalActivityConductedRoot
} = require('../../middlewares/upload.middleware');

const ATTENDEE_ROLES = ['Participant', 'Resource Person', 'Jury'];
const LEVELS = ['Local', 'National', 'International'];
const CATEGORIES = [
  'Workshop',
  'FDP',
  'Seminar',
  'Webinar',
  'STTP',
  'Certification Program',
  'MDP/EDP',
  'Hackathon',
  'Space-Talk',
  'Site Visit'
];
const CONDUCTED_ROLES = ['Coordinator', 'Convenor', 'Member', 'Jury'];
const SPONSORED_OPTIONS = ['Yes', 'No'];
const SPONSORED_BY_OPTIONS = ['KLS GIT', 'Other'];

const ATTENDEE_MAX_DAYS = 365;
const CONDUCTED_MAX_DAYS = 255;

const LETTERS_AND_SPACES = /^[a-zA-Z\s]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function badRequest(errors) {
  const error = new Error('Validation failed');
  error.statusCode = 400;
  error.errors = errors;
  return error;
}

function notFound() {
  const error = new Error('Professional activity not found');
  error.statusCode = 404;
  return error;
}

function readString(body, field) {
  const value = body[field];
  return typeof value === 'string' ? value.trim() : '';
}

function validateDates(body, errors, { maxDays, prefix = '' }) {
  const fromDate = readString(body, 'from_date');
  const toDate = readString(body, 'to_date');

  if (!fromDate || !ISO_DATE.test(fromDate)) {
    errors[`${prefix}from_date`] = 'from_date is required field';
  }

  if (!toDate || !ISO_DATE.test(toDate)) {
    errors[`${prefix}to_date`] = 'to_date is required field';
  }

  if (fromDate && toDate && ISO_DATE.test(fromDate) && ISO_DATE.test(toDate)) {
    if (fromDate > toDate) {
      errors[`${prefix}to_date`] = 'to_date must be greater than or equal to from_date';
    } else {
      const diffInDays = (new Date(toDate) - new Date(fromDate)) / 86400000 + 1;
      if (diffInDays > maxDays) {
        errors[`${prefix}no_of_days`] = `no_of_days should be max ${maxDays} days`;
      }
    }
  }

  return { fromDate, toDate };
}

// Inclusive day count, matching the blade's `millisBetween / 86400000 + 1` calculation.
function calculateNoOfDays(fromDate, toDate) {
  if (!fromDate || !toDate || fromDate > toDate) return 0;
  return Math.round((new Date(toDate) - new Date(fromDate)) / 86400000) + 1;
}

function validateAttended(body, file, requireDocument = true) {
  const errors = {};

  const title = readString(body, 'title');
  const organizer = readString(body, 'organizer');
  const role = readString(body, 'role');
  const level = readString(body, 'level');
  const category = readString(body, 'category');
  const sponsored = readString(body, 'sponsored');
  const sponsoredBy = readString(body, 'sponsored_by');
  const otherSponsored = readString(body, 'other_sponsored');
  const { fromDate, toDate } = validateDates(body, errors, { maxDays: ATTENDEE_MAX_DAYS });

  if (!title) errors.title = 'title is required field';
  if (!organizer) errors.organizer = 'organizer is required filed';
  else if (!LETTERS_AND_SPACES.test(organizer)) {
    errors.organizer = 'The organizer field should contain only letters and spaces.';
  }

  if (!role) errors.role = 'role is required field';
  else if (!ATTENDEE_ROLES.includes(role)) {
    errors.role = 'Please select a valid option from the provided choices';
  }

  if (!level) errors.level = 'level is required field';
  else if (!LEVELS.includes(level)) {
    errors.level = 'Please select a valid option from the provided choices';
  }

  if (!category) errors.category = 'category is required field';
  else if (!CATEGORIES.includes(category)) {
    errors.category = 'Please select a valid option from the provided choices';
  }

  if (!sponsored) errors.sponsored = 'sponsored is required field';
  else if (!SPONSORED_OPTIONS.includes(sponsored)) {
    errors.sponsored = 'Please select a valid option from the provided choices';
  }

  if (sponsored === 'Yes') {
    if (!sponsoredBy) errors.sponsored_by = 'sponsored by is required field';
    else if (!SPONSORED_BY_OPTIONS.includes(sponsoredBy)) {
      errors.sponsored_by = 'Please select a valid option from the provided choices';
    } else if (sponsoredBy === 'Other' && !otherSponsored) {
      errors.other_sponsored = 'other sponsor is required field';
    }
  }

  if (requireDocument && (!file || !file.filename)) errors.document = 'document is required field';

  if (Object.keys(errors).length > 0) return { errors };

  return {
    data: {
      title,
      organizer,
      role,
      level,
      category,
      sponsored,
      sponsored_by: sponsored === 'Yes' ? (sponsoredBy === 'Other' ? otherSponsored : sponsoredBy) : null,
      from_date: fromDate,
      to_date: toDate,
      no_of_days: calculateNoOfDays(fromDate, toDate)
    }
  };
}

function validateConducted(body, file, requireDocument = true) {
  const errors = {};

  const title = readString(body, 'title');
  const organizer = readString(body, 'organizer');
  const coOrganizer = readString(body, 'co_organizer');
  const level = readString(body, 'level');
  const category = readString(body, 'category');
  const sponsored = readString(body, 'sponsored');
  const sponsoringAgency = readString(body, 'sponsoring_agency_name_address');
  const place = readString(body, 'place');
  const role = readString(body, 'role');
  const { fromDate, toDate } = validateDates(body, errors, { maxDays: CONDUCTED_MAX_DAYS });

  if (!title) errors.title = 'title is required field';
  if (!organizer) errors.organizer = 'organizer is required field';

  if (!level) errors.level = 'level is required field';
  else if (!LEVELS.includes(level)) {
    errors.level = 'Please select a valid option from the provided choices';
  }

  if (!category) errors.category = 'category is required field';
  else if (!CATEGORIES.includes(category)) {
    errors.category = 'Please select a valid option from the provided choices';
  }

  if (!sponsored) errors.sponsored = 'sponsored is required field';
  else if (!SPONSORED_OPTIONS.includes(sponsored)) {
    errors.sponsored = 'Please select a valid option from the provided choices';
  }

  if (sponsored === 'Yes' && !sponsoringAgency) {
    errors.sponsoring_agency_name_address = 'sponsoring agency name address is required field';
  }

  if (!place) errors.place = 'place is required field';
  else if (!LETTERS_AND_SPACES.test(place)) {
    errors.place = 'The place field should contain only letters and spaces.';
  }

  if (!role) errors.role = 'role is required field';
  else if (!CONDUCTED_ROLES.includes(role)) {
    errors.role = 'Please select a valid option from the provided choices';
  }

  if (requireDocument && (!file || !file.filename)) errors.document = 'document is required field';

  if (Object.keys(errors).length > 0) return { errors };

  return {
    data: {
      title,
      organizer,
      co_organizer: coOrganizer || null,
      level,
      category,
      sponsored,
      sponsoring_agency_name_address: sponsored === 'Yes' ? sponsoringAgency : null,
      from_date: fromDate,
      to_date: toDate,
      place,
      no_of_days: calculateNoOfDays(fromDate, toDate),
      role
    }
  };
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

async function resolveOwningStaffId(req) {
  const staffId = await professionalActivityModel.resolveStaffId(req.user && req.user.id);
  if (!staffId) throw notFound();
  return staffId;
}

function discardUpload(rootDir, file) {
  if (file && file.filename) removeStoredDocument(rootDir, file.filename);
}

// A logged-in staff member without a linked staff row simply has nothing recorded yet.
async function list(req, res, next) {
  try {
    const staffId = await professionalActivityModel.resolveStaffId(req.user && req.user.id);

    const [attended, conducted] = staffId
      ? await Promise.all([
        professionalActivityModel.listAttended(staffId),
        professionalActivityModel.listConducted(staffId)
      ])
      : [[], []];

    res.json({ success: true, data: { attended, conducted } });
  } catch (error) {
    next(error);
  }
}

async function createAttended(req, res, next) {
  try {
    const staffId = await resolveOwningStaffId(req);

    const { data, errors } = validateAttended(req.body, req.file);
    if (errors) {
      discardUpload(professionalActivityAttendedRoot, req.file);
      throw badRequest(errors);
    }

    const record = await professionalActivityModel.createAttended(staffId, data, req.file.filename);
    res.status(201).json({
      success: true,
      message: 'Professional Activity added successfully.',
      data: record
    });
  } catch (error) {
    next(error);
  }
}

async function updateAttended(req, res, next) {
  try {
    const staffId = await resolveOwningStaffId(req);

    const { data, errors } = validateAttended(req.body, req.file, false);
    if (errors) {
      discardUpload(professionalActivityAttendedRoot, req.file);
      throw badRequest(errors);
    }

    const result = await professionalActivityModel.updateAttended(
      Number(req.params.id),
      staffId,
      data,
      req.file ? req.file.filename : null
    );

    if (result.previousDocument) {
      removeStoredDocument(professionalActivityAttendedRoot, result.previousDocument);
    }

    res.json({
      success: true,
      message: 'Professional Activity updated successfully',
      data: result.record
    });
  } catch (error) {
    next(error);
  }
}

async function removeAttended(req, res, next) {
  try {
    const staffId = await resolveOwningStaffId(req);

    const result = await professionalActivityModel.deleteAttended(Number(req.params.id), staffId);
    removeStoredDocument(professionalActivityAttendedRoot, result.previousDocument);

    res.json({ success: true, message: 'Professional Activity deleted successfully' });
  } catch (error) {
    next(error);
  }
}

async function createConducted(req, res, next) {
  try {
    const staffId = await resolveOwningStaffId(req);

    const { data, errors } = validateConducted(req.body, req.file);
    if (errors) {
      discardUpload(professionalActivityConductedRoot, req.file);
      throw badRequest(errors);
    }

    const record = await professionalActivityModel.createConducted(staffId, data, req.file.filename);
    res.status(201).json({
      success: true,
      message: 'Professional Activity added successfully.',
      data: record
    });
  } catch (error) {
    next(error);
  }
}

async function updateConducted(req, res, next) {
  try {
    const staffId = await resolveOwningStaffId(req);

    const { data, errors } = validateConducted(req.body, req.file, false);
    if (errors) {
      discardUpload(professionalActivityConductedRoot, req.file);
      throw badRequest(errors);
    }

    const result = await professionalActivityModel.updateConducted(
      Number(req.params.id),
      staffId,
      data,
      req.file ? req.file.filename : null
    );

    if (result.previousDocument) {
      removeStoredDocument(professionalActivityConductedRoot, result.previousDocument);
    }

    res.json({
      success: true,
      message: 'Professional Activity updated successfully',
      data: result.record
    });
  } catch (error) {
    next(error);
  }
}

async function removeConducted(req, res, next) {
  try {
    const staffId = await resolveOwningStaffId(req);

    const result = await professionalActivityModel.deleteConducted(Number(req.params.id), staffId);
    removeStoredDocument(professionalActivityConductedRoot, result.previousDocument);

    res.json({ success: true, message: 'Professional Activity deleted successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
  createAttended,
  updateAttended,
  removeAttended,
  createConducted,
  updateConducted,
  removeConducted,
  ATTENDEE_ROLES,
  CONDUCTED_ROLES,
  LEVELS,
  CATEGORIES,
  SPONSORED_OPTIONS,
  SPONSORED_BY_OPTIONS
};