document.addEventListener('DOMContentLoaded', async () => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const t = (key, fb) => window.AutoDraw.I18n.t(key, fb);

  const dropZone = $('#dropZone');
  const fileInput = $('#fileInput');
  const previewSection = $('#previewSection');
  const previewCanvas = $('#previewCanvas');
  const previewDimensions = $('#previewDimensions');
  const previewColors = $('#previewColors');
  const resolutionSlider = $('#resolution');
  const resolutionValue = $('#resolutionValue');
  const speedSlider = $('#speed');
  const speedValue = $('#speedValue');
  const colorDelaySlider = $('#colorDelay');
  const colorDelayValue = $('#colorDelayValue');
  const drawModeSelect = $('#drawMode');
  const antiAliasToggle = $('#antiAlias');
  const autoStartToggle = $('#autoStart');
  const openOverlayBtn = $('#openOverlay');
  const statusDot = $('.status-dot');
  const statusText = $('.status-text');
  const themeToggle = $('#themeToggle');
  const exportBtn = $('#exportSettings');
  const importBtn = $('#importSettings');
  const importFileInput = $('#importFileInput');
  const paletteGrid = $('#paletteGrid');
  const paletteInfo = $('#paletteInfo');
  const logContainer = $('#logContainer');
  const clearLogsBtn = $('#clearLogs');
  const languageSelect = $('#language');

  let currentFile = null;
  let settings = await window.AutoDraw.Settings.load();

  // ── I18n ──

  window.AutoDraw.I18n.setLanguage(settings.language || 'en');
  window.AutoDraw.I18n.applyTranslations();

  languageSelect.value = settings.language || 'en';
  languageSelect.addEventListener('change', async (e) => {
    settings.language = e.target.value;
    await window.AutoDraw.Settings.save(settings);
    window.AutoDraw.I18n.setLanguage(settings.language);
    window.AutoDraw.I18n.applyTranslations();
    refreshDynamicStrings();
  });

  function refreshDynamicStrings() {
    paletteInfo.textContent = t('no_palette');
    checkSiteSupport();
    loadPalette();
  }

  // ── Theme ──

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const moon = themeToggle.querySelector('.icon-moon');
    const sun = themeToggle.querySelector('.icon-sun');
    if (theme === 'light') {
      moon.style.display = 'none';
      sun.style.display = 'block';
    } else {
      moon.style.display = 'block';
      sun.style.display = 'none';
    }
  }

  applyTheme(settings.theme || 'dark');

  themeToggle.addEventListener('click', async () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    settings.theme = next;
    await window.AutoDraw.Settings.save(settings);
  });

  // ── Tabs ──

  $$('.nav-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.nav-btn[data-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      $$('.tab-panel').forEach(p => p.classList.remove('active'));
      $(`#tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  // ── Site Support ──

  async function checkSiteSupport() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url) {
        statusDot.classList.add('error');
        statusText.textContent = t('status_no_tab');
        return;
      }
      const hostname = new URL(tab.url).hostname;
      const supported = ['gartic.io', 'garticphone.com', 'sketch.io', 'drawize.com'];
      const isSupported = supported.some(s => hostname.includes(s));

      if (!isSupported) {
        statusDot.classList.add('error');
        statusText.textContent = `${t('status_not_supported')} ${hostname}`;
        openOverlayBtn.disabled = true;
        return;
      }

      try {
        const resp = await Promise.race([
          chrome.tabs.sendMessage(tab.id, { action: 'getAdapterStatus' }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
        ]);
        if (resp && resp.canvasFound) {
          statusDot.classList.add('ready');
          statusText.textContent = `${t('status_ready')} ${hostname}`;
          openOverlayBtn.disabled = false;
        } else {
          statusDot.classList.add('ready');
          statusText.textContent = `${t('status_supported')} ${hostname}`;
          openOverlayBtn.disabled = false;
        }
      } catch (e) {
        statusDot.classList.add('ready');
        statusText.textContent = `${t('status_supported')} ${hostname}`;
        openOverlayBtn.disabled = false;
      }
    } catch {
      statusDot.classList.add('error');
      statusText.textContent = t('status_error_site');
    }
  }

  // ── Upload ──

  function setupDragAndDrop() {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });
  }

  async function handleFile(file) {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert(t('alert_no_image'));
      return;
    }
    currentFile = file;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      if (file.type.startsWith('video/')) {
        const img = await extractFirstFrame(dataUrl);
        processImage(img);
      } else {
        const img = new Image();
        img.onload = () => processImage(img);
        img.src = dataUrl;
      }
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) chrome.tabs.sendMessage(tab.id, { action: 'loadImage', dataUrl });
        chrome.storage.local.set({ autodraw_image: dataUrl });
      } catch (err) {
        console.error('AutoDraw: Failed to send image:', err);
      }
    };
    reader.readAsDataURL(file);
  }

  function extractFirstFrame(videoUrl) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.muted = true;
      video.playsInline = true;
      video.onloadeddata = () => { video.currentTime = 1; };
      video.onseeked = () => {
        const c = document.createElement('canvas');
        c.width = video.videoWidth;
        c.height = video.videoHeight;
        c.getContext('2d').drawImage(video, 0, 0);
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = c.toDataURL();
      };
      video.onerror = reject;
    });
  }

  function processImage(img) {
    const resolution = parseInt(resolutionSlider.value);
    const aspectRatio = img.width / img.height;
    let w, h;
    if (aspectRatio >= 1) { w = resolution; h = Math.round(resolution / aspectRatio); }
    else { h = resolution; w = Math.round(resolution * aspectRatio); }

    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    const ctx = tmp.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, w, h);

    previewCanvas.width = w * 4;
    previewCanvas.height = h * 4;
    const pctx = previewCanvas.getContext('2d');
    pctx.imageSmoothingEnabled = false;
    pctx.drawImage(tmp, 0, 0, previewCanvas.width, previewCanvas.height);

    previewDimensions.textContent = `${w}x${h}`;
    previewSection.style.display = 'block';

    const imageData = ctx.getImageData(0, 0, w, h);
    const colors = new Set();
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] >= 128) colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);
    }
    previewColors.textContent = `${colors.size} ${t('colors_unit')}`;
  }

  // ── Sliders ──

  function setupSliders() {
    speedSlider.value = settings.speed || 50;
    speedValue.textContent = speedSlider.value;
    resolutionSlider.value = settings.resolution || 64;
    resolutionValue.textContent = resolutionSlider.value;
    colorDelaySlider.value = settings.colorDelay || 50;
    colorDelayValue.textContent = colorDelaySlider.value;
    drawModeSelect.value = settings.drawMode || 'zigzag';
    antiAliasToggle.checked = settings.antiAlias || false;
    autoStartToggle.checked = settings.autoStart || false;

    speedSlider.addEventListener('input', async (e) => {
      speedValue.textContent = e.target.value;
      settings.speed = parseInt(e.target.value);
      await window.AutoDraw.Settings.save(settings);
      if (currentFile) handleFile(currentFile);
    });

    resolutionSlider.addEventListener('input', async (e) => {
      resolutionValue.textContent = e.target.value;
      settings.resolution = parseInt(e.target.value);
      await window.AutoDraw.Settings.save(settings);
      if (currentFile) handleFile(currentFile);
    });

    colorDelaySlider.addEventListener('input', async (e) => {
      colorDelayValue.textContent = e.target.value;
      settings.colorDelay = parseInt(e.target.value);
      await window.AutoDraw.Settings.save(settings);
    });

    drawModeSelect.addEventListener('change', async (e) => {
      settings.drawMode = e.target.value;
      await window.AutoDraw.Settings.save(settings);
    });

    antiAliasToggle.addEventListener('change', async (e) => {
      settings.antiAlias = e.target.checked;
      await window.AutoDraw.Settings.save(settings);
    });

    autoStartToggle.addEventListener('change', async (e) => {
      settings.autoStart = e.target.checked;
      await window.AutoDraw.Settings.save(settings);
    });
  }

  // ── Palette ──

  async function loadPalette() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;

      let palette = null;
      try {
        const resp = await Promise.race([
          new Promise((resolve) => {
            chrome.tabs.sendMessage(tab.id, { action: 'getPalette' }, (response) => {
              resolve(response);
            });
          }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
        ]);
        if (resp && resp.palette && resp.palette.length > 0) {
          palette = resp.palette;
        }
      } catch (e) {
        // Content script not loaded — use defaults
      }

      // Fallback to default palette from constants
      if (!palette || palette.length === 0) {
        palette = window.AutoDraw.Config.DEFAULT_PALETTE;
      }

      renderPalette(palette);
    } catch {}
  }

  function renderPalette(palette) {
    paletteGrid.innerHTML = '';
    paletteInfo.textContent = `${palette.length} ${t('colors_unit')}`;

    palette.forEach(color => {
      const swatch = document.createElement('div');
      swatch.className = 'palette-swatch';
      const hex = rgbToHex(color[0], color[1], color[2]);
      swatch.style.backgroundColor = `rgb(${color[0]},${color[1]},${color[2]})`;
      swatch.title = hex;
      paletteGrid.appendChild(swatch);
    });
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  // ── Export / Import ──

  exportBtn.addEventListener('click', () => window.AutoDraw.Settings.exportSettings());

  importBtn.addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      settings = await window.AutoDraw.Settings.importSettings(file);
      applyTheme(settings.theme || 'dark');
      window.AutoDraw.I18n.setLanguage(settings.language || 'en');
      window.AutoDraw.I18n.applyTranslations();
      languageSelect.value = settings.language || 'en';
      setupSliders();
      refreshDynamicStrings();
      addLog(t('settings_imported'), 'success');
    } catch (err) {
      addLog(t('error_import') + err.message, 'error');
    }
    importFileInput.value = '';
  });

  // ── Logs ──

  function addLog(text, type = '') {
    const empty = logContainer.querySelector('.log-empty');
    if (empty) empty.remove();
    const entry = document.createElement('div');
    entry.className = 'log-entry' + (type ? ` log-${type}` : '');
    const time = new Date().toLocaleTimeString(settings.language === 'pt' ? 'pt-BR' : settings.language === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    entry.textContent = `[${time}] ${text}`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  clearLogsBtn.addEventListener('click', () => {
    logContainer.innerHTML = `<p class="log-empty" data-i18n="no_logs">${t('no_logs')}</p>`;
  });

  // Listen for log messages from content script
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'autodrawLog') {
      addLog(msg.text, msg.type || '');
    }
  });

  // ── Open Overlay ──

  async function injectContentScripts(tabId) {
    const files = [
      'shared/constants.js',
      'shared/i18n.js',
      'shared/color-matcher.js',
      'shared/image-processor.js',
      'shared/drawing-engine.js',
      'content/site-adapters/gartic.js',
      'content/site-adapters/gartic-phone.js',
      'content/site-adapters/sketch.js',
      'content/site-adapters/drawize.js',
      'content/area-selector.js',
      'content/overlay.js',
      'content/content.js',
    ];
    for (const file of files) {
      await chrome.scripting.executeScript({ target: { tabId }, files: [file] });
    }
    await chrome.scripting.insertCSS({ target: { tabId }, files: ['content/overlay.css', 'content/area-selector.css'] });
  }

  openOverlayBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;

      let response;
      try {
        response = await Promise.race([
          chrome.tabs.sendMessage(tab.id, { action: 'toggleOverlay' }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2000))
        ]);
      } catch (e) {
        statusDot.className = 'status-dot checking';
        statusText.textContent = t('overlay_drawing');
        try {
          await injectContentScripts(tab.id);
          await new Promise(r => setTimeout(r, 200));
          response = await chrome.tabs.sendMessage(tab.id, { action: 'toggleOverlay' });
        } catch (e2) {
          statusDot.className = 'status-dot error';
          statusText.textContent = e2.message;
          return;
        }
      }

      if (response && response.success) {
        window.close();
      } else {
        statusDot.className = 'status-dot error';
        statusText.textContent = e.message || 'Error';
      }
    } catch (err) {
      statusDot.className = 'status-dot error';
      statusText.textContent = err.message;
    }
  });

  // ── Init ──

  checkSiteSupport();
  setupDragAndDrop();
  setupSliders();
  loadPalette();
});
