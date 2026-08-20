import { browser } from 'wxt/browser';
import type { ExtensionMessage } from '../lib/background-content-messages';

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

  // CaptureVisibleTab - captures the visible viewport
  // Content script can't call captureVisibleTab itself, only the background worker can
  // Returning a promise from this listener is what sends an async response back to
  // whoever called browser.runtime.sendMessage(...).
  browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
    if (message.type === 'CAPTURE_TAB_REQUEST') {
      // Returns a data URL string back to the caller, encoded as base64 png
      // i.e. data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...
      return browser.tabs.captureVisibleTab({ format: 'png' });
    }
  });
});
