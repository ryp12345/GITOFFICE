const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const userModel = require('../src/models/user.model');
const authService = require('../src/services/auth.service');
const { signAccessToken, verifyRefreshToken } = require('../src/utils/jwt');
const { staffRecordGuard, qualificationGuard } = require('../src/middlewares/staffAccess.middleware');

const bearer = (payload) => `Bearer ${signAccessToken(payload)}`;
const estb = { id: 1, role: 'Establishment', staff_id: null };
const teacher = { id: 2, role: 'teaching', staff_id: 42 };

// Runs a middleware and resolves with the error passed to next() (undefined when allowed).
function runGuard(guard, req) {
  return new Promise((resolve) => guard(req, {}, resolve));
}

test('staff, qualification, biometric and notification APIs require login', async () => {
  for (const path of [
    '/api/staff',
    '/api/staff/42/lics',
    '/api/staff/42/form-16',
    '/api/staff-qualifications/42',
    '/api/biometric/daily',
    '/api/biometric/muster',
    '/api/notifications?user_id=1'
  ]) {
    const res = await request(app).get(path);
    assert.equal(res.status, 401, path);
  }
});

test('non-Establishment users cannot write staff or master records', async () => {
  const auth = bearer(teacher);
  const writes = [
    request(app).post('/api/staff').set('Authorization', auth).send({}),
    request(app).post('/api/staff/42/lics').set('Authorization', auth).send({}),
    request(app).delete('/api/staff/42/form-16/1').set('Authorization', auth),
    request(app).post('/api/departments').set('Authorization', auth).send({}),
    request(app).put('/api/designations/1').set('Authorization', auth).send({}),
    request(app).delete('/api/institutions/1').set('Authorization', auth),
    request(app).post('/api/associations').set('Authorization', auth).send({})
  ];
  for (const res of await Promise.all(writes)) {
    assert.equal(res.status, 403, `${res.req.method} ${res.req.path}`);
  }
});

test('staff sub-records: Establishment and Super Admin read all, others only their own', async () => {
  const read = (user, path) => runGuard(staffRecordGuard, { method: 'GET', path, user });

  assert.equal(await read(estb, '/7/lics'), undefined);
  assert.equal(await read({ id: 3, role: 'Super Admin' }, '/7/society-loans'), undefined);
  // Roles with a read-only staff directory in the client.
  for (const role of ['Principal', 'Registrar', 'Dean_admin', 'Deanrnd']) {
    assert.equal(await read({ id: 4, role }, '/615/designation-payscale'), undefined, role);
    const write = await runGuard(staffRecordGuard, { method: 'POST', path: '/615/designation-payscale', user: { id: 4, role } });
    assert.equal(write?.statusCode, 403, role);
  }
  assert.equal((await read({ id: 4, role: 'Head of Department' }, '/615/lics'))?.statusCode, 403);
  assert.equal(await read(teacher, '/42/lics'), undefined);
  assert.equal((await read(teacher, '/7/lics'))?.statusCode, 403);
  assert.equal((await read(teacher, '/getstaffpay_list'))?.statusCode, 403);
  // Profile and list stay readable: leave and dashboard pages of other portals depend on them.
  assert.equal(await read(teacher, '/7'), undefined);
  assert.equal(await read(teacher, '/'), undefined);

  const write = await runGuard(staffRecordGuard, { method: 'POST', path: '/7/lics', user: { id: 3, role: 'Super Admin' } });
  assert.equal(write?.statusCode, 403);
  assert.equal(await runGuard(staffRecordGuard, { method: 'PATCH', path: '/7/lics/1', user: estb }), undefined);
});

test('staff view payroll and leave tabs follow the staff sub-record rules', async () => {
  const tabPaths = ['/api/staff/42/festival-advances', '/api/staff/42/remunerations', '/api/staff/42/salaries',
    '/api/staff/42/tds', '/api/staff/42/tds/export', '/api/staff/42/leaves'];
  for (const path of tabPaths) {
    assert.equal((await request(app).get(path)).status, 401, path);
  }

  const auth = bearer(teacher);
  const writes = [
    request(app).post('/api/staff/42/festival-advances').set('Authorization', auth).send({}),
    request(app).patch('/api/staff/42/festival-advances/1').set('Authorization', auth).send({}),
    request(app).post('/api/staff/42/remunerations').set('Authorization', auth).send({}),
    request(app).delete('/api/staff/42/remunerations/1').set('Authorization', auth)
  ];
  for (const res of await Promise.all(writes)) {
    assert.equal(res.status, 403, `${res.req.method} ${res.req.path}`);
  }
  for (const path of tabPaths) {
    const res = await request(app).get(path.replace('/42/', '/7/')).set('Authorization', auth);
    assert.equal(res.status, 403, path);
  }
});

test('profile photo: login required, JPG only, at most 500 KB (Laravel rule)', async () => {
  assert.equal((await request(app).get('/api/profile/photo')).status, 401);
  assert.equal((await request(app).post('/api/profile/photo')).status, 401);

  const auth = bearer(teacher);
  const png = await request(app).post('/api/profile/photo').set('Authorization', auth)
    .attach('profile_photo', Buffer.from('89504e470d0a1a0a', 'hex'), { filename: 'me.png', contentType: 'image/png' });
  assert.equal(png.status, 400);
  assert.match(png.body.message, /Only JPG/);

  const big = Buffer.alloc(500001, 0);
  big[0] = 0xff; big[1] = 0xd8; big[2] = 0xff;
  const tooLarge = await request(app).post('/api/profile/photo').set('Authorization', auth)
    .attach('profile_photo', big, { filename: 'me.jpg', contentType: 'image/jpeg' });
  assert.equal(tooLarge.status, 400);
  assert.match(tooLarge.body.message, /500 KB/);
});

test('staff may manage only their own qualifications', async () => {
  const guard = (user, method, staffId) => runGuard(qualificationGuard, { method, params: { staffId }, user });

  assert.equal(await guard(teacher, 'POST', '42'), undefined);
  assert.equal((await guard(teacher, 'POST', '7'))?.statusCode, 403);
  assert.equal((await guard(teacher, 'GET', '7'))?.statusCode, 403);
  assert.equal(await guard(estb, 'POST', '7'), undefined);
});

test('register ignores a role sent by the client', async (t) => {
  t.mock.method(userModel, 'findByEmail', async () => null);
  const create = t.mock.method(userModel, 'create', async (row) => ({ id: 9, ...row }));

  await authService.register({ name: 'x', email: 'x@git.edu', password: 'secret123', role: 'Establishment' });

  assert.equal(create.mock.calls[0].arguments[0].role, 'user');
});

test('access token carries staff_id; refresh fails after the password changes', async (t) => {
  const user = { id: 5, email: 'estb@git.edu', role: 'Establishment', staff_id: 11, password: 'hash-v1' };
  const session = authService.issueSession(user);
  assert.equal(verifyRefreshToken(session.refreshToken).staff_id, 11);

  t.mock.method(userModel, 'findById', async () => ({ id: 5, email: user.email }));
  const findByEmail = t.mock.method(userModel, 'findByEmail', async () => ({ ...user }));

  const refreshed = await authService.refreshSession({ refreshToken: session.refreshToken });
  assert.equal(refreshed.user.role, 'Establishment');

  findByEmail.mock.mockImplementation(async () => ({ ...user, password: 'hash-v2' }));
  await assert.rejects(
    authService.refreshSession({ refreshToken: session.refreshToken }),
    (err) => err.statusCode === 401
  );
});
