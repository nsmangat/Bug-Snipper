import type { SubmitReportRequest } from '@bug-snipper/shared-types';

/** Purpose of this interface is to have like a typed contract between background worker
 * and content script i.e. they both know what to expect in the messages they send/receive between the 2
 * Type is a discriminant to act as a string tag identifying which message variant this is
 * More message variants to be added for things like capturing, cropping and submitting reports
 */
export interface ActivateCaptureMessage {
  type: 'ACTIVATE_CAPTURE';
}

/** Background -> content to say the clicked tab's hostname+path failed the domain-allowlist check, so
 * no capture overlay was activated
 * Content script shows a toast saying the current site isn't registered
 */
export interface DomainNotAllowedMessage {
  type: 'DOMAIN_NOT_ALLOWED';
}

/** Content script -> background to say that the user finished dragging a selection, now capture
 * the tab
 * Background responds with the full-viewport screenshot as a PNG data URL
 * Cropping to the selected region happens in the content script (it has canvas/DOM access,
 * the background service worker doesn't).
 */
export interface CaptureTabRequestMessage {
  type: 'CAPTURE_TAB_REQUEST';
}

/** Content script -> background: the user filled out the form and hit Submit. The content
 * script's own fetch() would run into CORS issues the same way any other webpage's
 * script would, so routing the actual POST through the background worker solves that,
 * same reasoning as CAPTURE_TAB_REQUEST above.
 */
export interface SubmitReportMessage {
  type: 'SUBMIT_REPORT';
  payload: SubmitReportRequest;
}

export interface SubmitReportResult {
  ok: boolean;
  status: number;
  body: unknown;
}

export type ExtensionMessage =
  | ActivateCaptureMessage
  | CaptureTabRequestMessage
  | SubmitReportMessage
  | DomainNotAllowedMessage;
