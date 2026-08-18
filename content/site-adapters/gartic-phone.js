window.AutoDraw = window.AutoDraw || {};

window.AutoDraw.GarticPhoneAdapter = (() => {
  let canvas = null;
  let drawingContainer = null;
  let palette = [];
  let tools = {};
  let toolButtons = [];
  let isInitialized = false;

  function init() {
    const result = findCanvas();
    if (!result) {
      console.warn('AutoDraw: Canvas not found on Gartic Phone');
      return false;
    }
    canvas = result.canvas;
    drawingContainer = result.container;

    extractPalette();
    findTools();
    initColorInput();
    isInitialized = true;
    console.log('AutoDraw: Gartic Phone adapter initialized');
    console.log('AutoDraw: Canvas:', canvas.width + 'x' + canvas.height, 'class:', canvas.className);
    console.log('AutoDraw: Container:', drawingContainer?.className);
    console.log('AutoDraw: Tools found:', Object.keys(tools));
    return true;
  }

  function findCanvas() {
    const allCanvases = Array.from(document.querySelectorAll('canvas'));
    console.log('AutoDraw: Found', allCanvases.length, 'canvases');

    const candidates = allCanvases.map(c => {
      const rect = c.getBoundingClientRect();
      const parent = c.parentElement;
      const grandparent = parent?.parentElement;
      const isDrawingCanvas = (
        parent?.className?.includes('drawing') ||
        grandparent?.className?.includes('drawing') ||
        parent?.className?.includes('core') ||
        grandparent?.className?.includes('core') ||
        c.width >= 300
      );
      const isWatermark = (
        parent?.className?.includes('watermark') ||
        grandparent?.className?.includes('watermark')
      );
      const isTimer = (
        parent?.className?.includes('time') ||
        parent?.className?.includes('timer')
      );

      return {
        canvas: c,
        container: parent,
        rect: rect,
        area: c.width * c.height,
        isDrawingCanvas: isDrawingCanvas,
        isWatermark: isWatermark,
        isTimer: isTimer,
      };
    });

    console.log('AutoDraw: Canvas candidates:');
    candidates.forEach((c, i) => {
      console.log(`  [${i}] ${c.canvas.width}x${c.canvas.height} area=${c.area} drawing=${c.isDrawingCanvas} watermark=${c.isWatermark} timer=${c.isTimer} class="${c.canvas.className}" parent="${c.canvas.parentElement?.className}"`);
    });

    const drawingCanvas = candidates.find(c => c.isDrawingCanvas && !c.isWatermark && !c.isTimer);
    if (drawingCanvas) {
      console.log('AutoDraw: Selected drawing canvas:', drawingCanvas.canvas.width + 'x' + drawingCanvas.canvas.height);
      return { canvas: drawingCanvas.canvas, container: drawingCanvas.container };
    }

    const biggest = candidates.sort((a, b) => b.area - a.area)[0];
    if (biggest) {
      console.log('AutoDraw: Fallback to biggest canvas:', biggest.canvas.width + 'x' + biggest.canvas.height);
      return { canvas: biggest.canvas, container: biggest.container };
    }

    return null;
  }

  function extractPalette() {
    palette = [];
    const seen = new Set();

    // Try many selectors to find color swatches
    const colorSelectors = [
      '[class*="colors"] [class*="color"]',
      '[class*="palette"] [class*="color"]',
      '[class*="ColorPicker"] [class*="color"]',
      '[class*="colorPicker"] [class*="color"]',
      '.colors .color',
      '.palette .color',
      '.color-palette .color',
      '[class*="tool"] [style*="background-color"]',
      '[class*="tool"] [style*="background"]',
    ];

    for (const selector of colorSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        // Skip input elements and containers
        if (el.tagName === 'INPUT' || el.tagName === 'CANVAS') return;
        if (el.children.length > 3) return; // likely a container

        const color = extractColorFromElement(el);
        if (color) {
          const key = `${color[0]},${color[1]},${color[2]}`;
          if (!seen.has(key)) {
            seen.add(key);
            palette.push(color);
          }
        }
      });
      if (palette.length >= 10) break; // found enough colors
    }

    // Also try to find colors from data attributes on any element
    if (palette.length < 5) {
      document.querySelectorAll('[data-color], [data-value]').forEach(el => {
        const dataColor = el.getAttribute('data-color') || el.getAttribute('data-value');
        if (dataColor && dataColor.startsWith('#')) {
          const rgb = window.AutoDraw.ColorMatcher.hexToRgb(dataColor);
          if (rgb) {
            const key = `${rgb[0]},${rgb[1]},${rgb[2]}`;
            if (!seen.has(key)) {
              seen.add(key);
              palette.push(rgb);
            }
          }
        }
      });
    }

    // Last resort: fallback palette
    if (palette.length === 0) {
      palette = [
        [0, 0, 0], [255, 255, 255], [255, 0, 0], [0, 128, 0],
        [0, 0, 255], [255, 255, 0], [255, 128, 0], [128, 0, 255],
        [255, 0, 255], [0, 255, 255], [128, 128, 128], [128, 0, 0],
        [0, 100, 0], [0, 0, 128], [255, 192, 203], [210, 180, 140],
      ];
    }

    window.AutoDraw.ColorMatcher.setPalette(palette);
    console.log('AutoDraw: Extracted palette with', palette.length, 'colors:', palette.map(c => `[${c}]`).join(', '));
    return palette;
  }

  function extractColorFromElement(el) {
    const style = window.getComputedStyle(el);
    const bgColor = style.backgroundColor;

    if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
      const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
      }
    }

    const dataColor = el.getAttribute('data-color') || el.getAttribute('data-value');
    if (dataColor) {
      if (dataColor.startsWith('#')) {
        return window.AutoDraw.ColorMatcher.hexToRgb(dataColor);
      }
      const match = dataColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
      }
    }

    return null;
  }

  function findTools() {
    tools = {};
    toolButtons = [];

    const allClickable = document.querySelectorAll('button, [role="button"], [class*="tool"], [class*="Tool"], svg[class*="tool"], svg[class*="Tool"]');
    console.log('AutoDraw: Scanning', allClickable.length, 'elements for tools');

    for (const el of allClickable) {
      const cls = (el.className?.baseVal || el.className || '').toString();
      const title = (el.title || el.getAttribute('aria-label') || '').toLowerCase();
      const id = (el.id || '').toLowerCase();
      const text = (el.textContent || '').trim().toLowerCase();
      const svg = el.tagName === 'svg' || el.tagName === 'path';
      const allText = (cls + ' ' + title + ' ' + id + ' ' + text).toLowerCase();
      const inner = el.innerHTML?.toLowerCase() || '';

      if (allText.includes('fill') || allText.includes('bucket') || inner.includes('fill') || inner.includes('bucket')) {
        if (!tools.fill) {
          tools.fill = el;
          toolButtons.push(el);
          console.log('AutoDraw: Found FILL tool:', el.tagName, cls || title || id);
        }
      }
      if (allText.includes('pencil') || allText.includes('pen ') || allText.includes('draw') || allText.includes('brush')) {
        if (!tools.pencil) {
          tools.pencil = el;
          toolButtons.push(el);
          console.log('AutoDraw: Found PENCIL tool:', el.tagName, cls || title || id);
        }
      }
      if (allText.includes('eraser') || allText.includes('erase') || allText.includes('rubber')) {
        if (!tools.eraser) {
          tools.eraser = el;
          toolButtons.push(el);
          console.log('AutoDraw: Found ERASER tool:', el.tagName, cls || title || id);
        }
      }
      if (allText.includes('line') && !allText.includes('linear')) {
        if (!tools.line) {
          tools.line = el;
          toolButtons.push(el);
          console.log('AutoDraw: Found LINE tool:', el.tagName, cls || title || id);
        }
      }
    }

    if (Object.keys(tools).length === 0) {
      console.log('AutoDraw: No tools found by text scan. Dumping all clickable elements near canvas:');
      if (drawingContainer) {
        const nearby = drawingContainer.parentElement?.querySelectorAll('button, [role="button"], [class*="tool"]') || [];
        nearby.forEach((el, i) => {
          console.log(`  [${i}] tag=${el.tagName} class="${el.className}" id="${el.id}" title="${el.title}"`);
        });
      }
    }

    return tools;
  }

  function setTool(toolName) {
    if (tools[toolName]) {
      tools[toolName].click();
      console.log('AutoDraw: Activated tool:', toolName);
      return true;
    }
    console.warn('AutoDraw: Tool not found:', toolName, '- available:', Object.keys(tools));
    return false;
  }

  function getTools() {
    return Object.keys(tools);
  }

  let colorInputElement = null;
  let colorSwatches = [];
  let colorSwatchMap = {};
  let colorDispatch = null;
  let colorFormat = null;

  function findReactFiber(el) {
    const key = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
    return key ? el[key] : null;
  }

  function findReactProps(el) {
    const key = Object.keys(el).find(k => k.startsWith('__reactProps$'));
    return key ? el[key] : null;
  }

  function isColorString(val) {
    if (typeof val !== 'string') return false;
    return /^#[0-9a-fA-F]{3,8}$/.test(val) || /^rgb/.test(val) || /^hsl/.test(val);
  }

  function isColorObject(val) {
    if (!val || typeof val !== 'object' || Array.isArray(val)) return false;
    const hasRGB = ('r' in val && 'g' in val && 'b' in val);
    const hasRGBAlt = ('red' in val && 'green' in val && 'blue' in val);
    const hasHex = 'hex' in val || 'color' in val;
    return hasRGB || hasRGBAlt || hasHex;
  }

  function colorValueToHex(val) {
    if (typeof val === 'string') return val;
    if (val && typeof val === 'object') {
      if (val.hex && typeof val.hex === 'string') return val.hex;
      if (val.color && typeof val.color === 'string') return val.color;
      if (typeof val.r === 'number' && typeof val.g === 'number' && typeof val.b === 'number') {
        return window.AutoDraw.ColorMatcher.rgbToHex(val.r, val.g, val.b);
      }
    }
    return null;
  }

  function walkFiber(fiber, visitor, depth, maxDepth, visited) {
    if (!fiber || depth > maxDepth || visited.has(fiber)) return;
    visited.add(fiber);
    visitor(fiber, depth);
    if (fiber.child) walkFiber(fiber.child, visitor, depth + 1, maxDepth, visited);
    if (fiber.sibling) walkFiber(fiber.sibling, visitor, depth, maxDepth, visited);
  }

  function findColorDispatchFromElement(el) {
    for (let depth = 0; depth < 40 && el; depth++) {
      const fiber = findReactFiber(el);
      if (fiber) {
        let current = fiber;
        for (let fd = 0; fd < 20 && current; fd++) {
          let hook = current.memoizedState;
          let hookIdx = 0;
          while (hook) {
            if (hook.queue && typeof hook.queue.dispatch === 'function') {
              const val = hook.memoizedState !== undefined ? hook.memoizedState : hook.queue.lastRenderedState;
              if (isColorString(val)) {
                console.log('AutoDraw: Found string color dispatch depth=' + fd + ' hook=' + hookIdx + ' val=' + val);
                return { dispatch: hook.queue.dispatch, format: 'string', currentValue: val };
              }
              if (isColorObject(val)) {
                console.log('AutoDraw: Found object color dispatch depth=' + fd + ' hook=' + hookIdx + ' val=' + JSON.stringify(val));
                return { dispatch: hook.queue.dispatch, format: 'object', currentValue: val };
              }
            }
            hook = hook.next;
            hookIdx++;
          }
          current = current.return;
        }
      }
      el = el.parentElement;
    }
    return null;
  }

  function initColorInput() {
    colorInputElement = null;
    colorSwatches = [];
    colorSwatchMap = {};
    colorDispatch = null;
    colorFormat = null;

    colorInputElement = document.querySelector('input[type="color"]');
    console.log('AutoDraw: input[type=color]:', colorInputElement ? colorInputElement.value : 'NOT FOUND');

    const fromInput = findColorDispatchFromElement(colorInputElement || document.body);
    if (fromInput) {
      console.log('AutoDraw: Color method: react-dispatch (from input) format=' + fromInput.format);
      colorDispatch = fromInput.dispatch;
      colorFormat = fromInput.format;
      return true;
    }

    console.log('AutoDraw: Trying canvas path...');
    if (canvas) {
      const fromCanvas = findColorDispatchFromElement(canvas);
      if (fromCanvas) {
        console.log('AutoDraw: Color method: react-dispatch (from canvas) format=' + fromCanvas.format);
        colorDispatch = fromCanvas.dispatch;
        colorFormat = fromCanvas.format;
        return true;
      }
    }

    console.log('AutoDraw: Searching entire React root...');
    const rootEl = document.getElementById('root') || document.getElementById('app') || document.body;
    const rootFiber = findReactFiber(rootEl);
    if (rootFiber) {
      const found = [];
      const visited = new Set();
      walkFiber(rootFiber, (fiber, depth) => {
        let hook = fiber.memoizedState;
        let hookIdx = 0;
        while (hook) {
          if (hook.queue && typeof hook.queue.dispatch === 'function') {
            const val = hook.memoizedState !== undefined ? hook.memoizedState : hook.queue.lastRenderedState;
            if (isColorString(val) || isColorObject(val)) {
              const name = fiber.type?.name || fiber.type?.displayName || '';
              const fmt = isColorString(val) ? 'string' : 'object';
              found.push({ depth, hookIdx, val, name, dispatch: hook.queue.dispatch, format: fmt });
              console.log('AutoDraw: Root found color: depth=' + depth + ' hook=' + hookIdx + ' fmt=' + fmt + ' val=' + (typeof val === 'object' ? JSON.stringify(val) : val) + ' comp=' + name);
            }
          }
          hook = hook.next;
          hookIdx++;
        }
      }, 0, 60, visited);

      if (found.length > 0) {
        const best = found.find(f => f.name && (f.name.toLowerCase().includes('color') || f.name.toLowerCase().includes('draw') || f.name.toLowerCase().includes('paint'))) || found[0];
        console.log('AutoDraw: Best match:', best.name, best.format, typeof best.val === 'object' ? JSON.stringify(best.val) : best.val);
        colorDispatch = best.dispatch;
        colorFormat = best.format;
        return true;
      }
    }

    console.log('AutoDraw: Trying palette swatch click...');
    buildSwatchMap();
    if (Object.keys(colorSwatchMap).length > 0) {
      console.log('AutoDraw: Color method: swatch-click (' + colorSwatches.length + ' swatches)');
      return true;
    }

    console.warn('AutoDraw: No color method found');
    return !!colorInputElement;
  }

  function buildSwatchMap() {
    colorSwatches = [];
    colorSwatchMap = {};

    const selectors = [
      '.colors .color', '.palette .color', '.color-palette .color',
      '[class*="colors"] > div', '[class*="palette"] > div',
      '[class*="colorPicker"] [class*="color"]',
      '[class*="ColorPicker"] [class*="color"]',
      '[class*="tool"] [style*="background"]',
    ];

    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      els.forEach(el => {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          const match = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          if (match) {
            const r = parseInt(match[1]), g = parseInt(match[2]), b = parseInt(match[3]);
            const hex = window.AutoDraw.ColorMatcher.rgbToHex(r, g, b);
            colorSwatches.push({ el, hex, rgb: [r, g, b] });
            colorSwatchMap[hex] = el;
          }
        }
        const dataColor = el.getAttribute('data-color') || el.getAttribute('data-value');
        if (dataColor && dataColor.startsWith('#')) {
          colorSwatches.push({ el, hex: dataColor, rgb: window.AutoDraw.ColorMatcher.hexToRgb(dataColor) });
          colorSwatchMap[dataColor] = el;
        }
      });
      if (colorSwatches.length > 0) break;
    }

    if (colorInputElement) {
      colorSwatches.push({ el: colorInputElement, hex: colorInputElement.value, rgb: window.AutoDraw.ColorMatcher.hexToRgb(colorInputElement.value), isInput: true });
    }

    console.log('AutoDraw: Built swatch map with', colorSwatches.length, 'entries');
  }

  let injectedSwatch = null;

  function findSwatchContainer() {
    if (!drawingContainer) return null;
    const selectors = [
      '[class*="colors"]', '[class*="palette"]', '[class*="colorPicker"]', '[class*="ColorPicker"]',
      '[class*="toolbar"] [class*="color"]', '[class*="drawing"] [class*="color"]',
    ];
    for (const sel of selectors) {
      const el = drawingContainer.closest(sel) || drawingContainer.parentElement?.closest(sel) || document.querySelector(sel);
      if (el) return el;
    }
    for (const sw of colorSwatches) {
      if (!sw.isInput && sw.el.parentElement) return sw.el.parentElement;
    }
    return null;
  }

  function injectSwatch(hexColor) {
    const rgb = window.AutoDraw.ColorMatcher.hexToRgb(hexColor);
    if (!rgb) return false;

    const baseSwatch = colorSwatches.find(s => !s.isInput);
    const container = baseSwatch?.el.parentElement || findSwatchContainer();
    if (!container) return false;

    try {
      let swatch;
      if (baseSwatch) {
        swatch = baseSwatch.el.cloneNode(true);
      } else {
        swatch = document.createElement('div');
        swatch.className = 'color';
      }

      swatch.style.backgroundColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      swatch.style.setProperty('background-color', `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
      swatch.setAttribute('data-color', hexColor);
      swatch.setAttribute('data-value', hexColor);
      swatch.dataset.color = hexColor;
      swatch.title = hexColor;

      if (baseSwatch && baseSwatch.el.children.length > 0) {
        for (const child of swatch.children) {
          child.style.backgroundColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
        }
      }

      container.appendChild(swatch);
      injectedSwatch = swatch;

      simulateReactClick(swatch);
      console.log('AutoDraw: Injected swatch and clicked:', hexColor);
      return true;
    } catch (e) {
      console.warn('AutoDraw: Swatch injection failed:', e);
      return false;
    }
  }

  function removeInjectedSwatch() {
    if (injectedSwatch && injectedSwatch.isConnected) {
      injectedSwatch.remove();
      injectedSwatch = null;
    }
  }

  function buildDispatchArgs(hexColor, format) {
    if (format === 'object') {
      const rgb = window.AutoDraw.ColorMatcher.hexToRgb(hexColor);
      if (rgb) {
        return { r: rgb[0], g: rgb[1], b: rgb[2], a: 1 };
      }
    }
    return hexColor;
  }

  function simulateReactClick(el) {
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, screenX: x, screenY: y };
    el.dispatchEvent(new PointerEvent('pointerdown', { ...opts, pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1 }));
    el.dispatchEvent(new MouseEvent('mousedown', { ...opts, button: 0, buttons: 1 }));
    el.dispatchEvent(new PointerEvent('pointerup', { ...opts, pointerId: 1, pointerType: 'mouse', button: 0, buttons: 0 }));
    el.dispatchEvent(new MouseEvent('mouseup', { ...opts, button: 0, buttons: 0 }));
    el.dispatchEvent(new MouseEvent('click', { ...opts, button: 0 }));
  }

  function setColor(hexColor) {
    const rgb = window.AutoDraw.ColorMatcher.hexToRgb(hexColor);
    if (!rgb) return false;

    removeInjectedSwatch();

    // 1. Use input[type=color] with native setter + React onChange (most reliable)
    if (colorInputElement) {
      try {
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(colorInputElement, hexColor);
        colorInputElement.dispatchEvent(new Event('input', { bubbles: true }));
        colorInputElement.dispatchEvent(new Event('change', { bubbles: true }));

        const reactProps = findReactProps(colorInputElement);
        if (reactProps && typeof reactProps.onChange === 'function') {
          reactProps.onChange({ target: colorInputElement, currentTarget: colorInputElement, type: 'change', preventDefault() {}, stopPropagation() {} });
        }
        return true;
      } catch (e) {
        console.warn('AutoDraw: input color setter failed:', e);
      }
    }

    // 2. Try clicking an exact matching palette swatch with React-compatible events
    for (const swatch of colorSwatches) {
      if (swatch.hex === hexColor && !swatch.isInput) {
        try {
          simulateReactClick(swatch.el);
          return true;
        } catch (e) {}
      }
    }

    // 3. Try exact swatch from DOM with data-color attribute
    const exactEl = document.querySelector(`[data-color="${hexColor}"], [data-value="${hexColor}"]`);
    if (exactEl) {
      try {
        simulateReactClick(exactEl);
        return true;
      } catch (e) {}
    }

    // 4. Inject a swatch with React-compatible events
    if (injectSwatch(hexColor)) {
      return true;
    }

    // 5. React dispatch (unreliable — some hooks don't control visible color)
    if (colorDispatch) {
      try {
        const arg = buildDispatchArgs(hexColor, colorFormat);
        colorDispatch(arg);
        return true;
      } catch (e) {
        console.warn('AutoDraw: dispatch failed:', e);
      }
    }

    console.warn('AutoDraw: All color methods failed. hex:', hexColor);
    return false;
  }

  function setColorViaRGBInputs(hexColor) {
    const rgb = window.AutoDraw.ColorMatcher.hexToRgb(hexColor);
    if (!rgb) return false;

    const inputs = Array.from(document.querySelectorAll('input[type="number"], input[type="text"]'));
    const candidates = inputs.filter(i => {
      const min = Number(i.min || -1), max = Number(i.max || 256);
      return min >= 0 && max <= 256 && (i.maxLength === 3 || max === 255);
    });

    if (candidates.length < 3) return false;

    const ordered = [rgb[0], rgb[1], rgb[2]];
    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    for (let i = 0; i < 3; i++) {
      try {
        nativeSetter.call(candidates[i], String(ordered[i]));
        candidates[i].dispatchEvent(new Event('input', { bubbles: true }));
        candidates[i].dispatchEvent(new Event('change', { bubbles: true }));
      } catch (e) {}
    }
    console.log('AutoDraw: Set RGB inputs:', ordered.join(','));
    return true;
  }

  function dumpInputs() {
    console.log('AutoDraw: === Input Dump ===');
    const all = document.querySelectorAll('input');
    all.forEach((input, i) => {
      console.log(`  [${i}] type=${input.type} name="${input.name}" value="${input.value}" min="${input.min}" max="${input.max}" class="${input.className}"`);
    });
    console.log('AutoDraw: === End Input Dump ===');
  }

  function prepareForDrawing() {
    console.log('AutoDraw: prepareForDrawing skipped (unsafe)');
  }

  function restoreAfterDrawing() {
    removeInjectedSwatch();
    console.log('AutoDraw: restoreAfterDrawing done');
  }

  function getCanvas() { return canvas; }
  function getPalette() { return palette; }
  function isActive() { return isInitialized && canvas !== null; }

  function refresh() {
    const result = findCanvas();
    if (result) {
      canvas = result.canvas;
      drawingContainer = result.container;
    }
    extractPalette();
    findTools();
    initColorInput();
    return canvas !== null;
  }

  function testCanvas() {
    if (!canvas) return false;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    const cssTransform = window.getComputedStyle(canvas).transform;

    console.log('AutoDraw: === Canvas Test ===');
    console.log('AutoDraw: Internal dimensions:', canvas.width + 'x' + canvas.height);
    console.log('AutoDraw: BoundingRect:', JSON.stringify({ x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) }));
    console.log('AutoDraw: CSS transform:', cssTransform || 'none');
    console.log('AutoDraw: devicePixelRatio:', window.devicePixelRatio);
    console.log('AutoDraw: Context:', ctx ? '2D' : 'NONE (WebGL?)');
    console.log('AutoDraw: Style display:', window.getComputedStyle(canvas).display);
    console.log('AutoDraw: Style visibility:', window.getComputedStyle(canvas).visibility);
    console.log('AutoDraw: Style pointer-events:', window.getComputedStyle(canvas).pointerEvents);
    console.log('AutoDraw: Style position:', window.getComputedStyle(canvas).position);
    console.log('AutoDraw: Style zIndex:', window.getComputedStyle(canvas).zIndex);

    let el = canvas.parentElement;
    let depth = 0;
    console.log('AutoDraw: === Ancestor Chain ===');
    while (el && el !== document.body && depth < 8) {
      const style = window.getComputedStyle(el);
      const pe = style.pointerEvents;
      const transform = style.transform;
      const overflow = style.overflow;
      const display = style.display;
      const vis = style.visibility;
      const pos = style.position;
      const cls = el.className?.baseVal || el.className || '';
      const logParts = [`depth=${depth}`, `tag=${el.tagName}`];
      if (cls) logParts.push(`class="${cls}"`);
      if (display !== 'block') logParts.push(`display=${display}`);
      if (vis !== 'visible') logParts.push(`visibility=${vis}`);
      if (pe !== 'auto') logParts.push(`pointer-events=${pe}`);
      if (transform && transform !== 'none') logParts.push(`transform=${transform}`);
      if (overflow !== 'visible') logParts.push(`overflow=${overflow}`);
      if (pos !== 'static') logParts.push(`position=${pos}`);
      console.log('AutoDraw:', logParts.join(' | '));
      el = el.parentElement;
      depth++;
    }

    console.log('AutoDraw: Tools:', Object.keys(tools));
    console.log('AutoDraw: Palette:', palette.length, 'colors');
    console.log('AutoDraw: Color swatches:', colorSwatches.length);
    console.log('AutoDraw: Color input:', colorInputElement ? colorInputElement.value : 'none');
    dumpInputs();
    console.log('AutoDraw: === End Test ===');

    return true;
  }

  return {
    init,
    refresh,
    extractPalette,
    setColor,
    setColorViaRGBInputs,
    dumpInputs,
    setTool,
    getTools,
    getCanvas,
    getPalette,
    isActive,
    testCanvas,
    prepareForDrawing,
    restoreAfterDrawing,
    name: 'Gartic Phone',
  };
})();
