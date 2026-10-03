import type { CapturedError } from '@bug-snipper/shared-types';
import { CAPTURED_ERRORS_MAX_COUNT } from '@bug-snipper/shared-types';
import type { ErrorsUpdatedWindowMessage } from '../lib/window-messages';

// world: 'MAIN' - runs in the host page's JS, not the isolated world content.ts runs in
// This is how the page's real window.onerror/unhandledrejection events are tracked
// Listening from the isolated world would only ever see errors from the content
// script's own code, since isolated and main worlds are separate JS environments that
// share the same DOM, but nothing else
export default defineContentScript({
  matches: ['*://*/*'],
  world: 'MAIN',
  main() {
    // Rolling buffer capped at CAPTURED_ERRORS_MAX_COUNT, lives only in this main world script's memory
    // content.ts (isolated world) can't read this array directly (different JS
    // realm so no shared references), so the whole buffer is resent using postMessage on every
    // change, and content.ts just keeps whatever it last received
    const errors: CapturedError[] = [];

    function publish(): void {
      const message: ErrorsUpdatedWindowMessage = {
        source: 'bug-snipper',
        type: 'ERRORS_UPDATED',
        payload: errors,
      };
      // targetOrigin '*' - this never leaves the page (isolated world content
      // scripts on the same page receive it regardless of origin), and the payload itself is
      // just error messages/stack traces, nothing sensitive
      window.postMessage(message, '*');
    }

    function record(entry: CapturedError): void {
      errors.push(entry);
      // Trim from the front (i.e. oldest first) once over the max
      if (errors.length > CAPTURED_ERRORS_MAX_COUNT) {
        errors.splice(0, errors.length - CAPTURED_ERRORS_MAX_COUNT);
      }

      publish();
    }

    window.addEventListener('error', (event) => {
      record({
        type: 'error',
        message: event.message,
        stack:
          /*Can't just do 
        event.error instanceof Error ? event.error.stack : null
        since event.error.stack is defined as string | undefined, 
        but we defined CapturedError.stack as string | null so above would fail typecheck
        */
          event.error instanceof Error ? (event.error.stack ?? null) : null,
        timestamp: new Date().toISOString(),
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason: unknown = event.reason;
      record({
        type: 'unhandledrejection',
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? (reason.stack ?? null) : null,
        timestamp: new Date().toISOString(),
      });
    });
  },
});
