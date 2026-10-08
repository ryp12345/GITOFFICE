-- The faculty recruitment rows were imported from MySQL with their original ids, but the
-- identity sequences were left at their start value. Every new application then tried an id
-- that already existed and failed with a duplicate primary key, so HODs could not add one.
-- Moves each sequence past the highest existing id. Safe to run more than once.

SELECT setval(
  pg_get_serial_sequence('associate_professor_applications', 'id'),
  GREATEST((SELECT COALESCE(MAX(id), 0) FROM associate_professor_applications), 1),
  (SELECT COUNT(*) > 0 FROM associate_professor_applications)
);

SELECT setval(
  pg_get_serial_sequence('professor_applications', 'id'),
  GREATEST((SELECT COALESCE(MAX(id), 0) FROM professor_applications), 1),
  (SELECT COUNT(*) > 0 FROM professor_applications)
);
