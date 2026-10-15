const ExcelJS = require('exceljs');
const { pool } = require('../config/db');

// Staff view tabs ported from Laravel ESTB\staff\urlcontroller (salary, tds, export, staffremuneration)
// and ESTB\festivaladvanceController.

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function notFound(message) {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
}

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

// Salaries are credited (created_at) in the month after the one they pay for, so Laravel
// shows created_at - 1 month as the salary month.
const SALARY_MONTH_SQL = "to_char(created_at - interval '1 month', 'YYYY-MM')";

// ── Festival Advance ─────────────────────────────────────────────────────────

async function listFestivalAdvances(staffId) {
  const { rows } = await pool.query(
    'SELECT * FROM festival_advances WHERE staff_id = $1 ORDER BY id ASC',
    [staffId]
  );
  return rows;
}

async function createFestivalAdvance(staffId, payload) {
  // Laravel fills fyear with the current year (read-only field on the add form).
  const fyear = toInt(payload.fyear, new Date().getFullYear());
  const amount = toInt(payload.amount, null);
  const startDate = payload.start_date || null;

  if (amount === null || amount < 0 || !startDate) {
    throw badRequest('amount and start_date are required');
  }

  const { rows } = await pool.query(
    `INSERT INTO festival_advances (staff_id, fyear, amount, start_date, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     RETURNING *`,
    [staffId, fyear, amount, startDate]
  );
  return rows[0];
}

async function updateFestivalAdvance(staffId, advanceId, payload) {
  const amount = toInt(payload.amount, null);
  const startDate = payload.start_date || null;

  if (amount === null || amount < 0 || !startDate) {
    throw badRequest('amount and start_date are required');
  }

  // fyear is read-only on the Laravel edit form, so it is never changed here.
  const { rows } = await pool.query(
    `UPDATE festival_advances SET amount = $1, start_date = $2, updated_at = NOW()
     WHERE id = $3 AND staff_id = $4
     RETURNING *`,
    [amount, startDate, advanceId, staffId]
  );
  if (!rows.length) throw notFound('Festival advance not found for this staff');
  return rows[0];
}

async function deleteFestivalAdvance(staffId, advanceId) {
  const { rowCount } = await pool.query(
    'DELETE FROM festival_advances WHERE id = $1 AND staff_id = $2',
    [advanceId, staffId]
  );
  return rowCount > 0;
}

// ── Remuneration ─────────────────────────────────────────────────────────────

function financialYearFor(dateStr) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const start = date.getMonth() >= 3 ? year : year - 1;
  return `${start}-${start + 1}`;
}

async function listRemunerationHeads() {
  const { rows } = await pool.query(
    'SELECT id, remuneration_head FROM remunerationheads ORDER BY remuneration_head ASC'
  );
  return rows;
}

async function listRemunerations(staffId) {
  // Laravel selects * across the join, so remunerationheads.id overwrites the row id and its
  // edit/delete links target the wrong record. Select the columns explicitly instead.
  const { rows } = await pool.query(
    `SELECT sr.id, sr.staff_id, sr.remunerationhead_id, rh.remuneration_head,
            sr.amount, sr.date_of_disbursement, sr.financial_year, sr.created_at
     FROM staffremunerationheads sr
     JOIN remunerationheads rh ON rh.id = sr.remunerationhead_id
     WHERE sr.staff_id = $1
     ORDER BY sr.date_of_disbursement DESC NULLS LAST, sr.id DESC`,
    [staffId]
  );
  return rows;
}

function normalizeRemunerationRow(row) {
  const headId = toInt(row.remunerationhead_id, null);
  const amount = Number(row.amount);
  const date = row.date_of_disbursement || null;

  if (!headId || !Number.isFinite(amount) || amount < 0 || !date) {
    throw badRequest('remunerationhead_id, amount and date_of_disbursement are required for every row');
  }
  return {
    headId,
    amount,
    date,
    financialYear: row.financial_year || financialYearFor(date),
  };
}

// Accepts { rows: [...] } (the tab's multi-row add form) or a single row.
async function createRemunerations(staffId, payload) {
  const input = Array.isArray(payload.rows) ? payload.rows : [payload];
  if (!input.length) throw badRequest('At least one remuneration row is required');
  const rows = input.map(normalizeRemunerationRow);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created = [];
    for (const r of rows) {
      const { rows: inserted } = await client.query(
        `INSERT INTO staffremunerationheads
           (staff_id, remunerationhead_id, amount, date_of_disbursement, financial_year, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [staffId, r.headId, r.amount, r.date, r.financialYear]
      );
      created.push(inserted[0]);
    }
    await client.query('COMMIT');
    return created;
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23503') throw badRequest('Invalid remuneration head');
    throw err;
  } finally {
    client.release();
  }
}

async function updateRemuneration(staffId, remunerationId, payload) {
  const r = normalizeRemunerationRow(payload);
  const { rows } = await pool.query(
    `UPDATE staffremunerationheads
     SET remunerationhead_id = $1, amount = $2, date_of_disbursement = $3, financial_year = $4, updated_at = NOW()
     WHERE id = $5 AND staff_id = $6
     RETURNING *`,
    [r.headId, r.amount, r.date, r.financialYear, remunerationId, staffId]
  );
  if (!rows.length) throw notFound('Remuneration not found for this staff');
  return rows[0];
}

async function deleteRemuneration(staffId, remunerationId) {
  const { rowCount } = await pool.query(
    'DELETE FROM staffremunerationheads WHERE id = $1 AND staff_id = $2',
    [remunerationId, staffId]
  );
  return rowCount > 0;
}

// ── Salary ───────────────────────────────────────────────────────────────────

// month = 1..12 → the salary paid for that month (credited the following month);
// month = 'all' → credits from Feb of `year` to Jan of `year + 1`, i.e. salary months Jan..Dec.
async function listSalaries(staffId, { month, year }) {
  const now = new Date();
  const inputYear = toInt(year, now.getFullYear());
  const isAll = String(month || '').toLowerCase() === 'all';
  const inputMonth = isAll ? 'all' : toInt(month, now.getMonth() + 1);

  if (!isAll && (inputMonth < 1 || inputMonth > 12)) throw badRequest('month must be 1-12 or "all"');

  let from;
  let to;
  if (isAll) {
    from = new Date(Date.UTC(inputYear, 1, 1));
    to = new Date(Date.UTC(inputYear + 1, 1, 1));
  } else {
    from = new Date(Date.UTC(inputYear, inputMonth, 1)); // credit month = inputMonth + 1
    to = new Date(Date.UTC(inputYear, inputMonth + 1, 1));
  }

  const { rows } = await pool.query(
    `SELECT id, basic, da, gross_salary, net_salary, income_tax, total_deductions, created_at,
            ${SALARY_MONTH_SQL} AS salary_month
     FROM staffsalaries
     WHERE staff_id = $1 AND created_at >= $2 AND created_at < $3
     ORDER BY created_at ASC`,
    [staffId, from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)]
  );
  return { month: inputMonth, year: inputYear, rows };
}

// ── TDS ──────────────────────────────────────────────────────────────────────

function resolveTdsParams({ from_month: fromMonth, to_month: toMonth, year }) {
  const f = toInt(fromMonth, 4);
  const t = toInt(toMonth, 3);
  const y = toInt(year, new Date().getFullYear());
  if (f < 1 || f > 12 || t < 1 || t > 12) throw badRequest('from_month and to_month must be 1-12');
  return { fromMonth: f, toMonth: t, year: y };
}

async function getTds(staffId, query) {
  const { fromMonth, toMonth, year } = resolveTdsParams(query);

  // Same window as Laravel: credit dates from (fromMonth + 1) to the end of (toMonth + 1),
  // rolling into the next year when the range wraps (e.g. Apr..Mar).
  const endYear = toMonth < fromMonth ? year + 1 : year;
  const start = new Date(Date.UTC(year, fromMonth, 1));
  const end = new Date(Date.UTC(endYear, toMonth + 1, 1));

  const { rows: salaries } = await pool.query(
    `SELECT id, basic, gross_salary, income_tax, created_at, ${SALARY_MONTH_SQL} AS salary_month
     FROM staffsalaries
     WHERE staff_id = $1 AND created_at >= $2 AND created_at < $3
     ORDER BY created_at ASC`,
    [staffId, start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
  );

  // Additional income = remunerations recorded within the financial year (Apr..Mar), by month.
  // Laravel's mapWithKeys keeps only the last entry of a month; sum them so none is dropped.
  const { rows: incomeRows } = await pool.query(
    `SELECT to_char(created_at, 'YYYY-MM') AS ym, SUM(amount) AS amount
     FROM staffremunerationheads
     WHERE staff_id = $1 AND created_at >= $2 AND created_at < $3
     GROUP BY 1`,
    [staffId, `${year}-04-01`, `${year + 1}-04-01`]
  );
  const additional = Object.fromEntries(incomeRows.map((r) => [r.ym, Number(r.amount) || 0]));

  const totals = { basic: 0, gross: 0, additional: 0, income_tax: 0 };
  const rows = salaries.map((s) => {
    // Key by salary month, as Laravel's rows and Excel export do (its on-screen total used the
    // credit month instead, so the total could disagree with the column it sums).
    const additionalIncome = additional[s.salary_month] || 0;
    totals.basic += Number(s.basic) || 0;
    totals.gross += Number(s.gross_salary) || 0;
    totals.additional += additionalIncome;
    totals.income_tax += Number(s.income_tax) || 0;
    return {
      id: s.id,
      salary_month: s.salary_month,
      basic: Number(s.basic) || 0,
      gross_salary: Number(s.gross_salary) || 0,
      additional_income: additionalIncome,
      income_tax: Number(s.income_tax) || 0,
    };
  });

  return {
    from_month: fromMonth,
    to_month: toMonth,
    year,
    financial_year: `${year}-${year + 1}`,
    assessment_year: `${year + 1}-${year + 2}`,
    rows,
    totals,
  };
}

async function buildTdsWorkbook(staffId, query) {
  const tds = await getTds(staffId, query);
  const { rows: staffRows } = await pool.query('SELECT fname, lname FROM staff WHERE id = $1', [staffId]);
  const staffName = staffRows[0] ? `${staffRows[0].fname || ''} ${staffRows[0].lname || ''}`.trim() : '';

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('TDS');

  sheet.mergeCells('A1:B1');
  sheet.getCell('A1').value = `Assessment Year: ${tds.assessment_year}`;
  sheet.mergeCells('C1:D1');
  sheet.getCell('C1').value = `Financial Year: ${tds.financial_year}`;
  sheet.mergeCells('E1:F1');
  sheet.getCell('E1').value = `Staff Name: ${staffName}`;

  sheet.getRow(3).values = ['Month', 'Basic Salary (₹)', 'Gross Salary (₹)', 'Additional Income (₹)', 'Income Tax (₹)'];
  sheet.getRow(3).font = { bold: true };

  const monthName = (ym) => new Date(`${ym}-01T00:00:00Z`).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  let rowIdx = 4;
  tds.rows.forEach((r) => {
    sheet.getRow(rowIdx).values = [monthName(r.salary_month), r.basic, r.gross_salary, r.additional_income, r.income_tax];
    rowIdx += 1;
  });

  const totalRow = sheet.getRow(rowIdx);
  totalRow.values = ['Total', tds.totals.basic, tds.totals.gross, tds.totals.additional, tds.totals.income_tax];
  totalRow.font = { bold: true };
  for (let c = 1; c <= 5; c += 1) {
    totalRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCE5FF' } };
  }
  sheet.columns.forEach((col) => { col.width = 22; });

  return workbook.xlsx.writeBuffer();
}

module.exports = {
  listFestivalAdvances,
  createFestivalAdvance,
  updateFestivalAdvance,
  deleteFestivalAdvance,
  listRemunerationHeads,
  listRemunerations,
  createRemunerations,
  updateRemuneration,
  deleteRemuneration,
  listSalaries,
  getTds,
  buildTdsWorkbook,
};
