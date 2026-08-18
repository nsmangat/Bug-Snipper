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
    // TODO: logic to capture and crop the rectangle's area
  });

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
