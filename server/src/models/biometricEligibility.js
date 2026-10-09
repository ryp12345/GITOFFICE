// Who is expected to punch the biometric (used for present / leave / missing counts and lists).
//
// A staff member is expected when their latest *active* association is a working one, and they
// have no active exit association. Names are compared case-insensitively because master data
// mixes spellings (e.g. "Confirmed" and "contractual").

const WORKING_ASSOCIATIONS = [
  'confirmed',
  'probationary',
  'contractual',
  'promotional probationary',
  'temporary (non teaching)',
];

const EXIT_ASSOCIATIONS = ['resigned', 'retired', 'transfered', 'transferred', 'expired', 'terminated'];

function sqlList(values) {
  return values.map((v) => `'${v.replace(/'/g, "''")}'`).join(', ');
}

// SQL boolean condition for the staff row aliased as `alias` (default "s").
function expectedOnBiometricSql(alias = 's') {
  return `(
    EXISTS (
      SELECT 1
        FROM association_staff ast_w
        JOIN associations a_w ON a_w.id = ast_w.association_id
       WHERE ast_w.staff_id = ${alias}.id
         AND LOWER(COALESCE(ast_w.status, '')) = 'active'
         AND LOWER(TRIM(a_w.asso_name)) IN (${sqlList(WORKING_ASSOCIATIONS)})
         AND ast_w.id = (
           SELECT MAX(ast_l.id) FROM association_staff ast_l
            WHERE ast_l.staff_id = ${alias}.id AND LOWER(COALESCE(ast_l.status, '')) = 'active'
         )
    )
    AND NOT EXISTS (
      SELECT 1
        FROM association_staff ast_x
        JOIN associations a_x ON a_x.id = ast_x.association_id
       WHERE ast_x.staff_id = ${alias}.id
         AND LOWER(COALESCE(ast_x.status, '')) = 'active'
         AND LOWER(TRIM(a_x.asso_name)) IN (${sqlList(EXIT_ASSOCIATIONS)})
    )
  )`;
}

// SQL boolean condition: the staff row has no active exit association (resigned, retired, ...),
// i.e. they still belong to the institute even if their employee type was never closed.
function notExitedSql(alias = 's') {
  return `NOT EXISTS (
      SELECT 1
        FROM association_staff ast_e
        JOIN associations a_e ON a_e.id = ast_e.association_id
       WHERE ast_e.staff_id = ${alias}.id
         AND LOWER(COALESCE(ast_e.status, '')) = 'active'
         AND LOWER(TRIM(a_e.asso_name)) IN (${sqlList(EXIT_ASSOCIATIONS)})
    )`;
}

module.exports = {
  WORKING_ASSOCIATIONS,
  EXIT_ASSOCIATIONS,
  expectedOnBiometricSql,
  notExitedSql,
};
