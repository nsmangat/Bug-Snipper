import { browser } from 'wxt/browser';
import type {
  BrowserInfo,
  Coordinates,
  DomSnapshot,
  SubmitReportRequest,
  Viewport,
} from '@bug-snipper/shared-types';
import type {
  ExtensionMessage,
  SubmitReportResult,
} from '../lib/background-content-messages';

const OVERLAY_HOST_ID = 'bug-snipper-overlay-host';
const INTRO_CARD_HOST_ID = 'bug-snipper-intro-card-host';
// For domains not allowed, just showing a toast to let the user know the extension can't be used
const TOAST_HOST_ID = 'bug-snipper-toast-host';

// List of some important computed style properties, not a full dump since there's so many
// Note: getComputedStyle().getPropertyValue() needs hyphenated CSS property names
// ('background-color'), unlike element.style's camelCase ('backgroundColor')
const CAPTURED_STYLE_PROPERTIES = [
  'color',
  'background-color',
  'font-size',
  'font-family',
  'font-weight',
  'border',
  'padding',
  'margin',
  'display',
] as const; // as const turns it into a readonly tuple, cannot be mutated, just used for safety

export default defineContentScript({
  // Broad match for now, change after domain allowlist gating
  matches: ['*://*/*'],
  main() {
    browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
      if (message.type === 'ACTIVATE_CAPTURE') {
        showIntroCard();
      }
      if (message.type === 'DOMAIN_NOT_ALLOWED') {
        showNotAllowedToast();
      }
    });
  },
});

// Toast message to notify user the current tab's site is not domain listed, so the extension can't be used here
function showNotAllowedToast(): void {
  // Guard against stacking a second toast if the extension is clicked again before
  // the toast goes away
  document.getElementById(TOAST_HOST_ID)?.remove();

  const hostElement = document.createElement('div');
  hostElement.id = TOAST_HOST_ID;
  const shadowRoot = hostElement.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    .toast {
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483647;
      background: #111111;
      color: #ffffff;
      padding: 10px 16px;
      border-radius: 6px;
      font: 13px system-ui, sans-serif;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      max-width: 320px;
      text-align: center;
    }
  `;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent =
    "This site isn't registered for bug reports, so the extension Bug Snipper cannot be used.";

  shadowRoot.appendChild(style);
  shadowRoot.appendChild(toast);
  document.body.appendChild(hostElement);

  setTimeout(() => hostElement.remove(), 2500);
}

// Shown first everytime the extension is clicked
// Card gives a brief description on what to do followed by providing a button to start screenshotting
function showIntroCard(): void {
  // Don't show the intro card again if it's already up, or if the user already clicked through
  // to the capture mode
  if (document.getElementById(INTRO_CARD_HOST_ID)) return;
  if (document.getElementById(OVERLAY_HOST_ID)) return;

  const hostElement = document.createElement('div');
  hostElement.id = INTRO_CARD_HOST_ID;
  const shadowRoot = hostElement.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    .card {
      position: fixed;
      top: 16px;
      right: 16px;
      width: 325px;
      z-index: 2147483647;
      background: #111827;
      color: #ffffff;
      border-radius: 12px;
      padding: 16px;
      font: 13px system-ui, sans-serif;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }
    .card h2 {
      margin: 0 0 8px;
      padding-right: 20px;
      font-size: 15px;
      font-weight: 600;
    }
    .card p {
      margin: 0 0 14px;
      color: #9ca3af;
      line-height: 1.4;
    }
    .card .start-btn {
      width: 100%;
      padding: 10px;
      border: none;
      border-radius: 8px;
      background: #10b981;
      color: #ffffff;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .card .close-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 20px;
      height: 20px;
      padding: 0;
      border: none;
      background: transparent;
      color: #9ca3af;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
    }
    .card .close-btn:hover {
      color: #ffffff;
    }
  `;

  const card = document.createElement('div');
  card.className = 'card';

  const heading = document.createElement('h2');
  heading.textContent = 'BugSnipper - Capture Bugs with Screenshots';

  const description = document.createElement('p');
  description.textContent = `Crop the region containing the bug, (optionally) add a description, and submit!`;

  const startButton = document.createElement('button');
  startButton.className = 'start-btn';
  startButton.textContent = 'Start Capture';
  startButton.addEventListener('click', () => {
    dismissCard();
    activateOverlay();
  });

  const closeButton = document.createElement('button');
  closeButton.className = 'close-btn';
  closeButton.textContent = '×';
  closeButton.setAttribute('aria-label', 'Dismiss');
  closeButton.addEventListener('click', () => dismissCard());

  card.appendChild(closeButton);
  card.appendChild(heading);
  card.appendChild(description);
  card.appendChild(startButton);

  shadowRoot.appendChild(style);
  shadowRoot.appendChild(card);
  document.body.appendChild(hostElement);

  // Shared by the close button, escape key and start buttons
  function dismissCard(): void {
    hostElement.remove();
    document.removeEventListener('keydown', handleCardKeydown);
  }

  // Escape dismissal
  function handleCardKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') dismissCard();
  }
  document.addEventListener('keydown', handleCardKeydown);
}

// Ability to drag-select rectangle only, no capture/crop/submit yet
function activateOverlay(): void {
  // Avoid stacking a second overlay if the icon gets clicked again while one's already active.
  if (document.getElementById(OVERLAY_HOST_ID)) return;

  // Shadow DOM so extension's elements i.e. drag-select rectangle doesn't conflict
  // with web page's existing HTML/CSS and vice-versa
  const hostElement = document.createElement('div');
  hostElement.id = OVERLAY_HOST_ID;
  const shadowRoot = hostElement.attachShadow({ mode: 'open' }); // mode: 'open' for JS access from main web page and own code

  const style = document.createElement('style');
  // fixed position so left and top will work
  // inset is traditional top, right, bottom, left - setting it to 0 + position fixed covers the whole viewport
  // so overlay is covering the whole tab basically
  //
  //.report-panel .feature - Descendent selector - applies if second selector is inside i.e. a child or grandchild
  // of the first selector i.e. tags that are inside a tag that is of report-panel class
  style.textContent = `
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      cursor: crosshair;
      background: rgba(0, 0, 0, 0.15);
    }
    .selection-box {
      position: absolute;
      border: 3px dashed #FFFFFF;
      background: rgba(9, 105, 232, 0.15);
      display: none;
    }
    .report-panel {
      position: fixed;
      bottom: 16px;
      right: 16px;
      width: 280px;
      /* Need z-index, same as .overlay's, without one, this defaults to z-index:
      auto, which paints BEHIND any element with an explicit z-index regardless of DOM
      order, so the panel would render invisible underneath the overlay. Equal
      values fall back to DOM order as the tiebreak, and this is appended after .overlay. */
      z-index: 2147483647;
      background: #ffffff;
      color: #111111;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      padding: 12px;
      font: 13px system-ui, sans-serif;
      display: none;
    }
    .report-panel .preview {
      width: 100%;
      max-height: 120px;
      object-fit: contain;
      border: 1px solid #dddddd;
      border-radius: 4px;
      margin-bottom: 8px;
      background: #f5f5f5;
    }
    .report-panel textarea {
      width: 100%;
      box-sizing: border-box;
      min-height: 60px;
      resize: vertical;
      padding: 6px;
      border: 1px solid #cccccc;
      border-radius: 4px;
      font: inherit;
      margin-bottom: 8px;
    }
    .report-panel .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .report-panel button {
      padding: 6px 12px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      font: inherit;
    }
    .report-panel .cancel-btn {
      background: #eeeeee;
      color: #333333;
    }
    .report-panel .submit-btn {
      background: #0969e8;
      color: #ffffff;
    }
    .report-panel .status {
      margin-top: 8px;
      font-size: 12px;
      color: #555555;
    }
  `;

  // Creating the overlay div i.e. darkened background when readying to crop
  const overlay = document.createElement('div');
  overlay.className = 'overlay';

  // Nest the cropping rectangle inside it
  const selectionBox = document.createElement('div');
  selectionBox.className = 'selection-box';
  overlay.appendChild(selectionBox);

  // Report panel (preview + note + submit/cancel)
  // A sibling of overlay, not child/nested because if it were a child of overlay,
  // clicking/typing inside the panel would affect overlay's own mousedown/mousemove
  // listeners and could start an unintended new drag-selection
  const reportPanel = document.createElement('div');
  reportPanel.className = 'report-panel';

  const previewImage = document.createElement('img');
  previewImage.className = 'preview';

  const noteTextarea = document.createElement('textarea');
  noteTextarea.placeholder = 'Describe the issue (optional)';

  const actionsRow = document.createElement('div');
  actionsRow.className = 'actions';

  const cancelButton = document.createElement('button');
  cancelButton.className = 'cancel-btn';
  cancelButton.textContent = 'Cancel';

  const submitButton = document.createElement('button');
  submitButton.className = 'submit-btn';
  submitButton.textContent = 'Submit';

  const statusMessage = document.createElement('div');
  statusMessage.className = 'status';

  actionsRow.appendChild(cancelButton);
  actionsRow.appendChild(submitButton);
  reportPanel.appendChild(previewImage);
  reportPanel.appendChild(noteTextarea);
  reportPanel.appendChild(actionsRow);
  reportPanel.appendChild(statusMessage);

  // Adding style as like a global style in the shadow DOM, then adding overlay
  shadowRoot.appendChild(style);
  shadowRoot.appendChild(overlay);
  // Appended after overlay, has same z-index, so DOM order breaks the tie and this
  // paints on top
  shadowRoot.appendChild(reportPanel);

  // Finally actually add the outer div that contains the shadow DOM and lives inside actual web page's HTML/CSS
  document.body.appendChild(hostElement);

  /**To update the rectangle, selectionBox is position absolute, so left and top measured relative to nearest positioned ancestor.
   * Nearest ancestor is overlay which has position fixed, making it the containing block for anything absolute positioned in it.
   * Since overlay is whole viewport, top-left is (0,0), selectionBox's positioning context lines up exactly with
   * the viewport's coordinates. Thus, can use MouseEvent clientX and clientY as initial left and top.
   * To make a rectangle generally, set left, top, width and height, top-left corner sits at (X, Y), which is the anchor
   *
   * i.e. initial x is 300, drag mouse right so x is 380, new width = |currentx - startx| = 380 - 300 = 80px,
   * so set width prop to 80px.
   * Same logic for height using Y i.e. start is 300, drag mouse down to 200,
   * so new height = |currenty - starty| = 300-200 = 100px. set height to 100px so dimenions of box is 80px x 100px
   * Using min and max to ensure correct left/top no matter which direction mouse drags in
   */
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  // Filled in by handleSelectionFinished, read by handleSubmit once the user clicks Submit
  // Since the two functions run at different times, declare here to persist data between them
  let pendingScreenshotBase64: string | null = null;
  let pendingDomSnapshot: DomSnapshot | null = null;
  let pendingCoordinates: Coordinates | null = null;
  let pendingViewport: Viewport | null = null;

  // Sizing the selection box, initially at size 0 when user clicks, then with drag, mouse coordinates get updated,
  // so currentx and currenty updating, creating the rectangle appearance
  function updateSelectionBox(currentX: number, currentY: number): void {
    // Math.min for position, Math.abs for size
    // Need left and top set to min to ensure left/top always lands on whichever corner is actually further top-left
    // no matter if dragging top-left to bottom-right or from bottom-right to top-left
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    // abs here to not get negative height or width
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    // Individual property assignment, update on every mousemove/drag
    // to update the rectangle shape
    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
  }

  // Since overlay div covers the whole screen, the event listeners are basically global, hence how clicking
  // anywhere in the tab and dragging works

  // MouseEvent object has data about the cursor's location and other stuff
  // On 'first click' to start drawing the rectangle, obtain the starting x and y
  overlay.addEventListener('mousedown', (event: MouseEvent) => {
    isDragging = true;
    // Cursor coordinates relative to visible browser viewport
    startX = event.clientX;
    startY = event.clientY;
    selectionBox.style.display = 'block';
    updateSelectionBox(startX, startY);
  });

  overlay.addEventListener('mousemove', (event: MouseEvent) => {
    if (!isDragging) return;
    updateSelectionBox(event.clientX, event.clientY);
  });

  // Letting go of the mouse button i.e. drag is done
  overlay.addEventListener('mouseup', () => {
    isDragging = false;
    void handleSelectionFinished();
  });

  async function handleSelectionFinished(): Promise<void> {
    // getBoundingClientRect() gets the size of the HTML element
    // (width, height, top, left, bottom, right, x and y)
    // same viewport space as clientX/clientY, so no extra conversion needed
    const selectionRect = selectionBox.getBoundingClientRect();

    // Ignore accidental clicks or short drags rather than trying to capture near 0 sized regions
    if (selectionRect.width < 4 || selectionRect.height < 4) return;

    const fullScreenshotDataUrl = await requestTabScreenshot();
    const croppedDataUrl = await cropScreenshot(
      fullScreenshotDataUrl,
      selectionRect,
    );

    const targetElement = getElementAtSelectionCenter(selectionRect);
    const domSnapshot = targetElement
      ? buildDomSnapshot(targetElement)
      : { html: '', styles: {} };

    // Stash everything handleSubmit will need once the user actually clicks Submit
    // The note text isn't known yet, so the payload can't be fully built yet
    pendingScreenshotBase64 = croppedDataUrl;
    pendingDomSnapshot = domSnapshot;
    pendingCoordinates = {
      x: selectionRect.left,
      y: selectionRect.top,
      width: selectionRect.width,
      height: selectionRect.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    };
    pendingViewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    };

    showReportPanel(croppedDataUrl);
  }

  function showReportPanel(croppedDataUrl: string): void {
    previewImage.src = croppedDataUrl;
    noteTextarea.value = '';
    statusMessage.textContent = '';
    // This is how the report panel 'appears' after cropping is done
    reportPanel.style.display = 'block';
    noteTextarea.focus();
  }

  cancelButton.addEventListener('click', () => {
    deactivateOverlay();
  });

  submitButton.addEventListener('click', () => {
    void handleSubmit();
  });

  async function handleSubmit(): Promise<void> {
    // Case for if submit button somehow hit before any selection finished
    // Shouldn't happen since the panel is hidden until showReportPanel runs
    if (
      !pendingScreenshotBase64 ||
      !pendingDomSnapshot ||
      !pendingCoordinates ||
      !pendingViewport
    ) {
      return;
    }

    const browserInfo: BrowserInfo = {
      userAgent: navigator.userAgent,
      browserName: 'chrome',
      browserVersion: 'unknown',
      os: 'unknown',
    };

    const payload: SubmitReportRequest = {
      pageUrl: location.href,
      screenshotBase64: pendingScreenshotBase64,
      domSnapshot: pendingDomSnapshot,
      coordinates: pendingCoordinates,
      viewport: pendingViewport,
      browserInfo,
      note: noteTextarea.value || null,
    };

    submitButton.disabled = true;
    cancelButton.disabled = true;
    statusMessage.textContent = 'Submitting bug report...';

    // satisifes - verifying the object being sent is a valid ExtensionMessage
    // in this case checking if it matches the SubmitReportMessage variant of the ExtensionMessage union
    // Want this because want to check to make sure type: Submit_Report is valid, but don't want to change
    // the object variable type to ExtensionMessage after
    // Casting as SubmitReportResult in the end since in background.ts have the response shaped like this
    // Since we control both sides, can say with 100% confidence this is the shape of the request the background worker
    // will expect to see
    const result = (await browser.runtime.sendMessage({
      type: 'SUBMIT_REPORT',
      payload,
    } satisfies ExtensionMessage)) as SubmitReportResult;

    if (result.ok) {
      statusMessage.textContent = 'Report submitted successfully!';
      setTimeout(() => deactivateOverlay(), 1200);
    } else {
      statusMessage.textContent = `Submission failed (${result.status}). Try again?`;
      submitButton.disabled = false;
      cancelButton.disabled = false;
    }
  }

  // Getting the root or topmost element in the screenshot
  function getElementAtSelectionCenter(rect: DOMRect): Element | null {
    // Using midpoint to find the topmost element in the cropped coordinates
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // First need to hide our extension's cropping overlay temporarily to get the true top element of the
    // site's section the extension cropped
    // Doing this by temporarily disabling its pointer events so elementFromPoint see through to actual site's elements
    hostElement.style.pointerEvents = 'none';
    const element = document.elementFromPoint(centerX, centerY);
    hostElement.style.pointerEvents = '';

    return element;
  }

  function extractCapturedStyles(element: Element): Record<string, string> {
    // window.getComputedStyle(whateverElement) gets CSS values applied to an element by the browser
    const computedStyles = window.getComputedStyle(element);
    const captured: Record<string, string> = {};

    // Going through these css properties, but only going through the targetted ones in CAPTURED_STYLE_PROPERTIES
    // getPropertyValue will get that actual value for that property i.e. getPropertyValue(width) gives 50 px
    // So building the styles for that element passed into this function i.e. root and children if there are any
    for (const property of CAPTURED_STYLE_PROPERTIES) {
      captured[property] = computedStyles.getPropertyValue(property);
    }

    return captured;
  }

  // Obtaining info for root and all its children if any
  function buildDomSnapshot(element: Element): DomSnapshot {
    // Getting the styles for each element in the screenshot
    // Can initialize with the root/top most element since we already have that
    // Nested object since it'll be {element-name: {css prop: value}}
    const styles: Record<string, Record<string, string>> = {
      root: extractCapturedStyles(element),
    };

    // Now going through all of the children and doing the same
    // naming convention will be child-index#-Tag:styles
    Array.from(element.children).forEach((child, index) => {
      styles[`child-${index}-${child.tagName.toLowerCase()}`] =
        extractCapturedStyles(child);
    });

    // So styles will end up looking like styles: { root:{color:'...', 'background-color:'...'}, child-0-span:{color:'...',...}...}

    return {
      html: element.outerHTML,
      styles,
    };
  }

  // Message from content script to background to capture the current viewport or current part of the tab
  // we're looking at when we drew the rectangle/cropped
  async function requestTabScreenshot(): Promise<string> {
    const message: ExtensionMessage = { type: 'CAPTURE_TAB_REQUEST' };
    const response = await browser.runtime.sendMessage(message);

    return response as string;
  }

  async function cropScreenshot(
    fullScreenshotDataUrl: string,
    cssRect: DOMRect,
  ): Promise<string> {
    const image = await loadImage(fullScreenshotDataUrl);

    /** captureVisibleTab returns image sized in physical pixels, but selectionRect is in CSS pixels
     * On modern screens like retina or 4k monitors, they will be different, so need to scale up the size by
     * devicePixelRatio to get accurate crop on those devices
     */
    const dpr = window.devicePixelRatio;

    // canvas - HTML element that acts like a blank 2D or 3D drawing board on a web page
    // Used for things like rendering shapes, visualizing data through charts and image manipulation
    // like cropping and resizing, which is what we'll use it for
    const canvas = document.createElement('canvas');
    canvas.width = cssRect.width * dpr;
    canvas.height = cssRect.height * dpr;

    // To draw on it, get the canvas' context, usually 2D, to get the drawing tools
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2d canvas context');

    // Drawing the image onto the canvas with selectionBox's dimensions i.e. cropped area
    context.drawImage(
      image,
      cssRect.left * dpr,
      cssRect.top * dpr,
      cssRect.width * dpr,
      cssRect.height * dpr,
      0,
      0,
      cssRect.width * dpr,
      cssRect.height * dpr,
    );

    // Pack it back into base64 string
    return canvas.toDataURL('image/png');
  }

  // Since we need the image right away after it loads, need to do an await for it so everything in cropScreenshot
  // pauses until the image is fully obtained (while rest of the program runs as normal)
  // onload is a traditional event driven callback
  // If we want it to be modern async/await architecture, wrap it in a promise
  // Now can wait until the image fully loads i.e. we say don't let await finish yet, pause until
  // the resolve inside the onload event is called
  // onload assigned to resolve, onerror assigned to reject and the promise doesn't settle
  // until one of those callbacks fires
  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      // HTML image
      const image = new Image();
      // onload for async loading i.e. image loads in background
      // onload is an event listener so we'll know when the image is fully loaded or failed to load
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error('Failed to load screenshot image'));
      image.src = src;
    });
  }

  // Exiting the cropping mode
  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      deactivateOverlay();
    }
  }

  function deactivateOverlay(): void {
    document.removeEventListener('keydown', handleKeydown);
    hostElement.remove();
  }

  // Global listener for being able to escape from the extension
  // Corresponding remove event (deactivateOverlay()) needs same reference that was used to create the event i.e. handleKeydown
  document.addEventListener('keydown', handleKeydown);
}
