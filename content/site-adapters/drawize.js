window.AutoDraw = window.AutoDraw || {};

window.AutoDraw.DrawizeAdapter = (() => {
  let canvas = null;
  let palette = [];
  let isInitialized = false;

  function init() {
    canvas = findCanvas();
    if (!canvas) {
      console.warn('AutoDraw: Canvas not found on Drawize');
      return false;
    }

    extractPalette();
    isInitialized = true;
    return true;
  }

  function findCanvas() {
    const selectors = [
      '#canvas',
      'canvas.game',
      '.game canvas',
      '#draw-canvas',
      'canvas[width]',
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && el.width > 50 && el.height > 50) {
        return el;
      }
    }

    const allCanvases = document.querySelectorAll('canvas');
    for (const c of allCanvases) {
      if (c.width >= 100 && c.height >= 100) {
        return c;
      }
    }

    return null;
  }

  function extractPalette() {
    palette = [];
    const elements = document.querySelectorAll('.colors .color, [class*="color"]');
    elements.forEach(el => {
      const color = extractColorFromElement(el);
      if (color) palette.push(color);
    });

    if (palette.length === 0) {
      palette = window.AutoDraw.Config.DEFAULT_PALETTE;
    }

    window.AutoDraw.ColorMatcher.setPalette(palette);
    return palette;
  }

  function extractColorFromElement(el) {
    const style = window.getComputedStyle(el);
    const bgColor = style.backgroundColor;
    if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
      const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }
    return null;
  }

  function setColor(hexColor) {
    const rgb = window.AutoDraw.ColorMatcher.hexToRgb(hexColor);
    if (!rgb) return false;

    const elements = document.querySelectorAll('.colors .color, [class*="color"]');
    for (const el of elements) {
      const elColor = extractColorFromElement(el);
      if (elColor) {
        const distance = window.AutoDraw.ColorMatcher.colorDistance(rgb, elColor);
        if (distance < 30) {
          el.click();
          return true;
        }
      }
    }
    return false;
  }

  function getCanvas() { return canvas; }
  function getPalette() { return palette; }
  function isActive() { return isInitialized && canvas !== null; }

  function refresh() {
    canvas = findCanvas();
    extractPalette();
    return canvas !== null;
  }

  return { init, refresh, extractPalette, setColor, getCanvas, getPalette, isActive, name: 'Drawize' };
})();
