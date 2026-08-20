/** Purpose of this interface is to have like a typed contract between background worker
 * and content script i.e. they both know what to expect in the messages they send/receive between the 2
 * Type is a discriminant to act as a string tag identifying which message variant this is
 * More message variants to be added for things like capturing, cropping and submitting reports
 */
export interface ActivateCaptureMessage {
  type: 'ACTIVATE_CAPTURE';
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

export type ExtensionMessage =
  ActivateCaptureMessage | CaptureTabRequestMessage;
