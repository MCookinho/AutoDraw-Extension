window.AutoDraw = window.AutoDraw || {};

window.AutoDraw.GarticAdapter = (() => {
  let canvas = null;
  let palette = [];
  let tools = {};
  let isInitialized = false;

  function init() {
    canvas = findCanvas();
    if (!canvas) {
      console.warn('AutoDraw: Canvas not found on Gartic');
      return false;
    }

    extractPalette();
    findTools();
    isInitialized = true;
    console.log('AutoDraw: Gartic adapter initialized, canvas:', canvas);
    return true;
  }

  function findCanvas() {
    const allCanvases = document.querySelectorAll('canvas');
    let biggestCanvas = null;
    let biggestArea = 0;

    console.log('AutoDraw: Scanning', allCanvases.length, 'canvases...');

    for (const c of allCanvases) {
      const area = c.width * c.height;
      console.log('AutoDraw: Canvas', c.width + 'x' + c.height, 'area:', area, 'class:', c.className, 'parent:', c.parentElement?.className);
      if (area > biggestArea) {
        biggestArea = area;
        biggestCanvas = c;
      }
    }

    if (biggestCanvas) {
      console.log('AutoDraw: Selected biggest canvas:', biggestCanvas.width + 'x' + biggestCanvas.height, biggestCanvas.className);
    }

    return biggestCanvas;
  }

  function extractPalette() {
    palette = [];
    const colorSelectors = [
      '.colors .color',
      '.palette .color',
      '.color-palette .color',
      '[class*="color"]',
      '.brush-colors .color',
    ];

    for (const selector of colorSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const color = extractColorFromElement(el);
        if (color) palette.push(color);
      });
      if (palette.length > 0) break;
    }

    if (palette.length === 0) {
      palette = [
        [0, 0, 0], [255, 255, 255], [255, 0, 0], [0, 128, 0],
        [0, 0, 255], [255, 255, 0], [255, 128, 0], [128, 0, 255],
        [255, 0, 255], [0, 255, 255], [128, 128, 128], [128, 0, 0],
        [0, 100, 0], [0, 0, 128], [255, 192, 203], [210, 180, 140],
      ];
    }

    window.AutoDraw.ColorMatcher.setPalette(palette);
    console.log('AutoDraw: Extracted palette with', palette.length, 'colors');
    return palette;
  }

  function findTools() {
    tools = {};

    const allButtons = document.querySelectorAll('button, [role="button"], [class*="tool"]');
    console.log('AutoDraw: Scanning', allButtons.length, 'buttons for tools...');

    for (const btn of allButtons) {
      const classList = btn.className || '';
      const title = (btn.title || btn.getAttribute('aria-label') || '').toLowerCase();
      const inner = btn.innerHTML.toLowerCase();

      if (classList.includes('pencil') || classList.includes('pen') || title.includes('pencil') || title.includes('pen') || inner.includes('pencil')) {
        tools.pencil = btn;
        console.log('AutoDraw: Found pencil tool:', btn);
      }
      if (classList.includes('fill') || classList.includes('bucket') || title.includes('fill') || title.includes('bucket') || inner.includes('bucket')) {
        tools.fill = btn;
        console.log('AutoDraw: Found fill tool:', btn);
      }
      if (classList.includes('eraser') || classList.includes('erase') || title.includes('eraser') || title.includes('erase') || inner.includes('eraser')) {
        tools.eraser = btn;
        console.log('AutoDraw: Found eraser tool:', btn);
      }
    }

    console.log('AutoDraw: Available tools:', Object.keys(tools));
    return tools;
  }

  function setTool(toolName) {
    if (tools[toolName]) {
      tools[toolName].click();
      console.log('AutoDraw: Selected tool:', toolName);
      return true;
    }
    console.warn('AutoDraw: Tool not found:', toolName);
    return false;
  }

  function getTools() {
    return Object.keys(tools);
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

    const title = el.getAttribute('title');
    if (title) {
      const match = title.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
      }
    }

    return null;
  }

  function setColor(hexColor) {
    const rgb = window.AutoDraw.ColorMatcher.hexToRgb(hexColor);
    if (!rgb) return false;

    const colorSelectors = [
      '.colors .color',
      '.palette .color',
      '.color-palette .color',
      '[class*="color"]',
      '.brush-colors .color',
    ];

    for (const selector of colorSelectors) {
      const elements = document.querySelectorAll(selector);
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
    }

    const closest = window.AutoDraw.ColorMatcher.findClosestColor(rgb[0], rgb[1], rgb[2]);
    const closestHex = window.AutoDraw.ColorMatcher.rgbToHex(closest[0], closest[1], closest[2]);

    for (const selector of colorSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const elColor = extractColorFromElement(el);
        if (elColor) {
          const elHex = window.AutoDraw.ColorMatcher.rgbToHex(elColor[0], elColor[1], elColor[2]);
          if (elHex === closestHex) {
            el.click();
            return true;
          }
        }
      }
    }

    return false;
  }

  function getCanvas() {
    return canvas;
  }

  function getPalette() {
    return palette;
  }

  function isActive() {
    return isInitialized && canvas !== null;
  }

  function refresh() {
    canvas = findCanvas();
    extractPalette();
    return canvas !== null;
  }

  function testCanvas() {
    if (!canvas) return false;

    const rect = canvas.getBoundingClientRect();
    console.log('AutoDraw: Canvas test - rect:', rect);
    console.log('AutoDraw: Canvas test - dimensions:', canvas.width, 'x', canvas.height);
    console.log('AutoDraw: Canvas test - style:', canvas.style.cssText);
    console.log('AutoDraw: Canvas test - parent:', canvas.parentElement);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      console.log('AutoDraw: Canvas has 2D context');
    } else {
      console.log('AutoDraw: Canvas does NOT have 2D context (might be WebGL)');
    }

    return true;
  }

  return {
    init,
    refresh,
    extractPalette,
    setColor,
    setTool,
    getTools,
    getCanvas,
    getPalette,
    isActive,
    testCanvas,
    name: 'Gartic',
  };
})();
