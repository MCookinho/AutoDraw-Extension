window.AutoDraw = window.AutoDraw || {};

window.AutoDraw.I18n = (() => {
  let currentLang = 'en';

  const translations = {
    en: {
      // Sidebar
      tab_home: 'Home',
      tab_settings: 'Settings',
      tab_mode: 'Mode',
      tab_palette: 'Palette',
      tab_logs: 'Logs',
      tooltip_home: 'Home',
      tooltip_settings: 'Settings',
      tooltip_mode: 'Mode',
      tooltip_palette: 'Palette',
      tooltip_logs: 'Logs',
      tooltip_theme: 'Theme',

      // Home
      home_title: 'Home',
      status_checking: 'Checking...',
      status_ready: 'Ready:',
      status_supported: 'Supported:',
      status_not_supported: 'Not supported:',
      status_no_tab: 'No active tab',
      status_error_site: 'Error checking site',
      status_canvas_not_found: 'Canvas not found. Join a drawing room.',
      upload_drop: 'Drop image here or click to upload',
      upload_hint: 'PNG, JPG, GIF, MP4',
      preview: 'Preview',
      open_tools: 'Open Tools',
      supported_sites: 'Supports: Gartic, Gartic Phone, Sketch.io, Drawize',

      // Settings
      settings_title: 'Settings',
      drawing_title: 'Drawing',
      speed: 'Speed',
      resolution: 'Resolution',
      draw_mode: 'Draw mode',
      draw_mode_zigzag: 'Zigzag',
      draw_mode_spiral: 'Spiral',
      draw_mode_edges_first: 'Edges first',
      draw_mode_random: 'Random',
      draw_mode_inside_out: 'Inside out',
      color_delay: 'Color delay (ms)',
      anti_aliasing: 'Anti-aliasing',
      auto_start: 'Auto-start',
      language: 'Language',

      // Shortcuts
      shortcuts_title: 'Shortcuts',
      shortcut_toggle_overlay: 'Toggle overlay',
      shortcut_start_draw: 'Start drawing',
      shortcut_stop_draw: 'Stop drawing',
      shortcut_toggle_decalque: 'Toggle decalque',

      // Settings buttons
      settings_section_title: 'Settings',
      export: 'Export',
      import: 'Import',

      // Mode
      mode_title: 'Mode',
      mode_auto_draw: 'Auto draw',
      mode_decalque: 'Decalque',
      decalque_transparency_scale: 'Transparency and scale',
      opacity: 'Opacity',
      scale: 'Scale',
      reposition: 'Reposition',
      decalque_filters: 'Filters',
      brightness: 'Brightness',
      contrast: 'Contrast',
      saturation: 'Saturation',
      grayscale: 'Grayscale',
      invert_colors: 'Invert colors',
      edge_detection: 'Edge detection',
      reset_filters: 'Reset filters',
      overlay_colors: 'Overlay colors',
      overlay_colors_desc: 'Click to remove/restore colors from decalque',

      // Palette
      palette_title: 'Palette',
      game_colors: 'Game colors',
      no_palette: 'No palette detected',

      // Logs
      logs_title: 'Logs',
      clear: 'Clear',
      no_logs: 'No logs yet',
      settings_imported: 'Settings imported successfully',
      error_import: 'Error importing: ',

      // Overlay
      overlay_draw: 'Draw',
      overlay_decalque: 'Decalque',
      overlay_ready: 'Ready',
      overlay_drawing: 'Drawing...',
      overlay_area: 'Drawing area',
      overlay_select: 'Select',
      overlay_start: 'Start drawing',
      overlay_stop: 'Stop',
      overlay_canvas: 'Canvas',
      overlay_canvas_0x0: 'Canvas 0x0 — wait for room to load',
      overlay_area_selected: 'Area selected',
      overlay_color_picked: 'Color:',
      overlay_minimize: 'Minimize',
      overlay_close: 'Close',

      // Content alerts
      alert_canvas_not_found: 'Canvas not found. Join a drawing room.',
      alert_no_image: 'No image loaded.',
      alert_no_area: 'Select the drawing area.',

      // Dynamic
      colors_unit: 'colors',
    },

    pt: {
      tab_home: 'Início',
      tab_settings: 'Configurações',
      tab_mode: 'Modo',
      tab_palette: 'Paleta',
      tab_logs: 'Logs',
      tooltip_home: 'Início',
      tooltip_settings: 'Configurações',
      tooltip_mode: 'Modo',
      tooltip_palette: 'Paleta',
      tooltip_logs: 'Logs',
      tooltip_theme: 'Tema',

      home_title: 'Início',
      status_checking: 'Verificando...',
      status_ready: 'Pronto:',
      status_supported: 'Suportado:',
      status_not_supported: 'Não suportado:',
      status_no_tab: 'Nenhuma aba ativa',
      status_error_site: 'Erro ao verificar site',
      status_canvas_not_found: 'Canvas não encontrado. Entre em uma sala de desenho.',
      upload_drop: 'Solte a imagem aqui ou clique para enviar',
      upload_hint: 'PNG, JPG, GIF, MP4',
      preview: 'Pré-visualização',
      open_tools: 'Abrir Ferramentas',
      supported_sites: 'Suporta: Gartic, Gartic Phone, Sketch.io, Drawize',

      settings_title: 'Configurações',
      drawing_title: 'Desenho',
      speed: 'Velocidade',
      resolution: 'Resolução',
      draw_mode: 'Modo de desenho',
      draw_mode_zigzag: 'Zigzag',
      draw_mode_spiral: 'Espiral',
      draw_mode_edges_first: 'Bordas primeiro',
      draw_mode_random: 'Aleatório',
      draw_mode_inside_out: 'Dentro para fora',
      color_delay: 'Atraso entre cores (ms)',
      anti_aliasing: 'Anti-aliasing',
      auto_start: 'Auto-início',
      language: 'Idioma',

      shortcuts_title: 'Atalhos',
      shortcut_toggle_overlay: 'Alternar overlay',
      shortcut_start_draw: 'Iniciar desenho',
      shortcut_stop_draw: 'Parar desenho',
      shortcut_toggle_decalque: 'Alternar decalque',

      settings_section_title: 'Configurações',
      export: 'Exportar',
      import: 'Importar',

      mode_title: 'Modo',
      mode_auto_draw: 'Desenho automático',
      mode_decalque: 'Decalque',
      decalque_transparency_scale: 'Transparência e escala',
      opacity: 'Opacidade',
      scale: 'Escala',
      reposition: 'Reposicionar',
      decalque_filters: 'Filtros',
      brightness: 'Brilho',
      contrast: 'Contraste',
      saturation: 'Saturação',
      grayscale: 'Escala de cinza',
      invert_colors: 'Inverter cores',
      edge_detection: 'Detecção de contornos',
      reset_filters: 'Redefinir filtros',
      overlay_colors: 'Cores no overlay',
      overlay_colors_desc: 'Clique para remover/restaurar cores do decalque',

      palette_title: 'Paleta',
      game_colors: 'Cores do jogo',
      no_palette: 'Nenhuma paleta detectada',

      logs_title: 'Logs',
      clear: 'Limpar',
      no_logs: 'Nenhum log ainda',
      settings_imported: 'Configurações importadas com sucesso',
      error_import: 'Erro ao importar: ',

      overlay_draw: 'Desenhar',
      overlay_decalque: 'Decalque',
      overlay_ready: 'Pronto',
      overlay_drawing: 'Desenhando...',
      overlay_area: 'Área de desenho',
      overlay_select: 'Selecionar',
      overlay_start: 'Iniciar desenho',
      overlay_stop: 'Parar',
      overlay_canvas: 'Canvas',
      overlay_canvas_0x0: 'Canvas 0x0 — aguarde a sala carregar',
      overlay_area_selected: 'Área do canvas selecionada',
      overlay_color_picked: 'Cor:',
      overlay_minimize: 'Minimizar',
      overlay_close: 'Fechar',

      alert_canvas_not_found: 'Canvas não encontrado. Entre em uma sala de desenho.',
      alert_no_image: 'Nenhuma imagem carregada.',
      alert_no_area: 'Selecione a área de desenho.',

      colors_unit: 'cores',
    },

    es: {
      tab_home: 'Inicio',
      tab_settings: 'Configuración',
      tab_mode: 'Modo',
      tab_palette: 'Paleta',
      tab_logs: 'Registros',
      tooltip_home: 'Inicio',
      tooltip_settings: 'Configuración',
      tooltip_mode: 'Modo',
      tooltip_palette: 'Paleta',
      tooltip_logs: 'Registros',
      tooltip_theme: 'Tema',

      home_title: 'Inicio',
      status_checking: 'Verificando...',
      status_ready: 'Listo:',
      status_supported: 'Soportado:',
      status_not_supported: 'No soportado:',
      status_no_tab: 'Sin pestaña activa',
      status_error_site: 'Error al verificar sitio',
      status_canvas_not_found: 'Lienzo no encontrado. Entra en una sala de dibujo.',
      upload_drop: 'Suelta la imagen aquí o haz clic para enviar',
      upload_hint: 'PNG, JPG, GIF, MP4',
      preview: 'Vista previa',
      open_tools: 'Abrir Herramientas',
      supported_sites: 'Soporta: Gartic, Gartic Phone, Sketch.io, Drawize',

      settings_title: 'Configuración',
      drawing_title: 'Dibujo',
      speed: 'Velocidad',
      resolution: 'Resolución',
      draw_mode: 'Modo de dibujo',
      draw_mode_zigzag: 'Zigzag',
      draw_mode_spiral: 'Espiral',
      draw_mode_edges_first: 'Bordes primero',
      draw_mode_random: 'Aleatorio',
      draw_mode_inside_out: 'Dentro hacia afuera',
      color_delay: 'Retraso entre colores (ms)',
      anti_aliasing: 'Anti-aliasing',
      auto_start: 'Auto-inicio',
      language: 'Idioma',

      shortcuts_title: 'Atajos',
      shortcut_toggle_overlay: 'Alternar overlay',
      shortcut_start_draw: 'Iniciar dibujo',
      shortcut_stop_draw: 'Detener dibujo',
      shortcut_toggle_decalque: 'Alternar calco',

      settings_section_title: 'Configuración',
      export: 'Exportar',
      import: 'Importar',

      mode_title: 'Modo',
      mode_auto_draw: 'Dibujo automático',
      mode_decalque: 'Calco',
      decalque_transparency_scale: 'Transparencia y escala',
      opacity: 'Opacidad',
      scale: 'Escala',
      reposition: 'Reposicionar',
      decalque_filters: 'Filtros',
      brightness: 'Brillo',
      contrast: 'Contraste',
      saturation: 'Saturación',
      grayscale: 'Escala de grises',
      invert_colors: 'Invertir colores',
      edge_detection: 'Detección de bordes',
      reset_filters: 'Restablecer filtros',
      overlay_colors: 'Colores del overlay',
      overlay_colors_desc: 'Haz clic para eliminar/restaurar colores del calco',

      palette_title: 'Paleta',
      game_colors: 'Colores del juego',
      no_palette: 'Ninguna paleta detectada',

      logs_title: 'Registros',
      clear: 'Limpiar',
      no_logs: 'Sin registros aún',
      settings_imported: 'Configuración importada con éxito',
      error_import: 'Error al importar: ',

      overlay_draw: 'Dibujar',
      overlay_decalque: 'Calco',
      overlay_ready: 'Listo',
      overlay_drawing: 'Dibujando...',
      overlay_area: 'Área de dibujo',
      overlay_select: 'Seleccionar',
      overlay_start: 'Iniciar dibujo',
      overlay_stop: 'Detener',
      overlay_canvas: 'Lienzo',
      overlay_canvas_0x0: 'Lienzo 0x0 — espera a que la sala cargue',
      overlay_area_selected: 'Área del lienzo seleccionada',
      overlay_color_picked: 'Color:',
      overlay_minimize: 'Minimizar',
      overlay_close: 'Cerrar',

      alert_canvas_not_found: 'Lienzo no encontrado. Entra en una sala de dibujo.',
      alert_no_image: 'Ninguna imagen cargada.',
      alert_no_area: 'Selecciona el área de dibujo.',

      colors_unit: 'colores',
    },
  };

  function t(key, fallback) {
    const lang = translations[currentLang] || translations.en;
    return lang[key] || translations.en[key] || fallback || key;
  }

  function setLanguage(lang) {
    if (translations[lang]) {
      currentLang = lang;
    } else {
      currentLang = 'en';
    }
  }

  function getLanguage() {
    return currentLang;
  }

  function applyTranslations(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translated = t(key);
      if (el.tagName === 'OPTION') {
        el.textContent = translated;
      } else if (el.hasAttribute('data-i18n-placeholder')) {
        el.placeholder = translated;
      } else {
        el.textContent = translated;
      }
    });
    root.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.getAttribute('data-i18n-title'));
    });
  }

  function getSupportedLanguages() {
    return [
      { code: 'en', name: 'English' },
      { code: 'pt', name: 'Português' },
      { code: 'es', name: 'Español' },
    ];
  }

  return {
    t,
    setLanguage,
    getLanguage,
    applyTranslations,
    getSupportedLanguages,
  };
})();
