-- Mandatory password change after an admin reset or account creation.
-- Set to true whenever the account is given a one-time temporary password; cleared when the
-- user picks their own password. Existing accounts default to false, so nobody is forced to
-- change a password they chose themselves.
-- (Accounts still on the old shared defaults can be flagged with
--  server/scripts/flag_default_passwords.js.)
-- Safe to run more than once.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;
