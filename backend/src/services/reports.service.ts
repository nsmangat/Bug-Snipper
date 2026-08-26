import { randomUUID } from 'node:crypto';
import type {
  BrowserInfo,
  Coordinates,
  DomSnapshot,
  Report,
  ReportStatus,
  SubmitReportRequest,
  Viewport,
} from '@bug-snipper/shared-types';
import { SCREENSHOT_BUCKET, supabase } from '../config/supabase.js';
import { matchDomain } from './domains.service.js';

export class DomainNotAllowedError extends Error {
  constructor() {
    super('This page is not registered to any workspace.');
    this.name = 'DomainNotAllowedError';
  }
}

export class ReportNotFoundError extends Error {
  constructor() {
    super('Report not found.');
    this.name = 'ReportNotFoundError';
  }
}

// Signed URL exists for 10 minutes, regenerated fresh every time the detail endpoint is hit, never cached
// or persisted, so issues like a leaked link should stop working quickly
const SCREENSHOT_SIGNED_URL_TTL_SECONDS = 600;

interface ReportRow {
  id: string;
  workspace_id: string;
  page_url: string;
  domain: string;
  screenshot_path: string;
  dom_snapshot: DomSnapshot;
  coordinates: Coordinates;
  viewport: Viewport;
  browser_info: BrowserInfo;
  note: string | null;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
}

// Used to translate to proper camelCase when returning the report
function mapReportRow(row: ReportRow): Report {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    pageUrl: row.page_url,
    domain: row.domain,
    screenshotPath: row.screenshot_path,
    domSnapshot: row.dom_snapshot,
    coordinates: row.coordinates,
    viewport: row.viewport,
    browserInfo: row.browser_info,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Strip the optional data URL prefix 'data:image/png;base64' gotten from canvas.toDataURL()
function decodeScreenshot(base64: string): Buffer {
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

export async function submitReport(
  submittedReport: SubmitReportRequest,
): Promise<Report> {
  // Parsing the given pageUrl to get mainly an object with the hostname and pathname accessors
  const pageUrl = new URL(submittedReport.pageUrl);

  // We derive the domain from the given URL, not the client
  // If it doesn't exist, then won't allow further access/execution stops here
  const match = await matchDomain(pageUrl.hostname, pageUrl.pathname);
  if (!match) {
    throw new DomainNotAllowedError();
  }

  // Every screenshot will be under the same workspace folder in the bucket
  const screenshotPath = `${match.workspaceId}/${randomUUID()}.png`;

  // Uploading the screenshot to Supabase storage
  const { error: uploadError } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .upload(
      screenshotPath,
      decodeScreenshot(submittedReport.screenshotBase64),
      {
        contentType: 'image/png',
      },
    );

  if (uploadError) throw uploadError;

  // Uploading report data
  /** Everything from submitted report payload except workspace_id and domain (and screenshot_path generated above)
   * The other two are serverside from the above where we confirm server side if the domain exists
   */
  const { data, error } = await supabase
    .from('reports')
    .insert({
      workspace_id: match.workspaceId,
      page_url: submittedReport.pageUrl,
      domain: pageUrl.hostname,
      screenshot_path: screenshotPath,
      dom_snapshot: submittedReport.domSnapshot,
      coordinates: submittedReport.coordinates,
      viewport: submittedReport.viewport,
      browser_info: submittedReport.browserInfo,
      note: submittedReport.note ?? null,
    })
    .select()
    .single(); // Get the row back as an object
  if (error) throw error;

  // Translate to the public shape and return it
  // Can't just return data as Report since at runtime, data would still be the db version i.e. workspace_id:... ect
  // instead of workspaceId:...
  // Casting to ReportRow here so that we can give the correct type to data instead of 'any' type
  return mapReportRow(data as ReportRow);
}

// This is for the dashboard when the user wants to see the list of reports and sort by filters like workspace or status
export interface ListReportsFilters {
  // Both filters are optional, hence the null coalescing operator
  workspaceId?: string;
  status?: ReportStatus;
}

export async function listReports(
  filters: ListReportsFilters,
): Promise<Report[]> {
  let query = supabase
    .from('reports')
    .select()
    .order('created_at', { ascending: false });

  // Utilizing query builder pattern to adjust query based on if any filters are used
  // Showing reports for 1 workspace at a time
  if (filters.workspaceId) {
    query = query.eq('workspace_id', filters.workspaceId);
  }

  // Showing reports by status i.e. only 'open' reports
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data as ReportRow[]).map(mapReportRow);
}

export interface ReportDetail {
  report: Report;
  screenshotUrl: string;
}

export async function getReportById(id: string): Promise<ReportDetail> {
  // maybeSingle (vs single) returns data: null on zero matches instead of throwing,
  // so should be able to tell between a'not found' report and a real DB error
  const { data, error } = await supabase
    .from('reports')
    .select()
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ReportNotFoundError();

  const report = mapReportRow(data as ReportRow);

  // Creating signed URL to access and retrieve from private bucket where report images are held
  // Destructuring like this means we get the 'data' object from the db call, then save it into the variable after the :
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .createSignedUrl(report.screenshotPath, SCREENSHOT_SIGNED_URL_TTL_SECONDS);

  if (signedUrlError) throw signedUrlError;

  return { report, screenshotUrl: signedUrlData.signedUrl };
}
