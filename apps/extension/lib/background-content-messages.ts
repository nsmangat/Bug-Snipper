/** Purpose of this interface is to have like a typed contract between background worker
 * and content script i.e. they both know what to expect in the messages they send/receive between the 2
 * Type is a discriminant to act as a string tag identifying which message variant this is
 * More message variants to be added for things like capturing, cropping and submitting reports
 */
export interface ActivateCaptureMessage {
  type: 'ACTIVATE_CAPTURE';
}

export type ExtensionMessage = ActivateCaptureMessage;
