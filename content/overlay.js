window.AutoDraw = window.AutoDraw || {};

window.AutoDraw.Overlay = (() => {
  let overlay = null;
  let isMinimized = false;
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  let decalqueCanvas = null;
  let decalqueEnabled = false;
  let decalqueImageData = null;
  let decalqueSettings = {
    opacity: 50,
    scale: 100,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    grayscale: false,
    invert: false,
    edgeDetect: false,
    hiddenColors: [],
    autoColor: false,
    autoPress: false,
  };
  let lastMouseX = 0;
  let lastMouseY = 0;
  let lastPickedColor = null;
  let lastAutoColorTime = 0;
  let autoPressActive = false;
  let autoPressMouseIsDown = false;

  function t(key, fb) {
    try { return window.AutoDraw.I18n.t(key, fb); } catch { return fb || key; }
  }

  function create() {
    if (overlay) remove();

    overlay = document.createElement('div');
    overlay.id = 'autodraw-overlay';
    overlay.innerHTML = `
      <div class="autodraw-header">
        <span>AutoDraw</span>
        <span class="autodraw-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><path d="M17 3l4 4-14 14H3v-4L17 3z"/></svg>
        </span>
        <div class="autodraw-header-buttons">
          <button class="autodraw-minimize" title="${t('overlay_minimize', 'Minimize')}">&#8722;</button>
          <button class="autodraw-close" title="${t('overlay_close', 'Close')}">&times;</button>
        </div>
      </div>
      <div class="autodraw-content">
        <div class="autodraw-mode-tabs">
          <button class="autodraw-mode-tab active" data-odraw-mode="draw">${t('overlay_draw', 'Draw')}</button>
          <button class="autodraw-mode-tab" data-odraw-mode="decalque">${t('overlay_decalque', 'Decalque')}</button>
        </div>

        <div class="autodraw-status">
          <span class="status-dot"></span>
          <span class="status-text">${t('overlay_ready', 'Ready')}</span>
        </div>

        <div class="autodraw-progress" style="display:none;">
          <div class="autodraw-progress-bar">
            <div class="autodraw-progress-fill"></div>
          </div>
          <div class="autodraw-progress-text">0%</div>
        </div>

        <!-- Draw Mode -->
        <div class="autodraw-draw-section">
          <div class="autodraw-controls">
            <div class="autodraw-control-group">
              <label>${t('speed', 'Speed')}</label>
              <input type="range" class="autodraw-speed" min="1" max="100" value="80">
              <span class="value autodraw-speed-value">80</span>
            </div>
            <div class="autodraw-control-group">
              <label>${t('resolution', 'Resolution')}</label>
              <input type="range" class="autodraw-resolution" min="16" max="256" value="64">
              <span class="value autodraw-resolution-value">64</span>
            </div>
          </div>
          <div class="autodraw-area-selector">
            <p>${t('overlay_area', 'Drawing area')}</p>
            <div class="autodraw-area-buttons">
              <button class="autodraw-btn autodraw-btn-secondary autodraw-use-canvas">${t('overlay_canvas', 'Canvas')}</button>
              <button class="autodraw-btn autodraw-btn-secondary autodraw-select-area">${t('overlay_select', 'Select')}</button>
            </div>
            <div class="autodraw-area-info"></div>
          </div>
          <div class="autodraw-buttons">
            <button class="autodraw-btn autodraw-btn-primary autodraw-start">${t('overlay_start', 'Start drawing')}</button>
            <button class="autodraw-btn autodraw-btn-danger autodraw-stop" style="display:none;">${t('overlay_stop', 'Stop')}</button>
          </div>
        </div>

        <!-- Decalque Mode -->
        <div class="autodraw-decalque-section" style="display:none;">
          <div class="autodraw-decalque-controls">
            <div class="autodraw-decalque-row">
              <label>${t('opacity', 'Opacity')}</label>
              <input type="range" class="odc-opacity" min="5" max="100" value="50">
              <span class="value odc-opacity-value">50%</span>
            </div>
            <div class="autodraw-decalque-row">
              <label>${t('scale', 'Scale')}</label>
              <input type="range" class="odc-scale" min="20" max="300" value="100">
              <span class="value odc-scale-value">100%</span>
            </div>
            <div class="autodraw-decalque-row">
              <label>${t('brightness', 'Brightness')}</label>
              <input type="range" class="odc-brightness" min="0" max="200" value="100">
              <span class="value odc-brightness-value">100%</span>
            </div>
            <div class="autodraw-decalque-row">
              <label>${t('contrast', 'Contrast')}</label>
              <input type="range" class="odc-contrast" min="0" max="200" value="100">
              <span class="value odc-contrast-value">100%</span>
            </div>
            <div class="autodraw-decalque-row">
              <label>${t('saturation', 'Saturation')}</label>
              <input type="range" class="odc-saturation" min="0" max="200" value="100">
              <span class="value odc-saturation-value">100%</span>
            </div>
            <div class="autodraw-decalque-row">
              <label>${t('grayscale', 'Grayscale')}</label>
              <label class="autodraw-toggle-sm"><input type="checkbox" class="odc-grayscale"><span class="slider"></span></label>
            </div>
            <div class="autodraw-decalque-row">
              <label>${t('invert_colors', 'Invert')}</label>
              <label class="autodraw-toggle-sm"><input type="checkbox" class="odc-invert"><span class="slider"></span></label>
            </div>
            <div class="autodraw-decalque-row">
              <label>${t('edge_detection', 'Edges')}</label>
              <label class="autodraw-toggle-sm"><input type="checkbox" class="odc-edge"><span class="slider"></span></label>
            </div>
            <div class="autodraw-decalque-row">
              <label>${t('decalque_auto_color', 'Auto color')}</label>
              <label class="autodraw-toggle-sm"><input type="checkbox" class="odc-auto-color"><span class="slider"></span></label>
            </div>
            <div class="autodraw-decalque-row">
              <label>${t('decalque_auto_press', 'Auto press')}</label>
              <label class="autodraw-toggle-sm"><input type="checkbox" class="odc-auto-press" disabled><span class="slider"></span></label>
            </div>
          </div>
          <div class="autodraw-buttons">
            <button class="autodraw-btn autodraw-btn-secondary odc-reposition">${t('reposition', 'Reposition')}</button>
            <button class="autodraw-btn autodraw-btn-secondary odc-reset">${t('reset_filters', 'Reset')}</button>
          </div>
          <div class="autodraw-decalque-color-list" style="margin-top:10px;"></div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    setupEventListeners();
    makeDraggable();
  }

  function remove() {
    releaseAutoPress();
    if (overlay) { overlay.remove(); overlay = null; }
    removeDecalqueCanvas();
  }

  function setupEventListeners() {
    const minBtn = overlay.querySelector('.autodraw-minimize');
    const closeBtn = overlay.querySelector('.autodraw-close');
    const speedSlider = overlay.querySelector('.autodraw-speed');
    const resSlider = overlay.querySelector('.autodraw-resolution');
    const selectAreaBtn = overlay.querySelector('.autodraw-select-area');
    const useCanvasBtn = overlay.querySelector('.autodraw-use-canvas');
    const startBtn = overlay.querySelector('.autodraw-start');
    const stopBtn = overlay.querySelector('.autodraw-stop');

    minBtn.addEventListener('click', toggleMinimize);
    closeBtn.addEventListener('click', remove);

    speedSlider.addEventListener('input', (e) => {
      overlay.querySelector('.autodraw-speed-value').textContent = e.target.value;
      window.AutoDraw.DrawingEngine.stopDrawing();
    });

    resSlider.addEventListener('input', (e) => {
      overlay.querySelector('.autodraw-resolution-value').textContent = e.target.value;
    });

    useCanvasBtn.addEventListener('click', async () => {
      const adapter = window.AutoDraw.currentAdapter;
      if (!adapter || !adapter.isActive()) { setStatus(t('alert_canvas_not_found', 'Canvas not found'), 'error'); return; }

      let canvas = adapter.getCanvas();
      let rect = canvas ? canvas.getBoundingClientRect() : null;

      // Retry: canvas might not be rendered yet
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        if (adapter.refresh) adapter.refresh();
        await new Promise(r => setTimeout(r, 300));
        canvas = adapter.getCanvas();
        rect = canvas ? canvas.getBoundingClientRect() : null;
      }

      if (!rect || (rect.width === 0 && rect.height === 0)) {
        setStatus(t('overlay_canvas_0x0', 'Canvas 0x0 — wait for room to load'), 'error');
        return;
      }

      const area = { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
      window.AutoDraw.selectedArea = area;
      overlay.querySelector('.autodraw-area-info').textContent =
        `Canvas: ${Math.round(area.width)}x${Math.round(area.height)}`;
      setStatus(t('overlay_area_selected', 'Area selected'), 'ready');
    });

    selectAreaBtn.addEventListener('click', () => {
      if (window.AutoDraw.AreaSelector.isActive()) return;
      window.AutoDraw.AreaSelector.startSelection((area) => {
        if (area) {
          window.AutoDraw.selectedArea = area;
          overlay.querySelector('.autodraw-area-info').textContent =
            `Manual: ${Math.round(area.width)}x${Math.round(area.height)}`;
        }
      });
    });

    startBtn.addEventListener('click', () => window.AutoDraw.startDraw());
    stopBtn.addEventListener('click', () => window.AutoDraw.DrawingEngine.stopDrawing());

    // Mode tabs
    overlay.querySelectorAll('.autodraw-mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        overlay.querySelectorAll('.autodraw-mode-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const mode = tab.dataset.odrawMode;
        const drawSection = overlay.querySelector('.autodraw-draw-section');
        const decalqueSection = overlay.querySelector('.autodraw-decalque-section');
        if (mode === 'decalque') {
          drawSection.style.display = 'none';
          decalqueSection.style.display = 'block';
          enableDecalqueMode();
        } else {
          drawSection.style.display = 'block';
          decalqueSection.style.display = 'none';
          disableDecalqueMode();
        }
      });
    });

    // Decalque controls
    const dcPairs = [
      ['.odc-opacity', '.odc-opacity-value', 'opacity', '%'],
      ['.odc-scale', '.odc-scale-value', 'scale', '%'],
      ['.odc-brightness', '.odc-brightness-value', 'brightness', '%'],
      ['.odc-contrast', '.odc-contrast-value', 'contrast', '%'],
      ['.odc-saturation', '.odc-saturation-value', 'saturation', '%'],
    ];
    dcPairs.forEach(([sel, vsel, key, suffix]) => {
      const slider = overlay.querySelector(sel);
      const valEl = overlay.querySelector(vsel);
      slider.addEventListener('input', (e) => {
        valEl.textContent = e.target.value + suffix;
        decalqueSettings[key] = parseInt(e.target.value);
        updateDecalque();
      });
    });

    const dcToggles = [
      ['.odc-grayscale', 'grayscale'],
      ['.odc-invert', 'invert'],
      ['.odc-edge', 'edgeDetect'],
    ];
    dcToggles.forEach(([sel, key]) => {
      overlay.querySelector(sel).addEventListener('change', (e) => {
        decalqueSettings[key] = e.target.checked;
        updateDecalque();
      });
    });

    overlay.querySelector('.odc-auto-color').addEventListener('change', async (e) => {
      decalqueSettings.autoColor = e.target.checked;
      lastPickedColor = null;
      try { await window.AutoDraw.Settings.set('decalqueAutoColor', e.target.checked); } catch {}

      const autoPressCheckbox = overlay.querySelector('.odc-auto-press');
      if (!e.target.checked) {
        autoPressCheckbox.disabled = true;
        autoPressCheckbox.checked = false;
        decalqueSettings.autoPress = false;
        releaseAutoPress();
        try { await window.AutoDraw.Settings.set('decalqueAutoPress', false); } catch {}
      } else {
        autoPressCheckbox.disabled = false;
      }

      if (!e.target.checked) {
        const adapter = window.AutoDraw.currentAdapter;
        if (adapter && adapter.setColor) {
          setStatus(t('overlay_ready', 'Ready'), 'ready');
        }
      }
    });

    overlay.querySelector('.odc-auto-press').addEventListener('change', async (e) => {
      decalqueSettings.autoPress = e.target.checked;
      try { await window.AutoDraw.Settings.set('decalqueAutoPress', e.target.checked); } catch {}
      if (e.target.checked) {
        pressAutoPress();
      } else {
        releaseAutoPress();
      }
    });

    // Load persisted auto-color and auto-press settings
    (async () => {
      try {
        const [savedColor, savedPress] = await Promise.all([
          window.AutoDraw.Settings.get('decalqueAutoColor'),
          window.AutoDraw.Settings.get('decalqueAutoPress'),
        ]);
        if (savedColor) {
          decalqueSettings.autoColor = true;
          overlay.querySelector('.odc-auto-color').checked = true;
          overlay.querySelector('.odc-auto-press').disabled = false;
        }
        if (savedPress && savedColor) {
          decalqueSettings.autoPress = true;
          overlay.querySelector('.odc-auto-press').checked = true;
          pressAutoPress();
        }
      } catch {}
    })();

    overlay.querySelector('.odc-reposition').addEventListener('click', () => positionDecalqueCanvas());
    overlay.querySelector('.odc-reset').addEventListener('click', () => {
      decalqueSettings = { opacity: 50, scale: 100, brightness: 100, contrast: 100, saturation: 100, grayscale: false, invert: false, edgeDetect: false, hiddenColors: [], autoColor: false, autoPress: false };
      const dcPairs2 = [['.odc-opacity', 50], ['.odc-scale', 100], ['.odc-brightness', 100], ['.odc-contrast', 100], ['.odc-saturation', 100]];
      dcPairs2.forEach(([sel, val]) => { overlay.querySelector(sel).value = val; });
      overlay.querySelector('.odc-opacity-value').textContent = '50%';
      overlay.querySelector('.odc-scale-value').textContent = '100%';
      overlay.querySelector('.odc-brightness-value').textContent = '100%';
      overlay.querySelector('.odc-contrast-value').textContent = '100%';
      overlay.querySelector('.odc-saturation-value').textContent = '100%';
      dcToggles.forEach(([sel]) => { overlay.querySelector(sel).checked = false; });
      overlay.querySelector('.odc-auto-color').checked = false;
      overlay.querySelector('.odc-auto-press').checked = false;
      overlay.querySelector('.odc-auto-press').disabled = true;
      lastPickedColor = null;
      releaseAutoPress();
      updateDecalque();
    });

    // ── SPACE eyedropper + auto-color: pick color from decalque image ──
    document.addEventListener('mousemove', (e) => {
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;

      if (!decalqueSettings.autoColor || !decalqueEnabled || !decalqueCanvas || !window.AutoDraw.processedImage) return;

      const now = Date.now();
      if (now - lastAutoColorTime < 100) return;
      lastAutoColorTime = now;

      const hex = pickColorAtPosition(e.clientX, e.clientY);
      if (!hex) return;

      if (hex === lastPickedColor) return;
      lastPickedColor = hex;

      const adapter = window.AutoDraw.currentAdapter;
      if (adapter && adapter.setColor) {
        adapter.setColor(hex);
        setStatus(`${t('overlay_color_picked', 'Color:')} ${hex}`, 'ready');
        if (decalqueSettings.autoPress && autoPressActive) {
          releaseAutoPress();
          requestAnimationFrame(() => pressAutoPress());
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.code !== 'Space' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (!decalqueEnabled || !decalqueCanvas || !window.AutoDraw.processedImage) return;

      e.preventDefault();
      e.stopPropagation();

      const hex = pickColorAtPosition(lastMouseX, lastMouseY);
      if (!hex) return;

      lastPickedColor = hex;

      const adapter = window.AutoDraw.currentAdapter;
      if (adapter && adapter.setColor) {
        adapter.setColor(hex);
        setStatus(`${t('overlay_color_picked', 'Color:')} ${hex}`, 'ready');
      }
    });
  }

  function pickColorAtPosition(clientX, clientY) {
    if (!decalqueCanvas || !window.AutoDraw.processedImage) return null;

    const area = window.AutoDraw.selectedArea;
    if (!area) return null;

    const scale = decalqueSettings.scale / 100;
    const canvasW = area.width * scale;
    const canvasH = area.height * scale;

    const localX = clientX - area.x;
    const localY = clientY - area.y;
    if (localX < 0 || localY < 0 || localX > canvasW || localY > canvasH) return null;

    const img = window.AutoDraw.processedImage;
    const imgX = Math.floor((localX / canvasW) * img.width);
    const imgY = Math.floor((localY / canvasH) * img.height);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const pixel = ctx.getImageData(imgX, imgY, 1, 1).data;

    return window.AutoDraw.ColorMatcher.rgbToHex(pixel[0], pixel[1], pixel[2]);
  }

  // ── Auto Press ──

  function pressAutoPress() {
    if (!decalqueSettings.autoPress || !decalqueEnabled) return;
    autoPressActive = true;
    performAutoPress();
  }

  function releaseAutoPress() {
    autoPressActive = false;
    if (!autoPressMouseIsDown) return;
    autoPressMouseIsDown = false;

    const target = document.elementFromPoint(lastMouseX, lastMouseY);
    if (!target) return;

    const opts = { bubbles: true, cancelable: true, view: window, clientX: lastMouseX, clientY: lastMouseY, screenX: lastMouseX, screenY: lastMouseY };
    target.dispatchEvent(new PointerEvent('pointerup', { ...opts, pointerId: 1, pointerType: 'mouse', button: 0, buttons: 0 }));
    target.dispatchEvent(new MouseEvent('mouseup', { ...opts, button: 0, buttons: 0 }));
  }

  function performAutoPress() {
    if (!autoPressActive || autoPressMouseIsDown) return;

    const target = document.elementFromPoint(lastMouseX, lastMouseY);
    if (!target) return;

    const opts = { bubbles: true, cancelable: true, view: window, clientX: lastMouseX, clientY: lastMouseY, screenX: lastMouseX, screenY: lastMouseY };
    target.dispatchEvent(new PointerEvent('pointerdown', { ...opts, pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1 }));
    target.dispatchEvent(new MouseEvent('mousedown', { ...opts, button: 0, buttons: 1 }));
    autoPressMouseIsDown = true;
  }

  function makeDraggable() {
    const header = overlay.querySelector('.autodraw-header');
    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      const rect = overlay.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      overlay.style.left = (e.clientX - dragOffsetX) + 'px';
      overlay.style.top = (e.clientY - dragOffsetY) + 'px';
      overlay.style.right = 'auto';
      overlay.style.bottom = 'auto';
    });
    document.addEventListener('mouseup', () => { isDragging = false; });
  }

  function toggleMinimize() {
    isMinimized = !isMinimized;
    overlay.classList.toggle('minimized', isMinimized);
    if (isMinimized) {
      overlay.querySelector('.autodraw-minimize').innerHTML = '+';
      overlay.addEventListener('click', handleMinimizedClick);
    } else {
      overlay.querySelector('.autodraw-minimize').innerHTML = '&#8722;';
      overlay.removeEventListener('click', handleMinimizedClick);
    }
  }

  function handleMinimizedClick(e) {
    if (e.target.closest('.autodraw-header-buttons')) return;
    toggleMinimize();
  }

  // ── Decalque ──

  function enableDecalqueMode() {
    decalqueEnabled = true;
    if (window.AutoDraw.processedImage && window.AutoDraw.selectedArea) {
      showDecalque();
    }
  }

  function disableDecalqueMode() {
    decalqueEnabled = false;
    releaseAutoPress();
    removeDecalqueCanvas();
  }

  function showDecalque() {
    if (!decalqueEnabled || !window.AutoDraw.processedImage) return;
    const area = window.AutoDraw.selectedArea;
    if (!area) return;

    if (!decalqueCanvas) {
      decalqueCanvas = document.createElement('canvas');
      decalqueCanvas.id = 'autodraw-decalque-canvas';
      document.body.appendChild(decalqueCanvas);
    }

    const img = window.AutoDraw.processedImage;
    const aspectRatio = img.width / img.height;
    const maxW = area.width * (decalqueSettings.scale / 100);
    const maxH = area.height * (decalqueSettings.scale / 100);
    let w, h;
    if (aspectRatio >= 1) { w = maxW; h = maxW / aspectRatio; }
    else { h = maxH; w = maxH * aspectRatio; }

    decalqueCanvas.width = Math.round(w);
    decalqueCanvas.height = Math.round(h);
    const ctx = decalqueCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, decalqueCanvas.width, decalqueCanvas.height);

    positionDecalqueCanvas();
    applyDecalqueFilters();
  }

  function positionDecalqueCanvas() {
    if (!decalqueCanvas || !window.AutoDraw.selectedArea) return;
    const area = window.AutoDraw.selectedArea;
    decalqueCanvas.style.left = area.x + 'px';
    decalqueCanvas.style.top = area.y + 'px';
    decalqueCanvas.style.width = (area.width * (decalqueSettings.scale / 100)) + 'px';
    decalqueCanvas.style.height = (area.height * (decalqueSettings.scale / 100)) + 'px';
  }

  function applyDecalqueFilters() {
    if (!decalqueCanvas) return;
    decalqueCanvas.style.opacity = decalqueSettings.opacity / 100;
    let filters = [];
    if (decalqueSettings.brightness !== 100) filters.push(`brightness(${decalqueSettings.brightness}%)`);
    if (decalqueSettings.contrast !== 100) filters.push(`contrast(${decalqueSettings.contrast}%)`);
    if (decalqueSettings.saturation !== 100) filters.push(`saturate(${decalqueSettings.saturation}%)`);
    if (decalqueSettings.grayscale) filters.push('grayscale(100%)');
    if (decalqueSettings.invert) filters.push('invert(100%)');
    decalqueCanvas.style.filter = filters.length > 0 ? filters.join(' ') : 'none';

    if (decalqueSettings.edgeDetect && window.AutoDraw.processedImage) {
      applyEdgeDetect();
    }
  }

  function applyEdgeDetect() {
    if (!decalqueCanvas) return;
    const ctx = decalqueCanvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, decalqueCanvas.width, decalqueCanvas.height);
    const data = imageData.data;
    const w = decalqueCanvas.width;
    const h = decalqueCanvas.height;
    const out = new Uint8ClampedArray(data);

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        const idxL = (y * w + (x - 1)) * 4;
        const idxR = (y * w + (x + 1)) * 4;
        const idxU = ((y - 1) * w + x) * 4;
        const idxD = ((y + 1) * w + x) * 4;

        const gx = -data[idxL] + data[idxR];
        const gy = -data[idxU] + data[idxD];
        const mag = Math.min(255, Math.sqrt(gx * gx + gy * gy));
        out[idx] = out[idx + 1] = out[idx + 2] = mag;
        out[idx + 3] = data[idx + 3];
      }
    }

    const outImageData = new ImageData(out, w, h);
    ctx.putImageData(outImageData, 0, 0);
  }

  function removeDecalqueCanvas() {
    if (decalqueCanvas) {
      decalqueCanvas.remove();
      decalqueCanvas = null;
    }
  }

  function updateDecalque() {
    if (decalqueEnabled) showDecalque();
  }

  function setDecalqueImage(img) {
    if (!decalqueEnabled) return;
    showDecalque();
  }

  // ── Public API ──

  function hideForDrawing() {
    if (!overlay) return;
    overlay.style.setProperty('pointer-events', 'none', 'important');
    overlay.style.setProperty('visibility', 'hidden', 'important');
    overlay.style.setProperty('opacity', '0', 'important');
  }

  function showAfterDrawing() {
    if (!overlay) return;
    overlay.style.removeProperty('pointer-events');
    overlay.style.removeProperty('visibility');
    overlay.style.removeProperty('opacity');
  }

  function setStatus(text, type = 'ready') {
    if (!overlay) return;
    const dot = overlay.querySelector('.status-dot');
    const txt = overlay.querySelector('.status-text');
    dot.className = 'status-dot';
    if (type === 'drawing') dot.classList.add('drawing');
    if (type === 'error') dot.classList.add('error');
    txt.textContent = text;
  }

  function setProgress(progress, drawn, total) {
    if (!overlay) return;
    const container = overlay.querySelector('.autodraw-progress');
    const fill = overlay.querySelector('.autodraw-progress-fill');
    const text = overlay.querySelector('.autodraw-progress-text');
    container.style.display = 'block';
    fill.style.width = progress + '%';
    text.textContent = `${progress}% (${drawn}/${total})`;
  }

  function hideProgress() {
    if (!overlay) return;
    overlay.querySelector('.autodraw-progress').style.display = 'none';
  }

  function setDrawingState(isDrawing) {
    if (!overlay) return;
    overlay.querySelector('.autodraw-start').style.display = isDrawing ? 'none' : 'flex';
    overlay.querySelector('.autodraw-stop').style.display = isDrawing ? 'flex' : 'none';
    overlay.querySelector('.autodraw-speed').disabled = isDrawing;
    overlay.querySelector('.autodraw-resolution').disabled = isDrawing;
  }

  function getSpeed() {
    if (!overlay) return 80;
    return parseInt(overlay.querySelector('.autodraw-speed').value);
  }

  function getResolution() {
    if (!overlay) return 64;
    return parseInt(overlay.querySelector('.autodraw-resolution').value);
  }

  function isDecalqueMode() { return decalqueEnabled; }

  function applyDecalqueColorFilter(hiddenColors) {
    decalqueSettings.hiddenColors = hiddenColors;
    updateDecalque();
  }

  return {
    create,
    remove,
    setStatus,
    setProgress,
    hideProgress,
    setDrawingState,
    getSpeed,
    getResolution,
    hideForDrawing,
    showAfterDrawing,
    setDecalqueImage,
    isDecalqueMode,
    applyDecalqueColorFilter,
    updateDecalque,
    isActive: () => overlay !== null,
  };
})();
