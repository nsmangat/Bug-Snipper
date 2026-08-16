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
});
