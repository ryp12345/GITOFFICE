// Finds accounts still using the old shared default passwords (admin reset "Password@123",
// staff creation "changeme") and sets must_change_password = true on them, so those users
// must choose their own password at next login. Accounts with their own password are untouched.
//
//   node scripts/flag_default_passwords.js           # dry run: only reports counts
//   node scripts/flag_default_passwords.js --apply   # flags the matching accounts
//
// Prints user ids only; never prints passwords or hashes.
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');

const OLD_DEFAULTS = ['Password@123', 'changeme'];

(async () => {
  const apply = process.argv.includes('--apply');
  try {
    const { rows } = await pool.query(
      'SELECT id, password FROM users WHERE must_change_password = false ORDER BY id'
    );
    const matches = [];
    for (const row of rows) {
      for (const candidate of OLD_DEFAULTS) {
        // eslint-disable-next-line no-await-in-loop
        if (row.password && (await bcrypt.compare(candidate, row.password))) {
          matches.push(row.id);
          break;
        }
      }
    }

    console.log(`Checked ${rows.length} accounts; ${matches.length} still use an old default password.`);
    if (matches.length) console.log('User ids:', matches.join(', '));

    if (apply && matches.length) {
      const result = await pool.query(
        'UPDATE users SET must_change_password = true, updated_at = NOW() WHERE id = ANY($1::bigint[])',
        [matches]
      );
      console.log(`Flagged ${result.rowCount} accounts for a mandatory password change.`);
    } else if (!apply) {
      console.log('Dry run: nothing changed. Re-run with --apply to flag them.');
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
