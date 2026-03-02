-- Reset users id sequence to the current max(id) to avoid duplicate primary key errors.
-- Run this once after importing data or if the sequence is out-of-sync.
BEGIN;
SELECT setval(pg_get_serial_sequence('users','id'), COALESCE((SELECT MAX(id) FROM users), 1));
COMMIT;
