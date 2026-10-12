const STAFF_TYPES = ['Teaching', 'Non-Teaching', 'All'];

// notices.title and notices.description are varchar(255). Laravel never checked the length, so a
// long description failed at the database instead of with a message.
const MAX_TEXT_LENGTH = 255;

function isValidIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validateText(errors, field, label, raw) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) {
    errors[field] = `${label} is required`;
  } else if (value.length > MAX_TEXT_LENGTH) {
    errors[field] = `${label} must be at most ${MAX_TEXT_LENGTH} characters`;
  }
  return value;
}

// Returns { value, errors }. errors is null when the payload is valid. Create and update share the
// same field names (Laravel used title/e_title and sent department ids on create but short names
// on update).
function parseNoticePayload(body = {}) {
  const errors = {};

  const title = validateText(errors, 'title', 'Title', body.title);
  const description = validateText(errors, 'description', 'Description', body.description);

  const date = typeof body.date === 'string' ? body.date.trim() : '';
  if (!isValidIsoDate(date)) {
    errors.date = 'Date is required and must be a valid date (YYYY-MM-DD)';
  }

  const staffType = body.staff_type;
  if (!STAFF_TYPES.includes(staffType)) {
    errors.staff_type = `Staff type must be one of: ${STAFF_TYPES.join(', ')}`;
  }

  let departmentIds = [];
  if (!Array.isArray(body.department_ids) || body.department_ids.length === 0) {
    errors.department_ids = 'Select at least one department';
  } else {
    departmentIds = [...new Set(body.department_ids.map(Number))];
    if (departmentIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      errors.department_ids = 'Department ids must be positive integers';
    }
  }

  return {
    value: { title, description, date, staff_type: staffType, department_ids: departmentIds },
    errors: Object.keys(errors).length ? errors : null,
  };
}

function validateNoticePayload(req, _res, next) {
  const { value, errors } = parseNoticePayload(req.body);
  if (errors) {
    const err = new Error('Please correct the highlighted fields');
    err.statusCode = 422;
    err.errors = errors;
    return next(err);
  }
  req.body = value;
  return next();
}

module.exports = {
  STAFF_TYPES,
  MAX_TEXT_LENGTH,
  parseNoticePayload,
  validateNoticePayload,
};
