import type { Report, ReportListResponse } from '@bug-snipper/shared-types';

const BACKEND_URL = 'http://localhost:3000';

export async function getReports(workspaceId: string): Promise<Report[]> {
  const url = new URL(`${BACKEND_URL}/api/reports`);
  // Getting/filtering the reports under this specific workspace
  url.searchParams.set('workspaceId', workspaceId);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error getting reports: (${response.status})`);
  }

  const body = (await response.json()) as ReportListResponse;
  return body.reports;
}
