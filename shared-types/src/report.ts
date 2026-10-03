export type ReportStatus = 'open' | 'in_progress' | 'resolved' | 'abandoned';

// Shared by the extension's textarea i.e. maxlength and validation, the backend's zod schema, and the
// CHECK constraint in the db
export const REPORT_NOTE_MAX_LENGTH = 200;

// Shared by the extension's capture buffers and the backend's zod schema (array max
// length), keeps the client never having to buffer more than the server would accept
export const CAPTURED_ERRORS_MAX_COUNT = 20;
export const CAPTURED_NETWORK_REQUESTS_MAX_COUNT = 30;

// Screenshot coordinates
export interface Coordinates {
  x: number;
  y: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  scrollX: number;
  scrollY: number;
}

export interface Viewport {
  width: number;
  height: number;
  devicePixelRatio: number;
}

export interface BrowserInfo {
  userAgent: string;
  browserName: string;
  browserVersion: string;
  os: string;
  // navigator.language, could be useful for the class of bugs that are
  // locale specific like date formatting, currency, RTL layout, ect.
  language: string;
}

// Capturing the selected region's outerHTML and styles
export interface DomSnapshot {
  html: string;
  styles: Record<string, Record<string, string>>;
}

// A JS error or unhandled promise rejection captured on the page around the time of the report
// Don't want to do full console log since that has extra info not required for the bug report  this is the specific "what broke" signal a
// and avoids encroaching users' privacy
export interface CapturedError {
  type: 'error' | 'unhandledrejection';
  message: string;
  stack: string | null;
  timestamp: string;
}

// A recent network request's outcome i.e. the method, url, status code, and time only, NOT
// request/response bodies or headers, so stuff like auth tokens or user data isn't leaked
export interface CapturedNetworkRequest {
  url: string;
  method: string;
  statusCode: number | null;
  timestamp: string;
}

export interface Report {
  id: string;
  workspaceId: string;
  pageUrl: string;
  domain: string;
  screenshotPath: string;
  domSnapshot: DomSnapshot;
  coordinates: Coordinates;
  viewport: Viewport;
  browserInfo: BrowserInfo;
  note: string;
  documentTitle: string;
  referrer: string;
  errors: CapturedError[];
  networkRequests: CapturedNetworkRequest[];
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
}
