// node-postgres parses a DATE column into a JS Date at local midnight. JSON then serialises it
// in UTC, so on an IST server 2024-03-15 reaches the browser as "2024-03-14T18:30:00.000Z" and
// any client that reads the first ten characters shows (and saves back) the previous day.
// Converting the known DATE columns to a plain YYYY-MM-DD string with local getters keeps the
// calendar date the database actually holds.

function toIsoDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return value;

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDateColumns(row, columns) {
  if (!row) return row;

  columns.forEach((column) => {
    if (Object.prototype.hasOwnProperty.call(row, column)) {
      row[column] = toIsoDate(row[column]);
    }
  });
  return row;
}

module.exports = {
  toIsoDate,
  normalizeDateColumns,
};
