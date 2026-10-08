const app = require('./app');
const { port } = require('./config');

// A stray rejected promise should be logged, not take the API down for every user.
process.on('unhandledRejection', (reason) => {
  console.error('[process] unhandled rejection:', reason && reason.stack ? reason.stack : reason);
});

// After an uncaught exception the process state is unreliable: log it and exit so the supervisor restarts cleanly.
process.on('uncaughtException', (err) => {
  console.error('[process] uncaught exception:', err && err.stack ? err.stack : err);
  process.exit(1);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  // start job scheduler (mirrors Laravel scheduled jobs)
  try {
    require('./jobs/scheduler');
  } catch (err) {
    console.warn('Failed to start scheduler:', err && err.message ? err.message : err);
  }
});
