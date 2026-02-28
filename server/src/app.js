const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const associationRoutes = require('./routes/association.routes');
const designationRoutes = require('./routes/designation.routes');
const institutionRoutes = require('./routes/institution.routes');
const leaveRulesRoutes = require('./routes/leave_rules.routes');
const leaveRoutes = require('./routes/leave.routes');
const combineLeaveRoutes = require('./routes/combine_leave.routes');
const holidayrhRoutes = require('./routes/holidayrh.routes');
const qualificationRoutes = require('./routes/qualification.routes');
const remunerationHeadRoutes = require('./routes/remunerationhead.routes');
const casteCategoryRoutes = require('./routes/castecategory.routes');
const religionRoutes = require('./routes/religion.routes');
const { errorMiddleware } = require('./middlewares/error.middleware');
const { corsOrigin } = require('./config');

const app = express();

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/associations', associationRoutes);
app.use('/api/designations', designationRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/leave-rules', leaveRulesRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/combine-leaves', combineLeaveRoutes);
app.use('/api/holidayrhs', holidayrhRoutes);
app.use('/api/qualifications', qualificationRoutes);
app.use('/api/remunerationheads', remunerationHeadRoutes);
app.use('/api/castecategories', casteCategoryRoutes);
app.use('/api/religions', religionRoutes);
const departmentRoutes = require('./routes/department.routes');
app.use('/api/departments', departmentRoutes);

app.use(errorMiddleware);

module.exports = app;
