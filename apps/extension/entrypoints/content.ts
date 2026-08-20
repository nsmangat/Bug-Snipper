import { browser } from 'wxt/browser';
import type { ExtensionMessage } from '../lib/background-content-messages';

const OVERLAY_HOST_ID = 'bug-snipper-overlay-host';

export default defineContentScript({
  // Broad match for now, change after domain allowlist gating
  matches: ['*://*/*'],
  main() {
    browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
      if (message.type === 'ACTIVATE_CAPTURE') {
        activateOverlay();
      }
    });
  },
});

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
  `;

  // Creating the overlay div i.e. darkened background when readying to crop
  const overlay = document.createElement('div');
  overlay.className = 'overlay';

  // Nest the cropping rectangle inside it
  const selectionBox = document.createElement('div');
  selectionBox.className = 'selection-box';
  overlay.appendChild(selectionBox);

  // Adding style as like a global style in the shadow DOM, then adding overlay
  shadowRoot.appendChild(style);
  shadowRoot.appendChild(overlay);

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

    // Just showing the cropped result as proof it lines up with the selected region,
    // TODO: Update to replace this with real DOM snapshot with the submission form
    selectionBox.style.backgroundImage = `url(${croppedDataUrl})`;
    // Scale background image so it coverts the element it's applied to
    selectionBox.style.backgroundSize = 'cover';
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
