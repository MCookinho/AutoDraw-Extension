window.AutoDraw = window.AutoDraw || {};

window.AutoDraw.ColorMatcher = (() => {
  let palette = [];
  let colorCache = new Map();

  function setPalette(newPalette) {
    palette = newPalette.map(c => [...c]);
    colorCache.clear();
  }

  function getPalette() {
    return palette.map(c => [...c]);
  }

  function colorDistance(c1, c2) {
    const dr = c1[0] - c2[0];
    const dg = c1[1] - c2[1];
    const db = c1[2] - c2[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  function findClosestColor(r, g, b) {
    const key = `${r},${g},${b}`;
    if (colorCache.has(key)) {
      return colorCache.get(key);
    }

    let closest = palette[0];
    let minDist = Infinity;

    for (const color of palette) {
      const dist = colorDistance([r, g, b], color);
      if (dist < minDist) {
        minDist = dist;
        closest = color;
        if (dist === 0) break;
      }
    }

    colorCache.set(key, [...closest]);
    return [...closest];
  }

  function matchImageColors(imageData) {
    const data = imageData.data;
    const matched = new Uint8ClampedArray(data.length);

    for (let i = 0; i < data.length; i += 4) {
      const [mr, mg, mb] = findClosestColor(data[i], data[i + 1], data[i + 2]);
      matched[i] = mr;
      matched[i + 1] = mg;
      matched[i + 2] = mb;
      matched[i + 3] = data[i + 3];
    }

    return new ImageData(matched, imageData.width, imageData.height);
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : null;
  }

  function getUniqueColors(imageData) {
    const colors = new Set();
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      const matched = findClosestColor(data[i], data[i + 1], data[i + 2]);
      colors.add(`${matched[0]},${matched[1]},${matched[2]}`);
    }

    return Array.from(colors).map(c => c.split(',').map(Number));
  }

  return {
    setPalette,
    getPalette,
    findClosestColor,
    matchImageColors,
    getUniqueColors,
    colorDistance,
    rgbToHex,
    hexToRgb,
  };
})();
