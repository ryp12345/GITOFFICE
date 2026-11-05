// Test sessions without a database: every token is tied to a password version, and
// authMiddleware looks the user up on each request. This stubs that lookup so route tests
// get a normal (no pending password change) user whose stored hash matches the token.
const { mock } = require('node:test');
const userModel = require('../../src/models/user.model');
const { passwordVersion } = require('../../src/services/auth.service');
const { signAccessToken } = require('../../src/utils/jwt');

const TEST_HASH = '$2a$10$test-only-hash-for-route-tests......................';

// Users with a pending change, keyed by id (tests can add/remove entries).
const pendingChange = new Set();

mock.method(userModel, 'findAuthStateById', async (id) => ({
  id,
  password: TEST_HASH,
  must_change_password: pendingChange.has(Number(id)),
}));

function bearer(payload, hash = TEST_HASH) {
  return `Bearer ${signAccessToken({ ...payload, pv: passwordVersion(hash) })}`;
}

module.exports = { bearer, TEST_HASH, pendingChange };
