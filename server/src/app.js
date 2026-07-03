const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const associationRoutes = require('./routes/association.routes');
const designationRoutes = require('./routes/designation.routes');
const institutionRoutes = require('./routes/institution.routes');
const leaveRulesRoutes = require('./routes/leave_rules.routes');
      const leaveRoutes = require('./routes/leave.routes');
const leaveEntitlementRoutes = require('./routes/leave_entitlement.routes');
const combineLeaveRoutes = require('./routes/combine_leave.routes');
const holidayrhRoutes = require('./routes/holidayrh.routes');
const qualificationRoutes = require('./routes/qualification.routes');
const staffQualificationRoutes = require('./routes/staffQualification.routes');
const coordinatorRoutes = require('./routes/coordinator.routes');
// Remuneration Head routes removed
const casteCategoryRoutes = require('./routes/castecategory.routes');
const religionRoutes = require('./routes/religion.routes');
const { errorMiddleware } = require('./middlewares/error.middleware');
const { corsOrigins, nodeEnv } = require('./config');

const app = express();

const privateNetworkOriginPattern = /^https?:\/\/(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/i;

const corsOptions = {
	origin: (origin, callback) => {
		if (!origin) {
			callback(null, true);
			return;
		}

		if (corsOrigins.includes(origin)) {
			callback(null, true);
			return;
		}

		if (nodeEnv !== 'production' && privateNetworkOriginPattern.test(origin)) {
			callback(null, true);
			return;
		}

		callback(new Error(`CORS blocked for origin: ${origin}`));
	}
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/associations', associationRoutes);
app.use('/api/designations', designationRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/leave-rules', leaveRulesRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/leave-entitlements', leaveEntitlementRoutes);

app.use('/api/combine-leaves', combineLeaveRoutes);
app.use('/api/holidayrhs', holidayrhRoutes);
app.use('/api/qualifications', qualificationRoutes);
app.use('/api/staff-qualifications', staffQualificationRoutes);
app.use('/api/coordinators', coordinatorRoutes);
// Remuneration Head API route removed
app.use('/api/castecategories', casteCategoryRoutes);
app.use('/api/religions', religionRoutes);
const departmentRoutes = require('./routes/department.routes');
app.use('/api/departments', departmentRoutes);
const staffRoutes = require('./routes/staff.routes');
app.use('/api/staff', staffRoutes);
const hodRoutes = require('./routes/hod.routes');
app.use('/api/hod', hodRoutes);
const deanRoutes = require('./routes/dean.routes');
app.use('/api/dean', deanRoutes);
const principalRoutes = require('./routes/principal.routes');
app.use('/api/principal', principalRoutes);
const jobsRoutes = require('./routes/jobs.routes');
app.use('/api/jobs', jobsRoutes);

// Biometric routes (daily/monthly)
const biometricRoutes = require('./routes/biometric.routes');
app.use('/api/biometric', biometricRoutes);

const leaveCalendarRoutes = require('./routes/leave_calendar.routes');
app.use('/api/leave-calendar', leaveCalendarRoutes);

const notificationsRoutes = require('./routes/notifications.routes');
app.use('/api/notifications', notificationsRoutes);

const superAdminLeaveRoutes = require('./routes/superAdminLeave.routes');
app.use('/api/super-admin-leaves', superAdminLeaveRoutes);

const ticketRoutes = require('./routes/tickets.routes');
app.use('/api/tickets', ticketRoutes);

const examSectionRoutes = require('./routes/exam-section.routes');
app.use('/api/exam-section', examSectionRoutes);

app.use(errorMiddleware);

module.exports = app;
