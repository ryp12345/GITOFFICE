const { pool } = require('./src/config/db');

async function test() {
  try {
    // Test with staff 317 who is a FASTRACK coordinator
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.password, u.role, u.status, u.created_at,
         s.fname, s.mname, s.lname, s.id as staff_id
       FROM users u
       LEFT JOIN staff s ON s.user_id = u.id
       WHERE s.id = 317
       LIMIT 1`
    );
    const user = rows[0] || null;
    console.log('User from DB:', user);
    
    if (user?.staff_id) {
      // Get coordinator names
      const coordResult = await pool.query(
        `SELECT c.name as coordinator_name
         FROM coordinator_staffs cs
         JOIN coordinators c ON c.id = cs.coordinator_id
         WHERE cs.staff_id = $1 AND cs.status = 'active'`,
        [user.staff_id]
      );
      user.coordinator_names = coordResult.rows.map(r => r.coordinator_name);
      console.log('User with coordinators:', user);
    }
  } catch(e) { console.error('Error:', e.message, e.stack); }
  await pool.end();
}

test();