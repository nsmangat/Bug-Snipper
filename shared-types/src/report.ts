export type ReportStatus = 'open' | 'in_progress' | 'resolved' | 'wontfix';

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
}

// Capturing the selected region's outerHTML and styles
export interface DomSnapshot {
  html: string;
  styles: Record<string, Record<string, string>>;
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
  note: string | null;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
}
