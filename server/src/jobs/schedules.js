// Job schedule definitions, mirroring Laravel app/Console/Kernel.php.
// Kept free of side effects so the API can list them without starting cron timers.
const TZ = 'Asia/Kolkata';

const SCHEDULES = [
  // ->yearlyOn(12, 26, '00:00')
  { job: 'yearly_leave_entitlements', cron: '0 0 26 12 *', description: 'Yearly leave entitlements for next year (26 Dec, 00:00)' },
  // ->yearlyOn(01, 01, '00:00')
  { job: 'inactivate_previous_year', cron: '0 0 1 1 *', description: 'Inactivate previous year entitlements (1 Jan, 00:00)' },
  // ->monthlyOn(01, '00:00')
  { job: 'monthly_leave_entitlements', cron: '0 0 1 * *', description: 'Monthly CL for contractual / probationary / temporary staff (1st, 00:00)' },
  // ->daily('00:00')
  { job: 'daily_Non_Vacational_EL', cron: '0 0 * * *', description: 'Non-vacational EL on designation anniversary (daily, 00:00)' },
  // ->yearlyOn(06, 27, '00:00')
  { job: 'halfyearlyEL', cron: '0 0 27 6 *', description: 'Second half vacational EL (27 Jun, 00:00)' },
  // ->dailyAt('10:54')
  // { job: 'sendMissingPunchesEmail', cron: '54 10 * * *', description: 'Missing biometric punch emails (daily, 10:54)' },
];

module.exports = { SCHEDULES, TZ };
