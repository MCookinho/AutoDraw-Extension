window.AutoDraw = window.AutoDraw || {};

window.AutoDraw.ImageProcessor = (() => {
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  function loadImageFromUrl(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image from URL'));
      img.src = url;
    });
  }

  function resizeImage(img, targetWidth, targetHeight) {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    return canvas;
  }

  function getImageData(canvas) {
    const ctx = canvas.getContext('2d');
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  function processImage(img, resolution, colorMatcher) {
    const aspectRatio = img.width / img.height;
    let targetWidth, targetHeight;

    if (aspectRatio >= 1) {
      targetWidth = resolution;
      targetHeight = Math.round(resolution / aspectRatio);
    } else {
      targetHeight = resolution;
      targetWidth = Math.round(resolution * aspectRatio);
    }

    const resizedCanvas = resizeImage(img, targetWidth, targetHeight);
    const imageData = getImageData(resizedCanvas);
    const quantizedData = quantizeColors(imageData);

    return {
      width: targetWidth,
      height: targetHeight,
      originalWidth: img.width,
      originalHeight: img.height,
      imageData: quantizedData,
      originalImageData: imageData,
    };
  }

  function quantizeColors(imageData, levels = 32) {
    const data = imageData.data;
    const out = new Uint8ClampedArray(data);
    const step = 256 / levels;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      out[i] = Math.round(data[i] / step) * step;
      out[i + 1] = Math.round(data[i + 1] / step) * step;
      out[i + 2] = Math.round(data[i + 2] / step) * step;
    }

    return new ImageData(out, imageData.width, imageData.height);
  }

  function extractFramesFromGif(gifImg, frameCount = 10) {
    const canvas = document.createElement('canvas');
    canvas.width = gifImg.width;
    canvas.height = gifImg.height;
    const ctx = canvas.getContext('2d');

    const frames = [];
    for (let i = 0; i < frameCount; i++) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(gifImg, 0, 0);
      frames.push(getImageData(canvas));
    }
    return frames;
  }

  function createPreviewCanvas(imageData, scale = 4) {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width * scale;
    canvas.height = imageData.height * scale;
    const ctx = canvas.getContext('2d');

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);

    return canvas;
  }

  function getPixelGrid(imageData) {
    const grid = [];
    const data = imageData.data;

    for (let y = 0; y < imageData.height; y++) {
      const row = [];
      for (let x = 0; x < imageData.width; x++) {
        const i = (y * imageData.width + x) * 4;
        row.push({
          r: data[i],
          g: data[i + 1],
          b: data[i + 2],
          a: data[i + 3],
        });
      }
      grid.push(row);
    }

    return grid;
  }

  function optimizePixelOrder(grid, width, height) {
    const pixels = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (grid[y][x].a >= 128) {
          pixels.push({ x, y, color: grid[y][x] });
        }
      }
    }

    pixels.sort((a, b) => {
      const rowDiff = a.y - b.y;
      if (rowDiff !== 0) return rowDiff;
      return a.x - b.x;
    });

    return pixels;
  }

  return {
    loadImage,
    loadImageFromUrl,
    resizeImage,
    getImageData,
    processImage,
    extractFramesFromGif,
    createPreviewCanvas,
    getPixelGrid,
    optimizePixelOrder,
  };
})();
