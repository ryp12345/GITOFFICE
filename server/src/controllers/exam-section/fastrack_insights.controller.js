const insightsService = require('../../services/exam-section/fastrack_insights.service');
const ExcelJS = require('exceljs');

async function getInsights(req, res, next) {
  try {
    const items = await insightsService.getInsights();
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
}

async function exportInsights(req, res, next) {
  try {
    const rows = await insightsService.exportInsights();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Fastrack-Courses');

    sheet.mergeCells('A2:K2');
    sheet.getCell('A2').value = 'Fastrack Course Details';
    sheet.getCell('A2').font = { bold: true, size: 14 };
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    const headers = [
      'S.No', 'Course Code', 'Course Name', 'Course Type', 'Department',
      'Fastrack Instance Name', 'No. of Students', 'Theory Class', 'Lab Class',
      'Status', 'Staff Name'
    ];
    const headerRowIndex = 4;
    sheet.getRow(headerRowIndex).values = headers;
    for (let c = 1; c <= headers.length; c++) {
      const cell = sheet.getCell(headerRowIndex, c);
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
    }

    rows.forEach((row, idx) => {
      const r = headerRowIndex + 1 + idx;
      sheet.getRow(r).values = [
        idx + 1,
        row.course_code,
        row.course_name,
        row.course_type || '--NA--',
        row.dept_shortname || '--NA--',
        row.ft_instance_name || '--NA--',
        row.no_of_students || 0,
        row.classes_conducted ?? '--NA--',
        row.labs_conducted ?? '--NA--',
        row.staff_status || '--NA--',
        row.staff_name || '--NA--'
      ];
      for (let c = 1; c <= headers.length; c++) {
        const cell = sheet.getCell(r, c);
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        };
      }
    });

    const totalRowIndex = headerRowIndex + 1 + rows.length;
    const grandTotal = rows.reduce((sum, r) => sum + (parseInt(r.no_of_students, 10) || 0), 0);
    sheet.getCell(`F${totalRowIndex}`).value = 'Total';
    sheet.getCell(`G${totalRowIndex}`).value = grandTotal;
    sheet.getCell(`F${totalRowIndex}`).font = { bold: true };
    sheet.getCell(`G${totalRowIndex}`).font = { bold: true };
    sheet.getCell(`F${totalRowIndex}`).alignment = { horizontal: 'right' };

    const columns = [
      { width: 8 }, { width: 20 }, { width: 30 }, { width: 20 }, { width: 20 },
      { width: 25 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 25 }
    ];
    sheet.columns = columns;

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=fastrack_courses_insights.xlsx');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getInsights,
  exportInsights,
};