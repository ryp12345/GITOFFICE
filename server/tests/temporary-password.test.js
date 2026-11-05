const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const request = require('supertest');

const userModel = require('../src/models/user.model');
const { pool } = require('../src/config/db');
const app = require('../src/app');
const authService = require('../src/services/auth.service');
const staffService = require('../src/services/staff.service');
const { generateTemporaryPassword, passwordPolicyError, TEMPORARY_PASSWORD_LENGTH } = require('../src/utils/password');

// ---------- in-memory users table (real bcrypt hashes) ----------

const users = new Map();

function addUser(row) {
  users.set(row.id, { must_change_password: false, status: 'Active', staff_id: null, coordinator_names: [], ...row });
}

test.mock.method(userModel, 'findByEmail', async (email) => {
  const row = [...users.values()].find((u) => u.email === email);
  return row ? { ...row } : null;
});
test.mock.method(userModel, 'findById', async (id) => {
  const row = users.get(Number(id));
  if (!row) return null;
  const { password: _omit, ...safe } = row;
  return safe;
});
test.mock.method(userModel, 'findAuthStateById', async (id) => {
  const row = users.get(Number(id));
  return row ? { id: row.id, password: row.password, must_change_password: row.must_change_password } : null;
});
test.mock.method(userModel, 'updatePasswordById', async (id, passwordHash, { mustChangePassword = false } = {}) => {
  const row = users.get(Number(id));
  if (!row) return null;
  row.password = passwordHash;
  row.must_change_password = Boolean(mustChangePassword);
  return { id: row.id, email: row.email, role: row.role, status: row.status, must_change_password: row.must_change_password };
});
test.mock.method(userModel, 'findAll', async () => [...users.values()].map(({ password: _p, ...u }) => u));

const ADMIN = { id: 1, email: 'admin@git.edu', role: 'Super Admin' };
const EMPLOYEE = { id: 2, email: 'teacher@git.edu', role: 'teaching', staff_id: 42 };
const NORMAL = { id: 3, email: 'normal@git.edu', role: 'teaching', staff_id: 43 };
const OWN_PASSWORDS = { 1: 'AdminPass#2024', 2: 'TeacherOld#2024', 3: 'NormalUser#2024' };

test.before(async () => {
  for (const u of [ADMIN, EMPLOYEE, NORMAL]) {
    addUser({ ...u, password: await bcrypt.hash(OWN_PASSWORDS[u.id], 4) });
  }
});

const login = (email, password) => request(app).post('/api/auth/login').send({ email, password });
const auth = (token) => ({ Authorization: `Bearer ${token}` });
// A route that reaches its handler only when the session has normal access (no DB needed):
// a PNG is refused by the handler with 400, whereas a restricted session gets 403 first.
const probeNormalAccess = (token) => request(app).post('/api/profile/photo').set(auth(token))
  .attach('profile_photo', Buffer.from('89504e470d0a1a0a', 'hex'), { filename: 'x.png', contentType: 'image/png' });

// ---------- generation and hashing ----------

test('temporary passwords are random, unique and meet the policy', () => {
  const seen = new Set();
  for (let i = 0; i < 2000; i += 1) {
    const pw = generateTemporaryPassword();
    assert.equal(pw.length, TEMPORARY_PASSWORD_LENGTH);
    assert.match(pw, /[A-Z]/);
    assert.match(pw, /[a-z]/);
    assert.match(pw, /[2-9]/);
    assert.match(pw, /[!@#$%*?\-_+=]/);
    assert.doesNotMatch(pw, /[0O1lI]/, 'no look-alike characters');
    assert.equal(passwordPolicyError(pw), null);
    seen.add(pw);
  }
  assert.equal(seen.size, 2000, 'every generated password is unique');
  assert.notEqual(generateTemporaryPassword(), 'Password@123');
});

test('policy: existing 8-character minimum, bcrypt 72-byte maximum', () => {
  assert.match(passwordPolicyError('short7!'), /at least 8/);
  assert.equal(passwordPolicyError('eightchr'), null);
  assert.match(passwordPolicyError('x'.repeat(73)), /at most 72/);
});

// ---------- full workflow over HTTP ----------

test('admin reset -> forced change -> access restored (end-to-end)', async (t) => {
  // Admin and employee both signed in before the reset.
  const adminSession = (await login(ADMIN.email, OWN_PASSWORDS[1])).body.data;
  const oldEmployee = (await login(EMPLOYEE.email, OWN_PASSWORDS[2])).body.data;
  assert.equal(oldEmployee.status, 'OK');
  assert.equal((await probeNormalAccess(oldEmployee.token)).status, 400, 'normal access before reset');

  await t.test('only admins can reset', async () => {
    const res = await request(app).post(`/api/users/${EMPLOYEE.id}/reset-password`).set(auth(oldEmployee.token));
    assert.equal(res.status, 403);
  });

  // --- 1. reset ---
  const reset = await request(app).post(`/api/users/${EMPLOYEE.id}/reset-password`).set(auth(adminSession.token));
  assert.equal(reset.status, 200);
  const temp = reset.body.data.temporaryPassword;
  assert.equal(typeof temp, 'string');
  assert.equal(temp.length, TEMPORARY_PASSWORD_LENGTH);
  assert.equal(reset.headers['cache-control'], 'no-store');
  assert.ok(!reset.body.message.includes(temp), 'password is not repeated in the message');

  await t.test('only the bcrypt hash is stored and the change is flagged', async () => {
    const row = users.get(EMPLOYEE.id);
    assert.notEqual(row.password, temp);
    assert.match(row.password, /^\$2[aby]\$10\$/);
    assert.equal(await bcrypt.compare(temp, row.password), true);
    assert.equal(row.must_change_password, true);
    assert.ok(!JSON.stringify([...users.values()]).includes(temp));
  });

  await t.test('a second reset gives a different password', async () => {
    const again = await request(app).post(`/api/users/${EMPLOYEE.id}/reset-password`).set(auth(adminSession.token));
    assert.notEqual(again.body.data.temporaryPassword, temp);
    // Put the first one back for the rest of the flow.
    users.get(EMPLOYEE.id).password = await bcrypt.hash(temp, 4);
  });

  await t.test('existing sessions are invalidated by the reset', async () => {
    assert.equal((await probeNormalAccess(oldEmployee.token)).status, 401);
    assert.equal((await request(app).get('/api/users/me').set(auth(oldEmployee.token))).status, 401);
    const refresh = await request(app).post('/api/auth/refresh').send({ refreshToken: oldEmployee.refreshToken });
    assert.equal(refresh.status, 401);
  });

  // --- 2. login with the temporary password ---
  const tempLogin = await login(EMPLOYEE.email, temp);
  assert.equal(tempLogin.status, 200, 'temporary password authenticates normally');
  const pending = tempLogin.body.data;
  assert.equal(pending.status, 'PASSWORD_CHANGE_REQUIRED');
  assert.equal(pending.mustChangePassword, true);
  assert.equal(pending.user.must_change_password, true);

  await t.test('dashboard, admin, staff and report APIs are blocked while the change is pending', async () => {
    const blocked = [
      ['get', '/api/staff'],
      ['get', '/api/staff/42'],
      ['get', '/api/users'],
      ['get', '/api/hod/dashboard'],
      ['get', '/api/super-admin/dashboard'],
      ['get', '/api/notifications?user_id=2'],
      ['get', '/api/research/publication'],
      ['get', '/api/profile/photo'],
      ['post', `/api/users/${EMPLOYEE.id}/impersonate`],
      ['get', '/api/users/me/../../staff'],
    ];
    for (const [method, path] of blocked) {
      const res = await request(app)[method](path).set(auth(pending.token));
      assert.equal(res.status, 403, `${method.toUpperCase()} ${path} -> ${res.status}`);
      assert.equal(res.body.code, 'PASSWORD_CHANGE_REQUIRED');
    }
    assert.equal((await probeNormalAccess(pending.token)).status, 403);
  });

  await t.test('refresh keeps the session restricted', async () => {
    const refresh = await request(app).post('/api/auth/refresh').send({ refreshToken: pending.refreshToken });
    assert.equal(refresh.status, 200);
    assert.equal(refresh.body.data.status, 'PASSWORD_CHANGE_REQUIRED');
    assert.equal((await probeNormalAccess(refresh.body.data.token)).status, 403);
  });

  await t.test('only the essential endpoints work while pending', async () => {
    assert.equal((await request(app).get('/api/users/me').set(auth(pending.token))).status, 200);
    const verify = await request(app).post('/api/users/me/verify-password').set(auth(pending.token)).send({ currentPassword: temp });
    assert.equal(verify.status, 200);
    assert.equal(verify.body.data.matched, true);
  });

  // --- 3. change password: validation ---
  const change = (body, token = pending.token) => request(app).post('/api/users/me/change-password').set(auth(token)).send(body);
  const NEW = 'MyOwnSecret#77';

  await t.test('change password validates every rule', async () => {
    const cases = [
      [{ currentPassword: temp, newPassword: NEW }, /confirmation are required/],
      [{ currentPassword: temp, newPassword: NEW, confirmPassword: 'different#1' }, /do not match/],
      [{ currentPassword: temp, newPassword: 'short', confirmPassword: 'short' }, /at least 8/],
      [{ currentPassword: 'wrong-current', newPassword: NEW, confirmPassword: NEW }, /Current password is incorrect/],
      [{ currentPassword: temp, newPassword: temp, confirmPassword: temp }, /cannot be same/],
    ];
    for (const [body, pattern] of cases) {
      const res = await change(body);
      assert.equal(res.status, 400, JSON.stringify(body));
      assert.match(res.body.message, pattern);
    }
    assert.equal(users.get(EMPLOYEE.id).must_change_password, true, 'still pending after failed attempts');
  });

  // --- 4. successful change ---
  const changed = await change({ currentPassword: temp, newPassword: NEW, confirmPassword: NEW });
  assert.equal(changed.status, 200);
  const fresh = changed.body.data;

  await t.test('change clears the flag, stores a new hash and issues a fresh session', async () => {
    const row = users.get(EMPLOYEE.id);
    assert.equal(row.must_change_password, false);
    assert.equal(await bcrypt.compare(NEW, row.password), true);
    assert.equal(fresh.status, 'OK');
    assert.equal(fresh.user.must_change_password, false);
    assert.ok(fresh.token && fresh.refreshToken);
    assert.equal(changed.headers['cache-control'], 'no-store');
  });

  await t.test('access is restored with the fresh session', async () => {
    assert.equal((await probeNormalAccess(fresh.token)).status, 400);
    assert.equal((await request(app).get('/api/users/me').set(auth(fresh.token))).status, 200);
  });

  await t.test('the restricted pre-change session no longer works', async () => {
    assert.equal((await request(app).get('/api/users/me').set(auth(pending.token))).status, 401);
    assert.equal((await request(app).post('/api/auth/refresh').send({ refreshToken: pending.refreshToken })).status, 401);
  });

  await t.test('the temporary password is rejected afterwards', async () => {
    assert.equal((await login(EMPLOYEE.email, temp)).status, 401);
    const ok = await login(EMPLOYEE.email, NEW);
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.status, 'OK');
  });

  await t.test('the admin was unaffected throughout', async () => {
    const res = await request(app).get('/api/users').set(auth(adminSession.token));
    assert.equal(res.status, 200);
  });
});

test('normal users are unaffected: plain login, full access, no forced change', async () => {
  const res = await login(NORMAL.email, OWN_PASSWORDS[3]);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.status, 'OK');
  assert.equal(res.body.data.mustChangePassword, false);
  assert.equal((await probeNormalAccess(res.body.data.token)).status, 400);
  assert.equal(users.get(NORMAL.id).must_change_password, false);
});

test('tokens without a password version (issued before this change) are refused', async () => {
  const { signAccessToken, signRefreshToken } = require('../src/utils/jwt');
  const legacy = signAccessToken({ id: NORMAL.id, role: NORMAL.role, staff_id: 43 });
  assert.equal((await request(app).get('/api/users/me').set(auth(legacy))).status, 401);
  const legacyRefresh = signRefreshToken({ id: NORMAL.id, role: NORMAL.role });
  assert.equal((await request(app).post('/api/auth/refresh').send({ refreshToken: legacyRefresh })).status, 401);
});

test('forgot-password reset (user picks own password) clears a pending change', async () => {
  const row = users.get(NORMAL.id);
  row.must_change_password = true;
  const { signPasswordResetToken } = require('../src/utils/jwt');
  const token = signPasswordResetToken({ id: row.id, email: row.email, passwordHash: row.password });
  await authService.resetPasswordWithToken(token, 'ChosenByMe#123');
  assert.equal(row.must_change_password, false);
});

// ---------- account creation ----------

test('new employee accounts get a unique temporary password and must change it', async (t) => {
  const queries = [];
  const fakeClient = {
    query: async (sql, params = []) => {
      queries.push({ sql, params });
      if (/SELECT id FROM users/.test(sql)) return { rows: [] };
      if (/INSERT INTO users/.test(sql)) return { rows: [{ id: 99, email: params[0] }] };
      if (/INSERT INTO staff /.test(sql)) return { rows: [{ id: 500 }] };
      return { rows: [] };
    },
    release: () => {},
  };
  t.mock.method(pool, 'connect', async () => fakeClient);

  const a = await staffService.create({ email: 'new1', password: 'changeme', fname: 'A' });
  const b = await staffService.create({ email: 'new2', fname: 'B' });

  const inserts = queries.filter((q) => /INSERT INTO users/.test(q.sql));
  assert.equal(inserts.length, 2);
  for (const [i, created] of [a, b].entries()) {
    const { sql, params } = inserts[i];
    assert.match(sql, /must_change_password/);
    assert.match(sql, /true/);
    assert.equal(created.temporaryPassword.length, TEMPORARY_PASSWORD_LENGTH);
    assert.equal(await bcrypt.compare(created.temporaryPassword, params[1]), true, 'stored value is the bcrypt hash');
    assert.ok(!params.includes(created.temporaryPassword), 'plaintext never sent to the DB');
    assert.equal(await bcrypt.compare('changeme', params[1]), false, 'client-sent password is ignored');
  }
  assert.notEqual(a.temporaryPassword, b.temporaryPassword);
});
