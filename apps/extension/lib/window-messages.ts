import type { CapturedError } from '@bug-snipper/shared-types';

/** This is a different channel from background-content-messages.ts's ExtensionMessage
 * that one is browser.runtime.sendMessage between the background worker and a content script
 * This one is window.postMessage, between two scripts injected into the same page but in
 * different JS worlds (i.e. isolated vs main like content script vs host webpage)
 * Content scripts can't share objects/references across so need postMessage
 * postMessage is a shared channel so any script on the page (or an iframe) could be listening
 * or sending on it, so this tags messages as ours to filter out everything else
 */
export interface ErrorsUpdatedWindowMessage {
  source: 'bug-snipper';
  type: 'ERRORS_UPDATED';
  payload: CapturedError[];
}
