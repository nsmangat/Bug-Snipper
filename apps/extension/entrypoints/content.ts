import { browser } from 'wxt/browser';
import type { ExtensionMessage } from '../lib/background-content-messages';

export default defineContentScript({
  // Broad match for now, change after domain allowlist gating
  matches: ['*://*/*'],
  main() {
    browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
      if (message.type === 'ACTIVATE_CAPTURE') {
        showActivationMarker();
      }
    });
  },
});

/** Test to show the message pipeline works by popping up the message on extension click
 * Will get replaced by the drag-select overlay later*/
function showActivationMarker(): void {
  console.log('Bug Snipper content script received ACTIVATE_CAPTURE');

  const marker = document.createElement('div');
  marker.textContent = 'Bug Snipper activated (Milestone 5 step 1 placeholder)';
  marker.style.cssText = `
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 2147483647;
    background: #0969e8;
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font: 14px system-ui, sans-serif;
  `;
  document.body.appendChild(marker);

  setTimeout(() => marker.remove(), 2000);
}
