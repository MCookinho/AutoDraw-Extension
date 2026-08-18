window.AutoDraw = window.AutoDraw || {};

window.AutoDraw.Config = {
  SUPPORTED_SITES: {
    'gartic.io': {
      name: 'Gartic',
      adapter: 'GarticAdapter',
      canvasSelector: '.canvas-wrap canvas, canvas',
      paletteSelector: '.colors .color, .palette .color, [class*="color"]',
    },
    'garticphone.com': {
      name: 'Gartic Phone',
      adapter: 'GarticPhoneAdapter',
      canvasSelector: 'canvas',
      paletteSelector: '.colors .color, [class*="color"]',
    },
    'sketch.io': {
      name: 'Sketch.io',
      adapter: 'SketchAdapter',
      canvasSelector: '#canvas, canvas',
      paletteSelector: '.palette .color, [class*="color"]',
    },
    'drawize.com': {
      name: 'Drawize',
      adapter: 'DrawizeAdapter',
      canvasSelector: 'canvas',
      paletteSelector: '.colors .color, [class*="color"]',
    },
  },

  DRAWING: {
    DEFAULT_SPEED: 50,
    MIN_SPEED: 1,
    MAX_SPEED: 100,
    DEFAULT_RESOLUTION: 64,
    MIN_RESOLUTION: 16,
    MAX_RESOLUTION: 256,
    MOUSE_MOVE_DELAY: 10,
    PIXEL_DELAY_MIN: 1,
    PIXEL_DELAY_MAX: 50,
    MIN_COLOR_DELAY: 0,
    MAX_COLOR_DELAY: 500,
    DEFAULT_COLOR_DELAY: 50,
  },

  COLORS: {
    COLOR_DISTANCE_THRESHOLD: 150,
  },

  DECALQUE: {
    DEFAULT_OPACITY: 50,
    DEFAULT_SCALE: 100,
    DEFAULT_BRIGHTNESS: 100,
    DEFAULT_CONTRAST: 100,
    DEFAULT_SATURATION: 100,
    MIN_OPACITY: 5,
    MAX_OPACITY: 100,
    MIN_SCALE: 20,
    MAX_SCALE: 300,
    MIN_FILTER: 0,
    MAX_FILTER: 200,
  },

  DRAW_MODES: {
    ZIGZAG: 'zigzag',
    SPIRAL: 'spiral',
    EDGES_FIRST: 'edges_first',
    RANDOM: 'random',
    INSIDE_OUT: 'inside_out',
  },

  SHORTCUTS: {
    TOGGLE_OVERLAY: 'Ctrl+Shift+D',
    START_DRAW: 'Ctrl+Shift+S',
    STOP_DRAW: 'Ctrl+Shift+X',
    TOGGLE_DECALQUE: 'Ctrl+Shift+T',
  },

  MESSAGES: {
    START_DRAW: 'autodraw_start_draw',
    STOP_DRAW: 'autodraw_stop_draw',
    GET_STATUS: 'autodraw_get_status',
    IMAGE_PROCESSED: 'autodraw_image_processed',
    DRAWING_PROGRESS: 'autodraw_drawing_progress',
    DRAWING_COMPLETE: 'autodraw_drawing_complete',
    DRAWING_ERROR: 'autodraw_drawing_error',
    PALETTE_FOUND: 'autodraw_palette_found',
    AREA_SELECTED: 'autodraw_area_selected',
    GET_PALETTE: 'autodraw_get_palette',
    SET_SPEED: 'autodraw_set_speed',
    SET_RESOLUTION: 'autodraw_set_resolution',
    TOGGLE_DECALQUE: 'autodraw_toggle_decalque',
    UPDATE_DECALQUE: 'autodraw_update_decalque',
  },

  DEFAULT_PALETTE: [
    [0, 0, 0],
    [255, 255, 255],
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [255, 255, 0],
    [255, 128, 0],
    [128, 0, 255],
    [255, 0, 255],
    [0, 255, 255],
    [128, 128, 128],
    [128, 0, 0],
    [0, 128, 0],
    [0, 0, 128],
    [255, 192, 203],
    [210, 180, 140],
  ],
};

window.AutoDraw.Settings = {
  defaults: {
    speed: 50,
    resolution: 64,
    drawMode: 'zigzag',
    antiAlias: false,
    colorDelay: 50,
    autoStart: false,
    theme: 'dark',
    language: 'en',
    decalqueOpacity: 50,
    decalqueScale: 100,
    decalqueBrightness: 100,
    decalqueContrast: 100,
    decalqueSaturation: 100,
    decalqueGrayscale: false,
    decalqueInvert: false,
    decalqueEdgeDetect: false,
    decalqueHiddenColors: [],
    decalqueAutoColor: false,
    decalqueAutoPress: false,
    overlaySpeed: 80,
    overlayResolution: 64,
  },

  async load() {
    try {
      const result = await chrome.storage.local.get('autodrawSettings');
      return { ...this.defaults, ...(result.autodrawSettings || {}) };
    } catch {
      return { ...this.defaults };
    }
  },

  async save(settings) {
    try {
      await chrome.storage.local.set({ autodrawSettings: settings });
    } catch (e) {
      console.error('AutoDraw: Failed to save settings:', e);
    }
  },

  async get(key) {
    const settings = await this.load();
    return settings[key] ?? this.defaults[key];
  },

  async set(key, value) {
    const settings = await this.load();
    settings[key] = value;
    await this.save(settings);
  },

  async exportSettings() {
    const settings = await this.load();
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'autodraw-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  async importSettings(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          const merged = { ...this.defaults, ...imported };
          await this.save(merged);
          resolve(merged);
        } catch (err) {
          reject(new Error('Invalid settings file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  },
};
