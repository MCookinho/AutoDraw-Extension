window.AutoDraw = window.AutoDraw || {};

window.AutoDraw.currentAdapter = null;
window.AutoDraw.selectedArea = null;
window.AutoDraw.processedImage = null;
window.AutoDraw.overlayVisible = false;

const AUTODRAW_SITES = {
  'gartic.io': 'GarticAdapter',
  'garticphone.com': 'GarticPhoneAdapter',
  'sketch.io': 'SketchAdapter',
  'drawize.com': 'DrawizeAdapter',
};

function detectSiteAdapter() {
  const hostname = window.location.hostname;
  for (const [site, adapterName] of Object.entries(AUTODRAW_SITES)) {
    if (hostname.includes(site)) return adapterName;
  }
  return null;
}

function tryInitAdapter() {
  const adapterName = detectSiteAdapter();
  if (!adapterName) return false;

  const adapter = window.AutoDraw[adapterName];
  if (!adapter) {
    console.error('AutoDraw: Adapter not found:', adapterName);
    return false;
  }

  if (adapter.isActive()) {
    window.AutoDraw.currentAdapter = adapter;
    return true;
  }

  if (adapter.init()) {
    window.AutoDraw.currentAdapter = adapter;
    if (adapter.testCanvas) adapter.testCanvas();
    return true;
  }

  return false;
}

function waitForCanvas(maxAttempts = 100, interval = 500) {
  if (tryInitAdapter()) return;
  let attempts = 0;
  const timer = setInterval(() => {
    attempts++;
    if (tryInitAdapter()) {
      clearInterval(timer);
      return;
    }
    if (attempts >= maxAttempts) clearInterval(timer);
  }, interval);
}

waitForCanvas();

// Restore persisted image
try {
  chrome.storage.local.get('autodraw_image', (data) => {
    if (data.autodraw_image && !window.AutoDraw.processedImage) {
      const img = new Image();
      img.onload = () => {
        window.AutoDraw.processedImage = img;
        if (window.AutoDraw.Overlay.isActive()) {
          window.AutoDraw.Overlay.setDecalqueImage(img);
        }
      };
      img.src = data.autodraw_image;
    }
  });
} catch (e) {}

window.AutoDraw.startDraw = async function () {
  if (!window.AutoDraw.currentAdapter || !window.AutoDraw.currentAdapter.isActive()) {
    if (!tryInitAdapter()) {
      alert('AutoDraw: ' + window.AutoDraw.I18n.t('alert_canvas_not_found', 'Canvas not found. Join a drawing room.'));
      return;
    }
  }
  if (!window.AutoDraw.processedImage) {
    alert('AutoDraw: ' + window.AutoDraw.I18n.t('alert_no_image', 'No image loaded.'));
    return;
  }
  if (!window.AutoDraw.selectedArea) {
    alert('AutoDraw: ' + window.AutoDraw.I18n.t('alert_no_area', 'Select the drawing area.'));
    return;
  }

  const adapter = window.AutoDraw.currentAdapter;
  const speed = window.AutoDraw.Overlay.getSpeed();
  const resolution = window.AutoDraw.Overlay.getResolution();

  const imageData = window.AutoDraw.ImageProcessor.processImage(
    window.AutoDraw.processedImage,
    resolution,
    window.AutoDraw.ColorMatcher
  );

  window.AutoDraw.Overlay.setDrawingState(true);
  window.AutoDraw.Overlay.setStatus('Desenhando...', 'drawing');
  window.AutoDraw.Overlay.hideForDrawing();

  window.AutoDraw.DrawingEngine.setCallbacks(
    adapter,
    (p) => {
      window.AutoDraw.Overlay.setProgress(p.progress, p.drawnPixels, p.totalPixels);
    },
    () => {
      if (adapter.restoreAfterDrawing) adapter.restoreAfterDrawing();
      window.AutoDraw.Overlay.showAfterDrawing();
      window.AutoDraw.Overlay.setStatus('Completo!', 'ready');
      window.AutoDraw.Overlay.setDrawingState(false);
      setTimeout(() => window.AutoDraw.Overlay.hideProgress(), 2000);
    },
    (error) => {
      if (adapter.restoreAfterDrawing) adapter.restoreAfterDrawing();
      window.AutoDraw.Overlay.showAfterDrawing();
      window.AutoDraw.Overlay.setStatus('Erro: ' + error.message, 'error');
      window.AutoDraw.Overlay.setDrawingState(false);
    }
  );

  try {
    await window.AutoDraw.DrawingEngine.startDrawing(imageData, window.AutoDraw.selectedArea, speed);
  } catch (error) {
    if (adapter.restoreAfterDrawing) adapter.restoreAfterDrawing();
    window.AutoDraw.Overlay.showAfterDrawing();
    window.AutoDraw.Overlay.setStatus('Erro: ' + error.message, 'error');
    window.AutoDraw.Overlay.setDrawingState(false);
  }
};

window.AutoDraw.getAdapterStatus = function () {
  const adapterName = detectSiteAdapter();
  const adapter = adapterName ? window.AutoDraw[adapterName] : null;
  return {
    siteDetected: adapterName,
    adapterFound: !!adapter,
    adapterActive: adapter ? adapter.isActive() : false,
    canvasFound: adapter ? !!adapter.getCanvas() : false,
    tools: adapter && adapter.getTools ? adapter.getTools() : [],
    currentAdapter: window.AutoDraw.currentAdapter ? window.AutoDraw.currentAdapter.name : null,
  };
};

// ── Keyboard shortcuts ──

try {
  if (chrome.commands && chrome.commands.onCommand) {
    chrome.commands.onCommand.addListener((command) => {
      if (command === 'toggle-overlay') {
        if (window.AutoDraw.overlayVisible) {
          window.AutoDraw.Overlay.remove();
          window.AutoDraw.overlayVisible = false;
        } else {
          window.AutoDraw.Overlay.create();
          window.AutoDraw.overlayVisible = true;
          if (window.AutoDraw.processedImage) {
            window.AutoDraw.Overlay.setDecalqueImage(window.AutoDraw.processedImage);
          }
        }
      }
      if (command === 'start-draw') {
        window.AutoDraw.startDraw();
      }
      if (command === 'stop-draw') {
        window.AutoDraw.DrawingEngine.stopDrawing();
      }
      if (command === 'toggle-decalque') {
        const overlay = document.getElementById('autodraw-overlay');
        if (overlay) {
          const decalqueTab = overlay.querySelector('[data-odraw-mode="decalque"]');
          if (decalqueTab) decalqueTab.click();
        }
      }
    });
  }
} catch (e) {
  // chrome.commands.onCommand not available in content scripts — handled in background
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleOverlay') {
    if (window.AutoDraw.overlayVisible) {
      window.AutoDraw.Overlay.remove();
      window.AutoDraw.overlayVisible = false;
    } else {
      window.AutoDraw.Overlay.create();
      window.AutoDraw.overlayVisible = true;
      if (window.AutoDraw.processedImage) {
        window.AutoDraw.Overlay.setDecalqueImage(window.AutoDraw.processedImage);
      }
    }
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'loadImage') {
    const img = new Image();
    img.onload = () => {
      window.AutoDraw.processedImage = img;
      if (window.AutoDraw.Overlay.isActive()) {
        window.AutoDraw.Overlay.setDecalqueImage(img);
      }
      try { chrome.storage.local.set({ autodraw_image: request.dataUrl }); } catch (e) {}
      sendResponse({ success: true });
    };
    img.onerror = () => sendResponse({ success: false, error: 'Failed to load image' });
    img.src = request.dataUrl;
    return true;
  }

  if (request.action === 'getStatus') {
    sendResponse(window.AutoDraw.DrawingEngine.getStatus());
    return true;
  }

  if (request.action === 'stopDrawing') {
    window.AutoDraw.DrawingEngine.stopDrawing();
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'getPalette') {
    sendResponse({ palette: window.AutoDraw.ColorMatcher.getPalette() });
    return true;
  }

  if (request.action === 'getAdapterStatus') {
    sendResponse(window.AutoDraw.getAdapterStatus());
    return true;
  }

  if (request.action === 'toggleDecalque') {
    if (request.enabled) {
      window.AutoDraw.Overlay.setDecalqueImage(window.AutoDraw.processedImage);
    }
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'toggleAutopress') {
    const result = window.AutoDraw.Overlay.toggleAutoPress();
    sendResponse({ success: true, autoPress: result });
    return true;
  }

  if (request.action === 'updateDecalque') {
    if (request.settings) {
      window.AutoDraw.Overlay.updateDecalque();
    }
    sendResponse({ success: true });
    return true;
  }
});
