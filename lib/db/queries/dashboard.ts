import 'server-only';

import { type AuditLogRowData, getRecentActivity } from './audit';
import { getCitizenQueryStatusCounts, type StatusCounts } from './citizen-queries';
import { getResolutionsList, type ResolutionRowData } from './resolutions';
import { getUpcomingMeetings, type MeetingRowData } from './meetings';

export type DashboardData = {
  upcomingMeeting: MeetingRowData | null;
  pendingQueriesCount: number;
  queryCounts: StatusCounts;
  recentResolution: ResolutionRowData | null;
  recentActivity: AuditLogRowData[];
};

export async function getDashboardData(): Promise<DashboardData> {
  const [upcoming, queryCounts, recentResolutions, recentActivity] = await Promise.all([
    getUpcomingMeetings(1),
    getCitizenQueryStatusCounts(),
    // Most recent resolution regardless of status — the dashboard card renders
    // friendly status text (Filed / Published / Status: draft / …).
    getResolutionsList().then((rows) => rows.slice(0, 1)),
    getRecentActivity(4),
  ]);

  return {
    upcomingMeeting: upcoming[0] ?? null,
    pendingQueriesCount: queryCounts.new + queryCounts.in_progress,
    queryCounts,
    recentResolution: recentResolutions[0] ?? null,
    recentActivity,
  };
}
