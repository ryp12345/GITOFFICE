const { pool } = require('../config/db');
const { roleMiddleware } = require('./role.middleware');

// Laravel guards every ESTB route with role:Establishment. These roles also have a read-only staff
// directory in the client (StaffViewPage readOnly under /super-admin, /principal, /registrar,
// /dean_admin and /dean-rnd), so they may read any staff record but never write.
const ESTB_ROLES = ['Establishment', 'establishment'];
const ESTB_READ_ROLES = [
  ...ESTB_ROLES,
  'Super Admin', 'super-admin', 'admin',
  'Principal',
  'Registrar',
  'Dean_admin', 'Dean Admin',
  'Deanrnd'
];

const requireEstb = roleMiddleware(...ESTB_ROLES);

function hasRole(user, roles) {
  const role = String(user?.role || '').trim().toLowerCase();
  return roles.some((r) => r.toLowerCase() === role);
}

function forbidden(next) {
  const err = new Error('Forbidden');
  err.statusCode = 403;
  return next(err);
}

// Tokens issued before staff_id was added to the payload fall back to a lookup.
async function resolveOwnStaffId(user) {
  if (user?.staff_id) return Number(user.staff_id);
  if (!user?.id) return null;
  const { rows } = await pool.query('SELECT id FROM staff WHERE user_id = $1 LIMIT 1', [user.id]);
  return rows[0] ? Number(rows[0].id) : null;
}

// Endpoints under /api/staff that are not tied to a single staff record but still expose pay data.
const ESTB_ONLY_READ_PATHS = ['/getstaffpay_list'];

// Mounted on /api/staff (after authMiddleware), so it also covers every staff* sub-router:
// - writes are Establishment-only, as in Laravel;
// - a staff member's sub-records (salary, loans, LIC, tax, increments, Form 16, ...) are readable
//   by Establishment / Super Admin, or by that staff member;
// - the staff list and profile stay readable to signed-in users, which other portals rely on.
async function staffRecordGuard(req, _res, next) {
  try {
    if (hasRole(req.user, ESTB_ROLES)) return next();
    if (req.method !== 'GET') return forbidden(next);
    if (hasRole(req.user, ESTB_READ_ROLES)) return next();

    if (ESTB_ONLY_READ_PATHS.includes(req.path)) return forbidden(next);

    const subRecord = req.path.match(/^\/(\d+)\/.+/);
    if (!subRecord) return next();

    const ownStaffId = await resolveOwnStaffId(req.user);
    if (ownStaffId && Number(subRecord[1]) === ownStaffId) return next();
    return forbidden(next);
  } catch (error) {
    return next(error);
  }
}

// Staff manage their own qualifications (pages/staff/QualificationPage.jsx); Establishment manages all.
async function qualificationGuard(req, _res, next) {
  try {
    if (hasRole(req.user, ESTB_ROLES)) return next();
    if (req.method === 'GET' && hasRole(req.user, ESTB_READ_ROLES)) return next();

    let ownerId = req.params.staffId;
    if (req.params.id) {
      const { rows } = await pool.query('SELECT staff_id FROM qualification_staff WHERE id = $1', [req.params.id]);
      ownerId = rows[0]?.staff_id;
    }

    const ownStaffId = await resolveOwnStaffId(req.user);
    if (ownerId && ownStaffId && Number(ownerId) === ownStaffId) return next();
    return forbidden(next);
  } catch (error) {
    return next(error);
  }
}

module.exports = { ESTB_ROLES, ESTB_READ_ROLES, requireEstb, staffRecordGuard, qualificationGuard };
