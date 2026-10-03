import { browser } from 'wxt/browser';
import type {
  ExtensionMessage,
  SubmitReportResult,
} from '../lib/background-content-messages';
import type {
  CapturedNetworkRequest,
  DomainCheckResponse,
  SubmitReportRequest,
} from '@bug-snipper/shared-types';
import { CAPTURED_NETWORK_REQUESTS_MAX_COUNT } from '@bug-snipper/shared-types';

const BACKEND_URL = 'http://localhost:3000';

/*Tab rolling buffer of recent network request outcomes, chrome.webRequest is only
 * available here in the background worker, not content scripts, so this is the one place
 * that can see the network data
 * Keyed by tabId since multiple tabs are independently being browsed at once,
 * cleared per-tab on navigation (see tabs.onUpdated below) so a report never
 * shows requests from a page the user already left */
const networkRequestsByTab = new Map<number, CapturedNetworkRequest[]>();

function recordNetworkRequest(
  tabId: number,
  request: CapturedNetworkRequest,
): void {
  const existing = networkRequestsByTab.get(tabId) ?? [];
  existing.push(request);
  // Trim from the front (oldest first) once over the cap, only the most recent requests matter
  if (existing.length > CAPTURED_NETWORK_REQUESTS_MAX_COUNT) {
    existing.splice(0, existing.length - CAPTURED_NETWORK_REQUESTS_MAX_COUNT);
  }
  networkRequestsByTab.set(tabId, existing);
}

/** Runs once when the service worker starts up
 * just registers a listener i.e. this function is called after onClicked event
 */
export default defineBackground(() => {
  browser.action.onClicked.addListener((tab) => {
    if (!tab.id || !tab.url) return;

    void handleIconClick(tab.id, tab.url);
  });

  // Content script can't call captureVisibleTab or fetch() on our backend without hitting
  // page-context restrictions, both routed through this one listener instead
  browser.runtime.onMessage.addListener((message: ExtensionMessage, sender) => {
    if (message.type === 'CAPTURE_TAB_REQUEST') {
      // Returns a data URL string back to the caller, encoded as base64 png
      // i.e. data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...
      return browser.tabs.captureVisibleTab({ format: 'png' });
    }

    if (message.type === 'SUBMIT_REPORT') {
      return submitReport(message.payload);
    }

    if (message.type === 'GET_NETWORK_REQUESTS') {
      // sender.tab.id is the tab the content script that sent this message is running in
      const tabId = sender.tab?.id;
      return Promise.resolve(
        tabId !== undefined ? (networkRequestsByTab.get(tabId) ?? []) : [],
      );
    }
  });

  // webRequest only reports outcomes, never lets us read/modify bodies or headers
  // onCompleted gives a status code, onErrorOccurred covers requests that never got a response at all
  // (i.e. DNS failure, CORS block, connection refused, etc.)
  //
  // types filters this to API like traffic only (xmlhttprequest covers both XHR and fetch(),
  // Chrome's webRequest API doesn't have a separate "fetch" resource type and other is
  // for anything not categorized)
  // Excludes image/stylesheet/font/media/script/main_frame/etc. since the rolling buffer only holds CAPTURED_NETWORK_REQUESTS_MAX_COUNT
  // entries, and on an asset-heavy page, not excluding would crowd the network requests and hide or bump out the actual
  // failed API call that could be a bug or error
  browser.webRequest.onCompleted.addListener(
    (details) => {
      if (details.tabId < 0) return; // -1 means not associated with a tab like extension's own requests
      recordNetworkRequest(details.tabId, {
        url: details.url,
        method: details.method,
        statusCode: details.statusCode,
        timestamp: new Date().toISOString(),
      });
    },
    { urls: ['<all_urls>'], types: ['xmlhttprequest', 'other'] },
  );

  browser.webRequest.onErrorOccurred.addListener(
    (details) => {
      if (details.tabId < 0) return;
      recordNetworkRequest(details.tabId, {
        url: details.url,
        method: details.method,
        statusCode: null,
        timestamp: new Date().toISOString(),
      });
    },
    { urls: ['<all_urls>'], types: ['xmlhttprequest', 'other'] },
  );

  // Clears a tab's buffer as soon as it starts navigating to a new page
  // without this, a report submitted on a fresh page could still show requests from whatever the tab was showing before,
  // since the Map is keyed only by tabId, which a navigation doesn't change
  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
      networkRequestsByTab.delete(tabId);
    }
  });
});

// Runs everytime extension icon clicked, even before the overlay
// tab.url is only populated here because activeTab gives it on this user action
async function handleIconClick(tabId: number, tabUrl: string): Promise<void> {
  const { hostname, pathname } = new URL(tabUrl);
  const allowed = await checkDomainAllowed(hostname, pathname);

  if (!allowed) {
    const message: ExtensionMessage = { type: 'DOMAIN_NOT_ALLOWED' };
    void browser.tabs.sendMessage(tabId, message);
    return;
  }

  const message: ExtensionMessage = { type: 'ACTIVATE_CAPTURE' };
  void browser.tabs.sendMessage(tabId, message);
}

// Checking if the tab domain the extension is being called on is domain listed
// Any failure like network issues or the backend being down is treated as not allowed
// This check is a UX gate to keep the overlay off unregistered sites
// The backend still derives and valides the workspace itself on actual submission
async function checkDomainAllowed(
  hostname: string,
  path: string,
): Promise<boolean> {
  const cacheKey = `${hostname}:${path}`;
  const cached = await getCachedDomainCheck(cacheKey);
  // If we have something cached, means current site has already been called and is allowed,
  // so don't need to make subsequent calls on subsequent uses of the extension
  if (cached !== undefined) return cached;

  // Else check to see if the current tab site is domain listed
  // Set the result of it is or isn't so even for domains not allowed,
  // don't have to call the backend again, can just replay the toast
  try {
    const url = new URL(`${BACKEND_URL}/api/public/domains/check`);
    url.searchParams.set('hostname', hostname);
    url.searchParams.set('path', path);

    const response = await fetch(url);
    if (!response.ok) return false;

    const body = (await response.json()) as DomainCheckResponse;
    await setCachedDomainCheck(cacheKey, body.allowed);

    return body.allowed;
  } catch {
    return false;
  }
}

// browser.storage.session is storage in memory scoped to the browser session and cleared on browser close,
// It's not written to disk, but persists even on service worker termination
// MV3 workers die after about 30 seconds of inactivity and spin up a new one on the next call
// which wipes the normal const cache = new Map()
// Since is copies standard async design, can use methods like set, get and remove for the storage data
// NOTE: Also storage.session is global to the extension, so other parts like content scripts can access it with permission
async function getCachedDomainCheck(
  cacheKey: string,
): Promise<boolean | undefined> {
  const stored = await browser.storage.session.get(cacheKey);
  return stored[cacheKey] as boolean | undefined;
}

async function setCachedDomainCheck(
  cacheKey: string,
  allowed: boolean,
): Promise<void> {
  await browser.storage.session.set({ [cacheKey]: allowed });
}

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
