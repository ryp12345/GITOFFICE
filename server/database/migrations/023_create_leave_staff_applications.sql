CREATE TABLE IF NOT EXISTS leave_staff_applications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  leave_id BIGINT NOT NULL,
  cl_type VARCHAR(20) NOT NULL DEFAULT 'Full',
  staff_id BIGINT NOT NULL,
  alternate BIGINT NOT NULL,
  additional_alternate BIGINT,
  reason TEXT NOT NULL,
  recommender BIGINT,
  approver BIGINT,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  no_of_days NUMERIC(6,2) NOT NULL,

  appl_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  leave_status VARCHAR(20) NOT NULL DEFAULT 'awaiting',

  year SMALLINT NOT NULL,

  created_at TIMESTAMP,
  updated_at TIMESTAMP,

  CONSTRAINT leave_staff_applications_cl_type_check 
    CHECK (cl_type IN ('Morning','Afternoon','Full')),

  CONSTRAINT leave_staff_applications_appl_status_check 
    CHECK (appl_status IN ('recommended','pending','rejected','approved','cancelled')),

  CONSTRAINT leave_staff_applications_leave_status_check 
    CHECK (leave_status IN ('taken','awaiting')),

  CONSTRAINT leave_staff_applications_leave_fk 
    FOREIGN KEY (leave_id) REFERENCES leaves(id) ON DELETE RESTRICT,

  CONSTRAINT leave_staff_applications_staff_fk 
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE RESTRICT,

  CONSTRAINT leave_staff_applications_alternate_fk 
    FOREIGN KEY (alternate) REFERENCES staff(id) ON DELETE RESTRICT,

  CONSTRAINT leave_staff_applications_additional_alternate_fk 
    FOREIGN KEY (additional_alternate) REFERENCES staff(id) ON DELETE RESTRICT,

  CONSTRAINT leave_staff_applications_recommender_fk 
    FOREIGN KEY (recommender) REFERENCES staff(id) ON DELETE SET NULL,

  CONSTRAINT leave_staff_applications_approver_fk 
    FOREIGN KEY (approver) REFERENCES staff(id) ON DELETE SET NULL
);