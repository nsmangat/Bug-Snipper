import type {
  BrowserInfo,
  Coordinates,
  DomSnapshot,
  Report,
  ReportStatus,
  Viewport,
} from './report.js';
import type { AllowlistedDomain, Organization, Workspace } from './organization.js';

/** What the extension POSTs. Excludes id/workspaceId/domain/screenshotPath/status/timestamps since
those are all derived or assigned server-side, never trusted from the client **/
export interface SubmitReportRequest {
  pageUrl: string;
  screenshotBase64: string;
  domSnapshot: DomSnapshot;
  coordinates: Coordinates;
  viewport: Viewport;
  browserInfo: BrowserInfo;
  note: string;
}

export interface DomainCheckQuery {
  hostname: string;
  path: string;
}

export interface DomainCheckResponse {
  allowed: boolean;
  workspaceId?: string;
  matchedPrefix?: string | null;
}

export interface ReportListResponse {
  reports: Report[];
}

export interface WorkspaceListResponse {
  workspaces: Workspace[];
}

export interface OrganizationListResponse {
  organizations: Organization[];
}

export interface DomainListResponse {
  domains: AllowlistedDomain[];
}

/** screenshotUrl is a freshly generated, short lived signed URL and the actual browser loadable
 * link, derived from report.screenshotPath, which is just the private
 * bucket's internal object key and isn't loadable directly
 * Making this a separate interface from report since only need the signed URL when actually viewing
 * a report's complete details, not when doing stuff like seeing list of reports,
 * so makes more sense to have this separate interface and use it on these report viewings
 **/
export interface ReportDetailResponse {
  report: Report;
  screenshotUrl: string;
}

export interface UpdateReportStatusRequest {
  status: ReportStatus;
}

export interface CreateOrganizationRequest {
  name: string;
}

export interface CreateWorkspaceRequest {
  organizationId: string;
  name: string;
}

export interface CreateDomainRequest {
  workspaceId: string;
  hostname: string;
  pathPrefix?: string | null;
}
