const courseService = require('../../services/exam-section/fastrack_course.service');
const { pool } = require('../../config/db');
const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const multer = require('multer');
const { promisify } = require('util');
const pipeline = promisify(require('stream').pipeline);

const upload = multer({ storage: multer.memoryStorage() });

async function listCourses(req, res, next) {
  try {
    const courses = await courseService.getCourses();
    res.json({ success: true, data: courses });
  } catch (error) {
    next(error);
  }
}

async function getCourse(req, res, next) {
  try {
    const course = await courseService.getCourseById(req.params.id);
    if (!course) {
      const err = new Error('Course not found');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
}

async function getCoursesByAcademicYear(req, res, next) {
  try {
    const { fastrack_instance_id, academic_year } = req.query;
    if (!fastrack_instance_id || !academic_year) {
      return res.json({ success: true, data: [] });
    }
    const courses = await courseService.getCoursesByInstanceAndYear(fastrack_instance_id, academic_year);
    res.json({ success: true, data: courses });
  } catch (error) {
    next(error);
  }
}

async function getLookup(req, res, next) {
  try {
    const data = await courseService.getLookupData();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function createCourse(req, res, next) {
  try {
    const course = await courseService.createCourse(req.body);
    res.status(201).json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
}

async function updateCourse(req, res, next) {
  try {
    const course = await courseService.updateCourse(req.params.id, req.body);
    if (!course) {
      const err = new Error('Course not found');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
}

async function deleteCourse(req, res, next) {
  try {
    const course = await courseService.deleteCourse(req.params.id);
    if (!course) {
      const err = new Error('Course not found');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
}

async function downloadTemplate(req, res, next) {
  try {
    const { rows: departments } = await pool.query(
      `SELECT id, dept_shortname FROM departments ORDER BY dept_shortname ASC`
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Fastrack List');

    sheet.getCell(1, 1).value = 'Sl.No.';
    sheet.getCell(1, 2).value = 'Course Code*';
    sheet.getCell(1, 3).value = 'Course Name*';
    sheet.getCell(1, 4).value = 'department_id*';
    sheet.getCell(1, 5).value = 'USN*';
    sheet.getCell(1, 6).value = 'Student Name*';

    sheet.getCell(3, 1).value = 'Note I:-The first blank row in the list will be considered as end of records and will stop reading any rows after that.';
    sheet.getCell(4, 1).value = 'Note II:-For the column department_id, copy the values from the list below as it is.';

    sheet.getCell(5, 12).value = 'DeptID';
    sheet.getCell(5, 13).value = 'Department Name';

    departments.forEach((dept, idx) => {
      const row = 6 + idx;
      sheet.getCell(row, 12).value = dept.id;
      sheet.getCell(row, 13).value = dept.dept_shortname;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    console.log('Template buffer length:', buffer.length, 'first bytes:', buffer.slice(0, 4).toString('hex'));

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename=fastrack_course_list.xlsx');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(buffer);
  } catch (error) {
    console.error('Download template error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message || 'Failed to generate template' });
    } else {
      res.end();
    }
  }
}

async function uploadExcel(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided. Please select an Excel file.' });
    }

    const ft_instance_id = req.body.fastrack_instance;
    if (!ft_instance_id) {
      return res.status(400).json({ success: false, message: 'Fastrack instance is required. Please select an instance before uploading.' });
    }

    let workbook;
    try {
      workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Invalid Excel file. Please upload a valid .xlsx or .xls file.' });
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({ success: false, message: 'The Excel file does not contain any sheets.' });
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

    if (!rows || rows.length < 3) {
      return res.status(400).json({ success: false, message: 'Invalid Excel file format. The file does not contain enough data.' });
    }

    const headerRow = rows[2];
    if (!Array.isArray(headerRow)) {
      return res.status(400).json({ success: false, message: 'Invalid Excel file format. Header row is missing.' });
    }
    const headerMap = {
      'Department': 'department_id',
      'USN': 'usn',
      'Name': 'name',
      'Course Code*': 'course_code',
      'Course Name': 'course_name',
    };

    const columnMapping = {};
    for (const [excelHeader, field] of Object.entries(headerMap)) {
      const idx = headerRow.findIndex(h => h && String(h).trim() === excelHeader);
      if (idx !== -1) {
        columnMapping[idx] = field;
      }
    }

    let status = 1;
    let message = 'Fastrack course added successfully';

    for (let i = 3; i < rows.length; i++) {
      const course_code = String(rows[i][1] || '').trim();
      if (!course_code) break;

      const course_name = String(rows[i][2] || '').trim();
      const dept_id = String(rows[i][3] || '').trim();

      const { rows: existingRows } = await pool.query(
        `SELECT id FROM fastrack_courses WHERE ft_instance_id = $1 AND course_code = $2 LIMIT 1`,
        [ft_instance_id, course_code]
      );

      if (existingRows.length > 0) {
        await pool.query(
          `UPDATE fastrack_courses SET no_of_students = no_of_students + 1 WHERE id = $1`,
          [existingRows[0].id]
        );
      } else {
        await pool.query(
          `INSERT INTO fastrack_courses (course_code, course_name, department_id, ft_instance_id, no_of_students, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 1, NOW(), NOW())`,
          [course_code, course_name, dept_id || null, ft_instance_id]
        );
      }
    }

    res.json({ success: status === 1, message });
  } catch (error) {
    console.error('Upload Excel error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to upload Excel file. Please try again.' });
  }
}

async function exportCourses(req, res, next) {
  try {
    const { fastrack_instance_id, academic_year } = req.body || {};
    let query = `SELECT fc.id,
                    fc.course_code,
                    fc.course_name,
                    fc.no_of_students,
                    d.dept_shortname,
                    ft.course_type,
                    fi.ft_instance_name,
                    fi.academic_year,
                    COALESCE(fs.classes_conducted, 0) AS classes_conducted,
                    COALESCE(fs.labs_conducted, 0) AS labs_conducted,
                    fs.status AS staff_status
       FROM fastrack_courses fc
       LEFT JOIN departments d ON d.id = fc.department_id
       LEFT JOIN ftcourses ft ON ft.id = fc.ft_course_type_id
       LEFT JOIN fastrack_instances fi ON fi.id = fc.ft_instance_id
       LEFT JOIN LATERAL (
         SELECT fs.classes_conducted, fs.labs_conducted, fs.status
         FROM fastrack_staffs fs
         WHERE fs.course_id = fc.id
         LIMIT 1
       ) fs ON true`;
    const params = [];

    if (fastrack_instance_id && academic_year) {
      query += ` WHERE fi.id = $1 AND fi.academic_year = $2`;
      params.push(fastrack_instance_id, academic_year);
    }

    query += ` ORDER BY fc.id ASC`;

    const { rows } = await pool.query(query, params);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Fastrack-Courses');

    sheet.mergeCells('A1:J1');
    sheet.getCell('A1').value = 'KLS Gogte Instittue of Technology, Belagavi';
    sheet.getCell('A1').font = { bold: true, size: 16 };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:J2');
    const instanceLabel = rows.length > 0 && rows[0].ft_instance_name
      ? `Fastrack ${rows[0].ft_instance_name} Details`
      : 'Fastrack instance name Details';
    sheet.getCell('A2').value = instanceLabel;
    sheet.getCell('A2').font = { bold: true, size: 14 };
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    const yearLabel = academic_year || (rows.length > 0 ? rows[0].academic_year : 'All Years');
    sheet.mergeCells('A3:J3');
    sheet.getCell('A3').value = `Academic Year: ${yearLabel}`;
    sheet.getCell('A3').font = { italic: true, size: 12 };
    sheet.getCell('A3').alignment = { horizontal: 'center' };

    const headerRowIndex = 5;
    const headers = [
      'S.No', 'Course Code', 'Course Name', 'Course Type', 'Department',
      'Fastrack Instance Name', 'No. of Students', 'Theory Class',
      'Lab Class', 'Status'
    ];

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
      const rowIndex = headerRowIndex + 1 + idx;
      const values = [
        idx + 1,
        row.course_code,
        row.course_name,
        row.course_type || '--NA--',
        row.dept_shortname || '--NA--',
        row.ft_instance_name || '--NA--',
        row.no_of_students || 0,
        row.classes_conducted || '--NA--',
        row.labs_conducted || '--NA--',
        row.staff_status || '--NA--'
      ];
      sheet.getRow(rowIndex).values = values;
      for (let c = 1; c <= values.length; c++) {
        const cell = sheet.getCell(rowIndex, c);
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        };
      }
    });

    const totalRowIndex = headerRowIndex + 1 + rows.length;
    sheet.getCell(`F${totalRowIndex}`).value = 'Total';
    sheet.getCell(`G${totalRowIndex}`).value = rows.reduce((sum, r) => sum + (parseInt(r.no_of_students, 10) || 0), 0);
    sheet.getCell(`F${totalRowIndex}`).font = { bold: true };
    sheet.getCell(`G${totalRowIndex}`).font = { bold: true };
    sheet.getCell(`F${totalRowIndex}`).alignment = { horizontal: 'right' };

    const columns = [
      { key: 'sno', width: 8 },
      { key: 'course_code', width: 20 },
      { key: 'course_name', width: 30 },
      { key: 'course_type', width: 20 },
      { key: 'department', width: 20 },
      { key: 'instance', width: 25 },
      { key: 'students', width: 15 },
      { key: 'theory', width: 15 },
      { key: 'lab', width: 15 },
      { key: 'status', width: 15 }
    ];
    sheet.columns = columns;

    const fileNameParts = ['fastrack_courses', academic_year || 'all_years'];
    if (rows.length > 0 && rows[0].ft_instance_name) {
      fileNameParts.push(rows[0].ft_instance_name.replace(/[^a-zA-Z0-9_-]/g, '_'));
    }
    const fileName = `${fileNameParts.join('_')}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    console.log('Export buffer length:', buffer.length, 'first bytes:', buffer.slice(0, 4).toString('hex'));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(buffer);
  } catch (error) {
    console.error('Export courses error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to export courses' });
  }
}

module.exports = {
  listCourses,
  getCourse,
  getCoursesByAcademicYear,
  getLookup,
  createCourse,
  updateCourse,
  deleteCourse,
  downloadTemplate,
  uploadExcel,
  exportCourses,
};
