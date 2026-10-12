const test = require('node:test');
const assert = require('node:assert/strict');

const { getNoticeAbilities, canCreateNotice, canModifyNotice } = require('../src/policies/notice.policy');
const { parseNoticePayload } = require('../src/validations/notice.validation');

const validPayload = {
  title: ' Exam schedule ',
  description: 'Mid-term exams start Monday',
  date: '2026-10-20',
  staff_type: 'All',
  department_ids: [3, '5', 3],
};

test('policy: offices that had a Laravel notice board can raise notices', () => {
  const roles = [
    'Principal', 'PRINCIPAL', 'Dean_admin', 'Dean Admin', 'principal_office',
    'Registrar', 'Head of Department', 'Deanacad_s', 'Deanacad_d', 'Office_Stationary',
  ];
  for (const role of roles) {
    assert.equal(canCreateNotice({ id: 1, role }), true, role);
    assert.equal(getNoticeAbilities({ id: 1, role }).manageAll, false, role);
  }
});

test('policy: Super Admin can raise and manage every notice', () => {
  assert.deepEqual(getNoticeAbilities({ id: 1, role: 'Super Admin' }), { create: true, manageAll: true, audience: 'all' });
  assert.equal(canModifyNotice({ id: 1, role: 'Super Admin' }, { user_id: 99 }), true);
});

test('policy: Establishment, Admin and unknown roles get no notice access or feed', () => {
  for (const role of ['Establishment', 'Admin', 'student', undefined]) {
    assert.deepEqual(getNoticeAbilities({ id: 1, role }), { create: false, manageAll: false, audience: 'none' }, String(role));
  }
});

test('policy: feed audience per role', () => {
  const audience = (role) => getNoticeAbilities({ id: 1, role }).audience;
  assert.equal(audience('Principal'), 'all');
  assert.equal(audience('Deanrnd'), 'all');
  assert.equal(audience('Head of Department'), 'department');
  assert.equal(audience('teaching'), 'staff');
  assert.equal(audience('non-teaching'), 'staff');
  assert.equal(canCreateNotice({ id: 1, role: 'teaching' }), false);
  assert.equal(canCreateNotice({ id: 1, role: 'Deanrnd' }), false);
});

test('policy: non-admins can only modify their own notices', () => {
  const principal = { id: 7, role: 'Principal' };
  assert.equal(canModifyNotice(principal, { user_id: 7 }), true);
  assert.equal(canModifyNotice(principal, { user_id: '7' }), true);
  assert.equal(canModifyNotice(principal, { user_id: 8 }), false);
  assert.equal(canModifyNotice({ id: 8, role: 'Establishment' }, { user_id: 8 }), false);
});

test('validation: accepts a valid payload, trims text and de-duplicates departments', () => {
  const { value, errors } = parseNoticePayload(validPayload);
  assert.equal(errors, null);
  assert.equal(value.title, 'Exam schedule');
  assert.deepEqual(value.department_ids, [3, 5]);
});

test('validation: reports every invalid field', () => {
  const { errors } = parseNoticePayload({
    title: '  ',
    description: 'x'.repeat(256),
    date: '2026-02-30',
    staff_type: 'teaching',
    department_ids: [],
  });
  assert.deepEqual(Object.keys(errors).sort(), ['date', 'department_ids', 'description', 'staff_type', 'title']);
});

test('validation: rejects non-integer department ids', () => {
  const { errors } = parseNoticePayload({ ...validPayload, department_ids: ['abc'] });
  assert.ok(errors.department_ids);
});

// Service authorization with the model stubbed, so no database is needed.
function loadServiceWithModel(stub) {
  const modelPath = require.resolve('../src/models/notice.model');
  const servicePath = require.resolve('../src/services/notice.service');
  delete require.cache[servicePath];
  require.cache[modelPath] = { id: modelPath, filename: modelPath, loaded: true, exports: stub };
  const service = require('../src/services/notice.service');
  delete require.cache[modelPath];
  delete require.cache[servicePath];
  return service;
}

test('service: another user\'s notice answers 404 on update and delete', async () => {
  const calls = [];
  const service = loadServiceWithModel({
    findNoticeById: async (id) => ({ id, user_id: 50 }),
    findActiveDepartmentIds: async (ids) => ids,
    updateNotice: async () => calls.push('update'),
    deleteNotice: async () => calls.push('delete'),
  });
  const dean = { id: 7, role: 'Dean_admin' };

  await assert.rejects(service.updateNotice(dean, '12', { department_ids: [1] }), { statusCode: 404 });
  await assert.rejects(service.deleteNotice(dean, '12'), { statusCode: 404 });
  assert.deepEqual(calls, []);
});

test('service: inactive or unknown departments are rejected before writing', async () => {
  let created = false;
  const service = loadServiceWithModel({
    findActiveDepartmentIds: async () => [1],
    createNotice: async () => { created = true; },
  });

  await assert.rejects(
    service.createNotice({ id: 7, role: 'Principal' }, { ...validPayload, department_ids: [1, 2] }),
    (err) => err.statusCode === 422 && Boolean(err.errors.department_ids)
  );
  assert.equal(created, false);
});

test('service: lists only own notices unless the user manages all', async () => {
  const seen = [];
  const service = loadServiceWithModel({ listNotices: async (opts) => seen.push(opts) });

  await service.listNotices({ id: 7, role: 'principal_office' });
  await service.listNotices({ id: 1, role: 'Super Admin' });
  assert.deepEqual(seen, [{ ownerUserId: 7 }, { ownerUserId: null }]);
});

test('service: rejects a malformed id with 400', async () => {
  const service = loadServiceWithModel({});
  await assert.rejects(service.getNotice({ id: 1, role: 'Super Admin' }, 'abc'), { statusCode: 400 });
});

function loadServiceWithStubs({ notice = {}, hodDepartment = null }) {
  const hodPath = require.resolve('../src/models/hodDepartmentOverview.model');
  const previous = require.cache[hodPath];
  require.cache[hodPath] = {
    id: hodPath, filename: hodPath, loaded: true,
    exports: { findDepartmentByHodUserId: async () => hodDepartment },
  };
  const service = loadServiceWithModel(notice);
  if (previous) require.cache[hodPath] = previous; else delete require.cache[hodPath];
  return service;
}

test('feed: institution-wide roles get every notice, limit clamped', async () => {
  const seen = [];
  const service = loadServiceWithStubs({ notice: { listNoticeFeed: async (opts) => { seen.push(opts); return []; } } });
  await service.getFeed({ id: 1, role: 'Principal' }, { limit: '500' });
  await service.getFeed({ id: 1, role: 'Deanrnd' }, { limit: 'abc' });
  assert.deepEqual(seen, [{ limit: 100 }, { limit: 20 }]);
});

test('feed: HOD sees only their department, unmapped HOD sees nothing', async () => {
  const seen = [];
  const notice = { listNoticeFeed: async (opts) => { seen.push(opts); return ['n']; } };
  const mapped = loadServiceWithStubs({ notice, hodDepartment: { id: '12' } });
  assert.deepEqual(await mapped.getFeed({ id: 5, role: 'Head of Department' }), ['n']);
  assert.deepEqual(seen, [{ departmentIds: [12], limit: 20 }]);

  const unmapped = loadServiceWithStubs({ notice, hodDepartment: null });
  assert.deepEqual(await unmapped.getFeed({ id: 5, role: 'Head of Department' }), []);
  assert.equal(seen.length, 1);
});

test('feed: staff see their departments and staff type only', async () => {
  const seen = [];
  const service = loadServiceWithStubs({
    notice: {
      findActiveDepartmentIdsForUser: async (userId) => (userId === 9 ? [3, 4] : []),
      listNoticeFeed: async (opts) => { seen.push(opts); return []; },
    },
  });
  await service.getFeed({ id: 9, role: 'non-teaching' });
  assert.deepEqual(seen, [{ departmentIds: [3, 4], staffType: 'Non-Teaching', limit: 20 }]);

  assert.deepEqual(await service.getFeed({ id: 10, role: 'teaching' }), []);
  assert.deepEqual(await service.getFeed({ id: 11, role: 'Establishment' }), []);
  assert.equal(seen.length, 1);
});
