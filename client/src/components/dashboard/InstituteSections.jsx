import { useMemo } from 'react';
import {
  ChartCanvas,
  ColumnHeading,
  Muted,
  Panel,
  PeopleList,
  StatTile,
  designationConfig,
  doughnutConfig,
  formatDate,
  staffByDepartmentConfig,
} from './DashboardUI';

// Institute-wide sections shared by the Establishment and Super Admin dashboards.
// `summary` is the /establishment/dashboard payload (Super Admin's payload extends it);
// `links` points each section at the current portal's pages (missing keys hide the link).

export function TodayTiles({ summary, loading, links }) {
  const staff = summary?.staff;
  const att = summary?.attendance;
  const leave = summary?.leave;
  const show = (v) => (loading ? '…' : summary ? (v ?? 0) : '--');

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        label="Staff in Service"
        value={show(staff?.total)}
        sub={staff ? `${staff.teaching} teaching · ${staff.non_teaching} non-teaching` : null}
        tone="blue"
        to={links.staff}
      />
      <StatTile
        label="Present Today"
        value={att?.available === false ? '--' : show(att?.present)}
        sub={att?.available ? `of ${att.expected} expected on biometric` : null}
        tone="green"
        to={links.biometric}
      />
      <StatTile
        label="On Leave Today"
        value={show(leave?.on_leave_today)}
        sub={leave ? `${leave.starting_next_7_days} more starting in 7 days` : null}
        tone="yellow"
        to={links.leaveList}
      />
      <StatTile
        label="Punch Missing Today"
        value={att?.available === false || att?.off_day ? '--' : show(att?.missing)}
        sub={att?.off_day ? `${att.off_day} – not counted` : 'no punch and no leave'}
        tone={att?.missing ? 'red' : 'green'}
        to={links.biometric}
      />
    </div>
  );
}

export function ServiceCalendarPanel({ summary, loading, links }) {
  const events = summary?.service_events;
  return (
    <Panel title="Service Calendar" link={links.staff} linkLabel="staff">
      {loading ? <Muted>Loading…</Muted> : !events ? <Muted>Data could not be loaded.</Muted> : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="min-w-0">
            <ColumnHeading title="Retiring in 12 Months" count={events.retirements_12_months.length} sub="by superannuation date" tone="purple" />
            <PeopleList rows={events.retirements_12_months} emptyText="No retirements in the next 12 months." />
          </div>
          <div className="min-w-0">
            <ColumnHeading
              title="Increments This Month"
              count={events.increments_this_month.length}
              sub={`${events.increments_next_month} due next month`}
              tone="green"
            />
            <PeopleList rows={events.increments_this_month} emptyText="No increments due this month." />
          </div>
          <div className="min-w-0">
            <ColumnHeading title={`Joined in ${summary.year}`} count={events.joiners_this_year.length} sub="by date of joining" tone="blue" />
            <PeopleList rows={events.joiners_this_year} emptyText="No new joiners this year." />
          </div>
        </div>
      )}
    </Panel>
  );
}

export function LeavePipelinePanel({ summary, loading, links }) {
  const leave = summary?.leave;
  const backlog = (leave?.pending_past || 0) + (leave?.recommended_past || 0);
  return (
    <Panel title="Leave Pipeline" link={links.leaveList} linkLabel="leave list">
      {loading ? <Muted>Loading…</Muted> : !leave ? <Muted>Data could not be loaded.</Muted> : (
        <>
          <div className="grid grid-cols-1 gap-3">
            <StatTile label="Waiting for HOD" value={leave.pending_current} sub="pending, leave not yet over" tone={leave.pending_current ? 'yellow' : 'green'} />
            <StatTile label="Waiting for Dean / Principal" value={leave.recommended_current} sub="recommended, leave not yet over" tone={leave.recommended_current ? 'yellow' : 'green'} />
            <StatTile label="Approved Leave Days" value={leave.approved_days_this_month} sub="starting this month" tone="blue" />
          </div>
          {backlog ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span className="font-semibold">{backlog} applications</span> for leave already over were never decided
              ({leave.pending_past} at HOD, {leave.recommended_past} at Dean / Principal).
            </div>
          ) : null}
        </>
      )}
    </Panel>
  );
}

export function HolidaysPanel({ summary, loading, links }) {
  const holidays = summary?.holidays || [];
  return (
    <Panel title="Upcoming Holidays" link={links.holidays}>
      {loading ? <Muted>Loading…</Muted> : holidays.length === 0 ? <Muted>No upcoming holidays listed.</Muted> : (
        <ul className="divide-y divide-slate-100">
          {holidays.map((h) => (
            <li key={`${h.title}-${h.date}`} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="break-words font-medium text-slate-800">{h.title}</p>
                <p className="text-xs text-slate-500">{formatDate(h.date)}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${String(h.type).toLowerCase() === 'holiday' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                {h.type}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// Staff by department / association / designation / gender. `extra` fills the last cell of the
// second row (e.g. Quick Access); without it the gender chart takes that space.
export function StaffCompositionCharts({ summary, loading, links, extra = null }) {
  const staff = summary?.staff;
  const deptChart = useMemo(() => staffByDepartmentConfig(staff?.by_department || []), [staff]);
  const associationChart = useMemo(() => doughnutConfig(staff?.by_association || []), [staff]);
  const genderChart = useMemo(() => doughnutConfig(staff?.by_gender || []), [staff]);
  const designationChart = useMemo(() => designationConfig(staff?.teaching_by_designation || []), [staff]);

  return (
    <>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Panel title="Staff by Department" link={links.departments} linkLabel="departments">
            {loading ? <Muted>Loading…</Muted> : deptChart ? <ChartCanvas config={deptChart} height="h-80" /> : <Muted>No staff found.</Muted>}
          </Panel>
        </div>
        <Panel title="Staff by Association" link={links.associations} linkLabel="associations">
          {loading ? <Muted>Loading…</Muted> : associationChart ? <ChartCanvas config={associationChart} height="h-80" /> : <Muted>No staff found.</Muted>}
        </Panel>
      </div>

      <div className={`grid grid-cols-1 gap-6 ${extra ? 'xl:grid-cols-3' : 'xl:grid-cols-2'}`}>
        <Panel title="Teaching Staff by Designation" link={links.designations} linkLabel="designations">
          {loading ? <Muted>Loading…</Muted> : designationChart ? <ChartCanvas config={designationChart} /> : <Muted>No teaching staff found.</Muted>}
        </Panel>
        <Panel title="Staff by Gender">
          {loading ? <Muted>Loading…</Muted> : genderChart ? <ChartCanvas config={genderChart} /> : <Muted>No staff found.</Muted>}
        </Panel>
        {extra}
      </div>
    </>
  );
}
