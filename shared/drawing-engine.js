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

  // ── Outline mode: color-based exact contour (Photoshop-style) ──

  function colorDist(c1, c2) {
    const dr = c1[0] - c2[0];
    const dg = c1[1] - c2[1];
    const db = c1[2] - c2[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  function buildBackgroundModel(imageData) {
    const { width, height } = imageData;
    const buf = imageData.imageData.data;
    const clusters = [];
    const step = Math.max(1, Math.floor(Math.min(width, height) / 40));

    const sampleList = [];
    for (let x = 0; x < width; x += step) {
      const topI = x * 4;
      const botI = ((height - 1) * width + x) * 4;
      if (buf[topI + 3] >= 128) sampleList.push([buf[topI], buf[topI + 1], buf[topI + 2]]);
      if (buf[botI + 3] >= 128) sampleList.push([buf[botI], buf[botI + 1], buf[botI + 2]]);
    }
    for (let y = 0; y < height; y += step) {
      const leftI = (y * width) * 4;
      const rightI = (y * width + width - 1) * 4;
      if (buf[leftI + 3] >= 128) sampleList.push([buf[leftI], buf[leftI + 1], buf[leftI + 2]]);
      if (buf[rightI + 3] >= 128) sampleList.push([buf[rightI], buf[rightI + 1], buf[rightI + 2]]);
    }

    for (const s of sampleList) {
      let best = null, bestD = Infinity;
      for (const c of clusters) {
        const d = colorDist(s, c);
        if (d < bestD) { best = c; bestD = d; }
      }
      if (best && bestD <= 48) {
        best[0] = best[0] * 0.9 + s[0] * 0.1;
        best[1] = best[1] * 0.9 + s[1] * 0.1;
        best[2] = best[2] * 0.9 + s[2] * 0.1;
      } else if (clusters.length < 3) {
        clusters.push([s[0], s[1], s[2]]);
      }
    }

    return clusters;
  }

  function isBackgroundColor(c, model, tolerance) {
    for (const m of model) {
      if (colorDist(c, m) <= tolerance) return true;
    }
    return false;
  }

  function floodFillBackground(imageData, model, tolerance) {
    const { width, height } = imageData;
    const buf = imageData.imageData.data;
    const bg = new Uint8Array(width * height);
    const stack = [];

    const trySeed = (x, y) => {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const i = y * width + x;
      if (bg[i] || buf[i * 4 + 3] < 128) return;
      if (!isBackgroundColor([buf[i], buf[i + 1], buf[i + 2]], model, tolerance)) return;
      bg[i] = 1;
      stack.push([x, y]);
    };

    for (let x = 0; x < width; x++) { trySeed(x, 0); trySeed(x, height - 1); }
    for (let y = 0; y < height; y++) { trySeed(0, y); trySeed(width - 1, y); }

    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (stack.length > 0) {
      const [x, y] = stack.pop();
      for (const [dx, dy] of nb) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const j = (ny * width + nx) * 4;
        if (bg[ny * width + nx] || buf[j + 3] < 128) continue;
        if (isBackgroundColor([buf[j], buf[j + 1], buf[j + 2]], model, tolerance)) {
          bg[ny * width + nx] = 1;
          stack.push([nx, ny]);
        }
      }
    }

    return bg;
  }

  function buildSubjectMask(imageData) {
    const { width, height } = imageData;
    const buf = imageData.imageData.data;
    const mask = new Uint8Array(width * height);
    const total = width * height;
    let transparent = 0;

    for (let i = 0; i < total; i++) {
      if (buf[i * 4 + 3] >= 128) {
        mask[i] = 1;
      } else {
        transparent++;
      }
    }

    return { mask, hasAlpha: transparent > total * 0.05 };
  }

  function connectedComponents(mask, width, height) {
    const labels = new Int32Array(mask.length).fill(-1);
    const sizes = [];
    const nb8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
    const stack = [];

    for (let i = 0; i < mask.length; i++) {
      if (!mask[i] || labels[i] !== -1) continue;
      const label = sizes.length;
      labels[i] = label;
      sizes.push(0);
      stack.push(i);
      while (stack.length > 0) {
        const idx = stack.pop();
        sizes[label]++;
        const x = idx % width;
        const y = (idx / width) | 0;
        for (const [dx, dy] of nb8) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const j = ny * width + nx;
          if (!mask[j] || labels[j] !== -1) continue;
          labels[j] = label;
          stack.push(j);
        }
      }
    }

    return { labels, sizes };
  }

  function cleanMask(mask, width, height, minArea) {
    const { labels, sizes } = connectedComponents(mask, width, height);
    const out = new Uint8Array(mask.length);
    for (let i = 0; i < mask.length; i++) {
      if (labels[i] >= 0 && sizes[labels[i]] >= minArea) out[i] = 1;
    }
    return out;
  }

  function buildPaletteEdgeMap(imageData, minArea) {
    const { width, height } = imageData;
    const buf = imageData.imageData.data;
    const region = new Uint16Array(width * height).fill(65535);
    const idByKey = new Map();
    const counts = [];
    let nextId = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (buf[i + 3] < 128) continue;
        const m = window.AutoDraw.ColorMatcher.findClosestColor(buf[i], buf[i + 1], buf[i + 2]);
        const key = (m[0] << 16) | (m[1] << 8) | m[2];
        let id = idByKey.get(key);
        if (id === undefined) {
          id = nextId++;
          idByKey.set(key, id);
          counts.push(0);
        }
        region[y * width + x] = id;
        counts[id]++;
      }
    }

    const edge = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (region[i] === 65535) continue;
        const ri = region[i];
        if (x > 0 && region[i - 1] !== region[i]) {
          if (counts[region[i - 1]] >= minArea && counts[ri] >= minArea) edge[i] = 1;
        }
        if (!edge[i] && y > 0 && region[i - width] !== region[i]) {
          if (counts[region[i - width]] >= minArea && counts[ri] >= minArea) edge[i] = 1;
        }
      }
    }

    return edge;
  }

  function buildEdgeMap(imageData) {
    const { width, height } = imageData;
    const total = width * height;
    const minArea = Math.max(8, Math.round(total * 0.003));
    const { mask: alphaMask, hasAlpha } = buildSubjectMask(imageData);
    let mask = null;
    let usePalette = false;

    if (hasAlpha) {
      mask = cleanMask(alphaMask, width, height, minArea);
    } else {
      const tolerance = window.AutoDraw.Config.COLORS.OUTLINE_BG_TOLERANCE;
      const model = buildBackgroundModel(imageData);
      if (model.length > 0) {
        const bg = floodFillBackground(imageData, model, tolerance);
        const bgCount = bg.reduce((s, v) => s + v, 0);
        if (bgCount >= total * 0.05 && bgCount <= total * 0.95) {
          const fg = new Uint8Array(total);
          for (let i = 0; i < total; i++) fg[i] = bg[i] ? 0 : 1;
          mask = cleanMask(fg, width, height, minArea);
        }
      }
      if (!mask) usePalette = true;
    }

    if (usePalette) {
      return buildPaletteEdgeMap(imageData, minArea);
    }

    const edge = new Uint8Array(total);
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (!mask[i]) continue;
        for (const [dx, dy] of nb) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            edge[i] = 1;
            break;
          }
          if (!mask[ny * width + nx]) {
            edge[i] = 1;
            break;
          }
        }
      }
    }

    return edge;
  }

  function traceContour(x0, y0, edge, width, height, visited) {
    const points = [];
    let cx = x0, cy = y0;
    let dir = null;

    while (true) {
      points.push({ x: cx, y: cy });
      visited[cy * width + cx] = 1;

      const options = [];
      for (let dyy = -1; dyy <= 1; dyy++) {
        for (let dxx = -1; dxx <= 1; dxx++) {
          if (dxx === 0 && dyy === 0) continue;
          const nx = cx + dxx, ny = cy + dyy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (!edge[ny * width + nx] || visited[ny * width + nx]) continue;
          options.push({ x: nx, y: ny, dx: dxx, dy: dyy });
        }
      }
      if (options.length === 0) break;

      if (dir) {
        options.sort((a, b) => {
          const dotA = a.dx * dir[0] + a.dy * dir[1];
          const dotB = b.dx * dir[0] + b.dy * dir[1];
          return dotB - dotA;
        });
      }

      const best = options[0];
      dir = [best.dx, best.dy];
      cx = best.x;
      cy = best.y;
    }

    if (points.length > 1) {
      const last = points[points.length - 1];
      const dx = Math.abs(last.x - x0);
      const dy = Math.abs(last.y - y0);
      if (dx <= 1 && dy <= 1) points.push({ x: x0, y: y0, closed: true });
    }

    return points;
  }

  function pointSegDist(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return colorDist([p.x, p.y], [a.x, a.y]);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    return colorDist([p.x, p.y], [a.x + t * dx, a.y + t * dy]);
  }

  function rdpSimplify(points, epsilon) {
    if (points.length < 3) return points;
    let maxDist = 0, index = 0;
    const first = points[0];
    const last = points[points.length - 1];
    for (let i = 1; i < points.length - 1; i++) {
      const d = pointSegDist(points[i], first, last);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (maxDist > epsilon) {
      const left = rdpSimplify(points.slice(0, index + 1), epsilon);
      const right = rdpSimplify(points.slice(index), epsilon);
      return left.slice(0, -1).concat(right);
    }
    return [first, last];
  }

  function chaikinSmooth(pts) {
    if (pts.length < 3) return pts;
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      out.push({ x: a.x + (b.x - a.x) * 0.25, y: a.y + (b.y - a.y) * 0.25 });
      out.push({ x: a.x + (b.x - a.x) * 0.75, y: a.y + (b.y - a.y) * 0.75 });
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  function buildOutlinePath(path, area, scaleX, scaleY) {
    let p = path.map(pt => ({ x: pt.x + 0.5, y: pt.y + 0.5 }));
    p = rdpSimplify(p, 0.5);
    p = chaikinSmooth(chaikinSmooth(p));
    return p.map(pt => ({
      x: Math.round(area.x + pt.x * scaleX),
      y: Math.round(area.y + pt.y * scaleY),
    }));
  }

  async function drawOutline(imageData, area, scaleX, scaleY, speed, settings) {
    const { width, height } = imageData;
    const edge = buildEdgeMap(imageData);
    const visited = new Uint8Array(width * height);
    const strokes = [];

    totalPixels = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!edge[y * width + x] || visited[y * width + x]) continue;
        const path = traceContour(x, y, edge, width, height, visited);
        if (path.length < 5) continue;
        totalPixels += path.length;
        strokes.push(path);
      }
    }

    if (totalPixels === 0) {
      updateProgress();
      return true;
    }

    const moveDelay = Math.round(Math.max(1, (100 - speed) / 30));
    const regionGap = Math.round(Math.max(0, (100 - speed) / 12));

    if (currentAdapter.setColor) {
      let ok = currentAdapter.setColor('#000000');
      if (!ok) {
        if (currentAdapter.refresh) currentAdapter.refresh();
        await new Promise(r => setTimeout(r, 100));
        ok = currentAdapter.setColor('#000000');
      }
      if (!ok) console.warn('AutoDraw: setColor failed for #000000');
      await new Promise(r => setTimeout(r, 50));
    }

    const sortedStrokes = [...strokes].sort((a, b) => b.length - a.length);

    let strokeCount = 0;
    for (const stroke of sortedStrokes) {
      if (shouldStop) break;

      let pts = buildOutlinePath(stroke, area, scaleX, scaleY);
      if (settings.antiAlias) pts = applyAntiAlias(pts);
      if (pts.length < 2) continue;

      if (strokeCount > 0 && regionGap > 0) {
        await new Promise(r => setTimeout(r, regionGap));
      }

      await cdpSend({ action: 'cdpDrawStroke', points: pts, delay: moveDelay });
      strokeCount++;
      drawnPixels += stroke.length;

      if (strokeCount % 20 === 0) updateProgress();
    }

    updateProgress();
    console.log('AutoDraw: Outline done.', strokeCount, 'strokes');
    return true;
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

    if (drawMode === 'outline') {
      return await drawOutline(imageData, area, scaleX, scaleY, speed, settings);
    }

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

  function debugOutline(imageData) {
    const edge = buildEdgeMap(imageData);
    const visited = new Uint8Array(imageData.width * imageData.height);
    const strokes = [];
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        if (!edge[y * imageData.width + x] || visited[y * imageData.width + x]) continue;
        const path = traceContour(x, y, edge, imageData.width, imageData.height, visited);
        if (path.length < 5) continue;
        strokes.push(path);
      }
    }
    return { edgePixels: edge.reduce((s, v) => s + v, 0), strokes };
  }

  return { setCallbacks, startDrawing, stopDrawing, getStatus, debugOutline };
})();
