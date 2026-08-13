import { browser } from 'wxt/browser';
import type { SubmitReportRequest } from '@bug-snipper/shared-types';

const BACKEND_URL = 'http://localhost:3000';

/** Runs once when the service worker starts up
 * just registers a listener i.e. this function is called after onClicked event
 */
export default defineBackground(() => {
  browser.action.onClicked.addListener(() => {
    // handleCapture returns a promise<void> but this listener isn't async because
    // it doesn't return anything meaningful to extension api, no need to wait
    // for whatever's returned
    // Usually bad to leave a floating or errand promise, so use void here as ts best practice
    // to say a promise is returned but we don't need to wait for it
    void handleCapture();
  });
});

/** Running everytime the listener fires,
 * which is everytime the extension is clicked
 */
async function handleCapture(): Promise<void> {
  // Get SS
  const screenshotBase64 = await browser.tabs.captureVisibleTab({
    format: 'png',
  });

  // Build report object to submit
  // Placeholder data for now to prove image + metadata -> backend -> Supabase Storage/Postgres works end to end
  const payload: SubmitReportRequest = {
    pageUrl: 'http://localhost/test-page',
    screenshotBase64,
    domSnapshot: {
      html: '<div>placeholder</div>',
      styles: {},
    },
    coordinates: {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      viewportWidth: 1280,
      viewportHeight: 800,
      scrollX: 0,
      scrollY: 0,
    },
    viewport: { width: 1280, height: 800, devicePixelRatio: 1 },
    browserInfo: {
      userAgent: navigator.userAgent,
      browserName: 'chrome',
      browserVersion: 'unknown',
      os: 'unknown',
    },
    note: 'Test report - hardcoded metadata, real screenshot',
  };

  // Calling the report endpoint to write report with ss to db
  const response = await fetch(`${BACKEND_URL}/api/public/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // Using 'unknown' instead of 'any' since any disables type-checking, while unknown is type-safe alternative
  // i.e. you could call random methods like toUppercase on any, but can't do the same to unknown types
  const result: unknown = await response.json();
  console.log('Report submitted:', response.status, result);
}
