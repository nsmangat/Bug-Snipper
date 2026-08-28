import type {
  Report,
  ReportDetailResponse,
  ReportListResponse,
  ReportStatus,
} from '@bug-snipper/shared-types';

const BACKEND_URL = 'http://localhost:3000';

export async function getReports(
  workspaceId: string,
  status?: ReportStatus,
): Promise<Report[]> {
  const url = new URL(`${BACKEND_URL}/api/reports`);
  // Getting/filtering the reports under this specific workspace
  url.searchParams.set('workspaceId', workspaceId);

  // Status filtering
  if (status) {
    url.searchParams.set('status', status);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error getting reports: (${response.status})`);
  }

  const body = (await response.json()) as ReportListResponse;
  return body.reports;
}

export async function getReportDetail(
  id: string,
): Promise<ReportDetailResponse> {
  const response = await fetch(`${BACKEND_URL}/api/reports/${id}`);
  if (!response.ok) {
    throw new Error(`Error getting report: (${response.status})`);
  }

  return (await response.json()) as ReportDetailResponse;
}
