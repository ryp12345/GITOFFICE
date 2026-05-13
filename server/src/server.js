const app = require('./app');
const { port } = require('./config');

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  // start job scheduler (mirrors Laravel scheduled jobs)
  try {
    require('./jobs/scheduler');
  } catch (err) {
    console.warn('Failed to start scheduler:', err && err.message ? err.message : err);
  }
});
