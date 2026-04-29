import 'server-only';

import { env } from '@/env';

import { mockGetDashboardData } from './_mock-data';
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
  if (env.MOCK_DATA) return mockGetDashboardData();

  const [upcoming, queryCounts, recentResolutions, recentActivity] = await Promise.all([
    getUpcomingMeetings(1),
    getCitizenQueryStatusCounts(),
    getResolutionsList({ status: 'approved' }).then((rows) => rows.slice(0, 1)),
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
