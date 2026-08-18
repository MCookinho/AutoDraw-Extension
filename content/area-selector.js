window.AutoDraw = window.AutoDraw || {};

window.AutoDraw.AreaSelector = (() => {
  let overlay = null;
  let selectionBox = null;
  let isSelecting = false;
  let startX = 0;
  let startY = 0;
  let onComplete = null;

  function createOverlay() {
    if (overlay) removeOverlay();

    overlay = document.createElement('div');
    overlay.id = 'autodraw-area-overlay';
    overlay.innerHTML = `
      <div class="autodraw-area-instructions">
        <span>Draw a rectangle to select the drawing area</span>
        <button class="autodraw-area-cancel">Cancel (ESC)</button>
      </div>
      <div class="autodraw-area-selection"></div>
    `;

    document.body.appendChild(overlay);

    selectionBox = overlay.querySelector('.autodraw-area-selection');

    overlay.addEventListener('mousedown', handleMouseDown);
    overlay.addEventListener('mousemove', handleMouseMove);
    overlay.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
  }

  function removeOverlay() {
    if (overlay) {
      overlay.removeEventListener('mousedown', handleMouseDown);
      overlay.removeEventListener('mousemove', handleMouseMove);
      overlay.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
      overlay.remove();
      overlay = null;
      selectionBox = null;
    }
  }

  function handleMouseDown(e) {
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;

    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.style.display = 'block';
  }

  function handleMouseMove(e) {
    if (!isSelecting) return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const left = Math.min(currentX, startX);
    const top = Math.min(currentY, startY);

    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
  }

  function handleMouseUp(e) {
    if (!isSelecting) return;

    isSelecting = false;

    const endX = e.clientX;
    const endY = e.clientY;

    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    if (width < 10 || height < 10) {
      selectionBox.style.display = 'none';
      return;
    }

    const area = {
      x: Math.min(endX, startX),
      y: Math.min(endY, startY),
      width: width,
      height: height,
    };

    if (onComplete) {
      onComplete(area);
    }

    removeOverlay();
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      removeOverlay();
      if (onComplete) {
        onComplete(null);
      }
    }
  }

  function startSelection(callback) {
    onComplete = callback;
    createOverlay();
  }

  function cancel() {
    removeOverlay();
    if (onComplete) {
      onComplete(null);
    }
  }

  return {
    startSelection,
    cancel,
    isActive: () => overlay !== null,
  };
})();
