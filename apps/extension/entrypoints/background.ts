import { browser } from 'wxt/browser';
import type {
  ExtensionMessage,
  SubmitReportResult,
} from '../lib/background-content-messages';
import type { SubmitReportRequest } from '@bug-snipper/shared-types';

const BACKEND_URL = 'http://localhost:3000';

/** Runs once when the service worker starts up
 * just registers a listener i.e. this function is called after onClicked event
 */
export default defineBackground(() => {
  browser.action.onClicked.addListener((tab) => {
    if (!tab.id) return;

    const message: ExtensionMessage = { type: 'ACTIVATE_CAPTURE' };
    // sendMessage sends specified message to the content script in the current tab
    // tab ID to know context of what tab we on, only gets sent to content scripts and whatever on same tab ID
    void browser.tabs.sendMessage(tab.id, message);
  });

  // Content script can't call captureVisibleTab or fetch() on our backend without hitting
  // page-context restrictions — both routed through this one listener instead
  browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
    if (message.type === 'CAPTURE_TAB_REQUEST') {
      // Returns a data URL string back to the caller, encoded as base64 png
      // i.e. data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...
      return browser.tabs.captureVisibleTab({ format: 'png' });
    }

    if (message.type === 'SUBMIT_REPORT') {
      return submitReport(message.payload);
    }
  });
});

async function submitReport(
  payload: SubmitReportRequest,
): Promise<SubmitReportResult> {
  const response = await fetch(`${BACKEND_URL}/api/public/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // Unknown so body can't be acted on like 'any' typing can
  const body: unknown = await response.json();
  return { ok: response.ok, status: response.status, body };
}
