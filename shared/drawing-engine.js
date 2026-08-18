window.AutoDraw = window.AutoDraw || {};

window.AutoDraw.DrawingEngine = (() => {
  let isDrawing = false;
  let shouldStop = false;
  let currentAdapter = null;
  let progress = 0;
  let totalPixels = 0;
  let drawnPixels = 0;
  let onProgressCallback = null;
  let onCompleteCallback = null;
  let onErrorCallback = null;

  function setCallbacks(adapter, onProgress, onComplete, onError) {
    currentAdapter = adapter;
    onProgressCallback = onProgress;
    onCompleteCallback = onComplete;
    onErrorCallback = onError;
  }

  function updateProgress() {
    if (totalPixels > 0) progress = Math.round((drawnPixels / totalPixels) * 100);
    if (onProgressCallback) onProgressCallback({ progress, drawnPixels, totalPixels });
  }

  function cdpSend(message) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage(message, response => resolve(response || { success: false }));
    });
  }

  async function ensureCDP() {
    const r = await cdpSend({ action: 'cdpAttach' });
    return r && r.success;
  }

  function getFreshCanvasArea() {
    let canvas = currentAdapter.getCanvas();
    if (!canvas) return null;
    let rect = canvas.getBoundingClientRect();
    let area = { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
    if (area.width === 0 || area.height === 0) {
      if (currentAdapter.refresh) {
        currentAdapter.refresh();
        canvas = currentAdapter.getCanvas();
        if (canvas) {
          rect = canvas.getBoundingClientRect();
          area = { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
        }
      }
    }
    if (area.width === 0 || area.height === 0) return null;
    return area;
  }

  // ── Build color rows ──

  function buildColorRows(imageData) {
    const { width, height } = imageData;
    const data = imageData.imageData.data;
    const colorRows = {};
    let total = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (data[i + 3] < 128) continue;
        total++;
        const hex = window.AutoDraw.ColorMatcher.rgbToHex(data[i], data[i + 1], data[i + 2]);
        if (!colorRows[hex]) colorRows[hex] = {};
        if (!colorRows[hex][y]) colorRows[hex][y] = [];
        const segs = colorRows[hex][y];
        if (segs.length > 0 && segs[segs.length - 1].x2 === x - 1) {
          segs[segs.length - 1].x2 = x;
        } else {
          segs.push({ x1: x, x2: x });
        }
      }
    }

    return { colorRows, total };
  }

  // ── Region merging ──

  function mergeIntoRegions(rows) {
    const sortedY = Object.keys(rows).map(Number).sort((a, b) => a - b);
    const regions = [];

    for (const y of sortedY) {
      for (const seg of rows[y]) {
        let placed = false;
        for (let ri = regions.length - 1; ri >= Math.max(0, regions.length - 8); ri--) {
          const region = regions[ri];
          const last = region[region.length - 1];
          if (last.y === y - 1) {
            const overlap = Math.min(last.x2, seg.x2) - Math.max(last.x1, seg.x1);
            if (overlap > -3) {
              region.push({ y, x1: seg.x1, x2: seg.x2 });
              placed = true;
              break;
            }
          }
        }
        if (!placed) regions.push([{ y, x1: seg.x1, x2: seg.x2 }]);
      }
    }

    return regions;
  }

  // ── Draw mode: zigzag ──

  function buildZigzagPath(region, area, scaleX, scaleY, fillStep) {
    const points = [];
    let goingRight = true;

    for (const seg of region) {
      const topY = area.y + seg.y * scaleY;
      const bottomY = area.y + (seg.y + 1) * scaleY;
      const leftX = area.x + seg.x1 * scaleX;
      const rightX = area.x + (seg.x2 + 1) * scaleX;
      let passY = topY + fillStep * 0.25;

      while (passY <= bottomY + fillStep * 0.25) {
        const y = Math.round(Math.min(Math.max(passY, topY), bottomY));
        const jx = (Math.random() - 0.5) * 0.8;
        const jy = (Math.random() - 0.5) * 0.3;
        if (goingRight) {
          points.push({ x: Math.round(leftX + jx), y: Math.round(y + jy) });
          points.push({ x: Math.round(rightX + jx), y: Math.round(y + jy) });
        } else {
          points.push({ x: Math.round(rightX + jx), y: Math.round(y + jy) });
          points.push({ x: Math.round(leftX + jx), y: Math.round(y + jy) });
        }
        passY += fillStep;
        goingRight = !goingRight;
      }
    }
    return points;
  }

  // ── Draw mode: spiral ──

  function buildSpiralPath(region, area, scaleX, scaleY, fillStep) {
    const points = [];
    if (region.length === 0) return points;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const seg of region) {
      minX = Math.min(minX, seg.x1);
      maxX = Math.max(maxX, seg.x2);
      minY = Math.min(minY, seg.y);
      maxY = Math.max(maxY, seg.y);
    }

    const cx = area.x + ((minX + maxX) / 2) * scaleX;
    const cy = area.y + ((minY + maxY) / 2) * scaleY;
    const hw = ((maxX - minX + 1) / 2) * scaleX;
    const hh = ((maxY - minY + 1) / 2) * scaleY;

    const steps = Math.max(4, Math.ceil(Math.max(hw, hh) / (fillStep * 0.5)));
    for (let i = 0; i < steps; i++) {
      const t = (i / steps) * Math.PI * 2 * Math.min(3, steps / 4);
      const r = (i / steps);
      const x = cx + Math.cos(t) * hw * r;
      const y = cy + Math.sin(t) * hh * r;
      const jx = (Math.random() - 0.5) * 0.6;
      const jy = (Math.random() - 0.5) * 0.3;
      points.push({ x: Math.round(x + jx), y: Math.round(y + jy) });
    }
    return points;
  }

  // ── Draw mode: edges first (outline) ──

  function buildEdgesFirstPath(region, area, scaleX, scaleY, fillStep) {
    const points = [];
    for (const seg of region) {
      const topY = area.y + seg.y * scaleY;
      const bottomY = area.y + (seg.y + 1) * scaleY;
      const leftX = area.x + seg.x1 * scaleX;
      const rightX = area.x + (seg.x2 + 1) * scaleX;
      const jx = (Math.random() - 0.5) * 0.5;
      const jy = (Math.random() - 0.5) * 0.3;

      points.push({ x: Math.round(leftX + jx), y: Math.round(topY + jy) });
      points.push({ x: Math.round(rightX + jx), y: Math.round(topY + jy) });
      points.push({ x: Math.round(rightX + jx), y: Math.round(bottomY + jy) });
      points.push({ x: Math.round(leftX + jx), y: Math.round(bottomY + jy) });
      points.push({ x: Math.round(leftX + jx), y: Math.round(topY + jy) });

      let passY = topY + fillStep;
      while (passY < bottomY) {
        const y = Math.round(Math.min(passY, bottomY));
        points.push({ x: Math.round(leftX + jx), y: Math.round(y + jy) });
        points.push({ x: Math.round(rightX + jx), y: Math.round(y + jy) });
        passY += fillStep;
      }
    }
    return points;
  }

  // ── Draw mode: inside out ──

  function buildInsideOutPath(region, area, scaleX, scaleY, fillStep) {
    if (region.length === 0) return [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const seg of region) {
      minX = Math.min(minX, seg.x1);
      maxX = Math.max(maxX, seg.x2);
      minY = Math.min(minY, seg.y);
      maxY = Math.max(maxY, seg.y);
    }
    const midY = (minY + maxY) / 2;
    const sorted = [...region].sort((a, b) => Math.abs(a.y - midY) - Math.abs(b.y - midY));
    const reindexed = sorted.map((s, i) => ({ ...s, _i: i }));
    reindexed.sort((a, b) => a._i - b._i);

    const reordered = {};
    for (const seg of reindexed) {
      const y = seg.y;
      if (!reordered[y]) reordered[y] = [];
      reordered[y].push({ x1: seg.x1, x2: seg.x2 });
    }
    return buildZigzagPath(reindexed, area, scaleX, scaleY, fillStep);
  }

  // ── Build path based on draw mode ──

  function buildRegionPath(region, area, scaleX, scaleY, fillStep, mode) {
    switch (mode) {
      case 'spiral': return buildSpiralPath(region, area, scaleX, scaleY, fillStep);
      case 'edges_first': return buildEdgesFirstPath(region, area, scaleX, scaleY, fillStep);
      case 'inside_out': return buildInsideOutPath(region, area, scaleX, scaleY, fillStep);
      case 'random': {
        const points = [];
        const shuffled = [...region].sort(() => Math.random() - 0.5);
        for (const seg of shuffled) {
          const topY = area.y + seg.y * scaleY;
          const bottomY = area.y + (seg.y + 1) * scaleY;
          const leftX = area.x + seg.x1 * scaleX;
          const rightX = area.x + (seg.x2 + 1) * scaleX;
          const y = topY + Math.random() * (bottomY - topY);
          points.push({ x: Math.round(leftX), y: Math.round(y) });
          points.push({ x: Math.round(rightX), y: Math.round(y) });
        }
        return points;
      }
      default: return buildZigzagPath(region, area, scaleX, scaleY, fillStep);
    }
  }

  // ── Anti-aliasing: add sub-pixel intermediates ──

  function applyAntiAlias(points) {
    if (points.length < 2) return points;
    const result = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 3) {
        const steps = Math.floor(dist / 2);
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          result.push({
            x: Math.round(prev.x + dx * t + (Math.random() - 0.5) * 0.3),
            y: Math.round(prev.y + dy * t + (Math.random() - 0.5) * 0.3),
          });
        }
      }
      result.push(curr);
    }
    return result;
  }

  // ── Sort regions based on draw mode ──

  function sortRegions(regions, mode) {
    if (mode === 'random') return [...regions].sort(() => Math.random() - 0.5);
    return regions;
  }

  // ── Main drawing function ──

  async function drawWithMouse(imageData, fallbackArea, speed) {
    const canvas = currentAdapter.getCanvas();
    if (!canvas) throw new Error('Canvas not found');

    let area = getFreshCanvasArea();
    if (!area && fallbackArea) area = fallbackArea;
    if (!area) throw new Error('Cannot get canvas area');

    const { width, height } = imageData;
    const scaleX = area.width / width;
    const scaleY = area.height / height;

    console.log('AutoDraw: Viewport:', Math.round(area.width) + 'x' + Math.round(area.height));
    console.log('AutoDraw: Image:', width + 'x' + height, 'scale:', scaleX.toFixed(2), scaleY.toFixed(2));

    const connected = await ensureCDP();
    if (!connected) throw new Error('Connect debugger first (click Proceed on yellow bar).');

    if (currentAdapter.setTool) {
      currentAdapter.setTool('pencil');
      await new Promise(r => setTimeout(r, 80));
    }

    const fillStep = Math.max(2, Math.floor(scaleY * 0.45));
    const moveDelay = Math.round(Math.max(1, (100 - speed) / 30));
    const regionGap = Math.round(Math.max(0, (100 - speed) / 12));

    // Load settings
    const settings = await window.AutoDraw.Settings.load();
    const drawMode = settings.drawMode || 'zigzag';
    const antiAlias = settings.antiAlias || false;
    const colorDelay = settings.colorDelay || 0;

    totalPixels = 0;
    drawnPixels = 0;
    isDrawing = true;
    shouldStop = false;

    const { colorRows, total } = buildColorRows(imageData);
    totalPixels = total;
    console.log('AutoDraw: Visible:', totalPixels, 'fillStep:', fillStep, 'mode:', drawMode);

    const colorEntries = Object.entries(colorRows);
    colorEntries.sort((a, b) => {
      let cA = 0, cB = 0;
      for (const y in a[1]) for (const s of a[1][y]) cA += s.x2 - s.x1 + 1;
      for (const y in b[1]) for (const s of b[1][y]) cB += s.x2 - s.x1 + 1;
      return cB - cA;
    });

    let regionCount = 0;

    for (const [hex, rows] of colorEntries) {
      if (shouldStop) break;

      if (currentAdapter.setColor) {
        let ok = currentAdapter.setColor(hex);
        if (!ok) {
          // Retry once after re-init
          if (currentAdapter.refresh) currentAdapter.refresh();
          await new Promise(r => setTimeout(r, 100));
          ok = currentAdapter.setColor(hex);
        }
        if (!ok) console.warn('AutoDraw: setColor failed for', hex);
        await new Promise(r => setTimeout(r, 50));
      }

      let regions = mergeIntoRegions(rows);
      regions = sortRegions(regions, drawMode);

      let colorPixels = 0;
      for (const reg of regions) for (const seg of reg) colorPixels += seg.x2 - seg.x1 + 1;
      console.log('AutoDraw:', hex, '-', regions.length, 'regions,', colorPixels, 'px');

      for (let ri = 0; ri < regions.length; ri++) {
        if (shouldStop) break;

        let points = buildRegionPath(regions[ri], area, scaleX, scaleY, fillStep, drawMode);
        if (antiAlias) points = applyAntiAlias(points);
        if (points.length < 2) continue;

        if (regionCount > 0 && regionGap > 0) {
          await new Promise(r => setTimeout(r, regionGap));
        }

        await cdpSend({ action: 'cdpDrawStroke', points, delay: moveDelay });
        regionCount++;

        for (const seg of regions[ri]) drawnPixels += seg.x2 - seg.x1 + 1;

        if (regionCount % 20 === 0) updateProgress();
      }

      // Color delay between color changes
      if (colorDelay > 0 && !shouldStop) {
        await new Promise(r => setTimeout(r, colorDelay));
      }
    }

    updateProgress();
    console.log('AutoDraw: Done.', regionCount, 'regions');
    return true;
  }

  async function startDrawing(imageData, area, speed) {
    if (isDrawing) throw new Error('Already drawing');
    try {
      isDrawing = true;
      shouldStop = false;
      const success = await drawWithMouse(imageData, area, speed);
      if (!shouldStop && success && onCompleteCallback) onCompleteCallback({ drawnPixels, totalPixels });
      return success;
    } catch (error) {
      if (onErrorCallback) onErrorCallback(error);
      throw error;
    } finally {
      isDrawing = false;
    }
  }

  function stopDrawing() { shouldStop = true; isDrawing = false; }
  function getStatus() { return { isDrawing, progress, drawnPixels, totalPixels, shouldStop }; }

  return { setCallbacks, startDrawing, stopDrawing, getStatus };
})();
