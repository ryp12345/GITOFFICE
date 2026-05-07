#!/usr/bin/env node
const path = require('path');
const jobs = require('./ScheduledJobs');

const argv = process.argv.slice(2);
const cmd = argv[0];

function printHelp() {
  console.log('Usage: node runScheduledJobs.js <jobName>');
  console.log('Available jobs:');
  Object.keys(jobs).forEach((k) => console.log(' -', k));
}

if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
  printHelp();
  process.exit(0);
}

const jobName = cmd;
const jobFn = jobs[jobName];

if (typeof jobFn !== 'function') {
  console.error(`Unknown job: ${jobName}`);
  printHelp();
  process.exit(2);
}

(async () => {
  try {
    console.log(`Running job: ${jobName}`);
    await jobFn({ argv });
    console.log('Job finished successfully');
    process.exit(0);
  } catch (err) {
    console.error('Job failed:', err);
    process.exit(1);
  }
})();
