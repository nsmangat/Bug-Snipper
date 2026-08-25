import type { Report, ReportListResponse } from '@bug-snipper/shared-types';

const BACKEND_URL = 'http://localhost:3000';

export async function getReports(): Promise<Report[]> {
  const response = await fetch(`${BACKEND_URL}/api/reports`);
  if (!response.ok) {
    throw new Error(`Failed to get reports: (${response.status})`);
  }

  const body = (await response.json()) as ReportListResponse;
  return body.reports;
}
