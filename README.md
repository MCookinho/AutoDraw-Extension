# AutoDraw Extension

Extensao para Chrome/Edge que desenha imagens automaticamente em jogos de desenho como Gartic, Gartic Phone, Sketch.io e Drawize.

<p align="center">
  <img src="icons/icon128.png" width="100" alt="AutoDraw Icon">
</p>

## Funcionalidades

- **Upload de imagem** — PNG, JPG, GIF e MP4 (extrai o primeiro frame)
- **5 modos de desenho** — Zigzag, Espiral, Bordas primeiro, Aleatorio, Dentro para fora
- **Modo Decalque** — Sobreposicao transparente da imagem de referencia com filtros (brilho, contraste, saturacao, cinza, inverter, deteccao de contornos)
- **Eyedropper (SPACE)** — Pressione ESPACO sobre o decalque para pegar a cor naquele ponto
- **Color picker automatico** — Seleciona a cor correta do palette do jogo
- **Anti-aliasing** — Ponto intermediarios nas fronteiras de cor
- **Delay entre cores** — Configuravel de 0 a 500ms
- **Controle de velocidade e resolucao** — Ajuste fino do desenho
- **Atalhos de teclado** — Ctrl+Shift+D (overlay), Ctrl+Shift+S (iniciar), Ctrl+Shift+X (parar), Ctrl+Shift+T (decalque)
- **Exportar/Importar configuracoes** — Salve e restaure suas preferencias
- **3 idiomas** — English, Portugues, Espanol
- **Tema claro/escuro** — Glassmorphism com gradiente roxo/rosa

## Sites Suportados

| Site | URL |
|------|-----|
| Gartic | gartic.io |
| Graphic Phone | garticphone.com |
| Sketch.io | sketch.io |
| Drawize | drawize.com |

## Como Instalar

### Chrome / Edge / Brave

1. Baixe ou clone este repositorio
2. Abra `chrome://extensions/` (ou `edge://extensions/`)
3. Ative o **"Modo Desenvolvedor"** (toggle no canto superior direito)
4. Clique em **"Carregar extensao descompactada"**
5. Selecione a pasta `autodraw-extension`
6. O icone do AutoDraw aparecera na barra de ferramentas

### Firefox

1. Abra `about:debugging#/runtime/this-firefox`
2. Clique em **"Carregar Complemento Temporario"**
3. Selecione qualquer arquivo dentro da pasta `autodraw-extension`

## Como Usar

1. Acesse um dos sites suportados (ex: garticphone.com)
2. Clique no icone do AutoDraw na barra de ferramentas
3. **Envie uma imagem** — arraste ou clique para selecionar
4. Ajuste a resolucao e velocidade se desejar
5. Clique em **"Abrir Ferramentas"** para mostrar o overlay
6. No overlay:
   - Clique em **"Canvas"** para selecionar a area automaticamente
   - Ou clique em **"Selecionar"** para desenhar um retangulo manualmente
7. Clique em **"Iniciar desenho"**
8. Aguarde a barra de progresso chegar a 100%

### Modo Decalque

1. No overlay, clique na aba **"Decalque"**
2. A imagem sera sobreposta sobre o canvas do jogo
3. Ajuste opacidade, escala e filtros conforme necessario
4. Pressione **ESPACO** sobre a imagem para pegar uma cor

### Dica: Debugger

O Gartic Phone requer que voce clique em **"Proceed"** na barra amarela do debugger antes de comecar. Sem isso, o CDP (Chrome DevTools Protocol) nao consegue controlar o mouse.

## Estrutura do Projeto

```
autodraw-extension/
├── manifest.json              # Configuracao da extensao (MV3)
├── background/
│   └── background.js          # Service worker (atalhos, CDP)
├── popup/
│   ├── popup.html             # Interface do popup
│   ├── popup.css              # Estilos Glassmorphism
│   └── popup.js               # Logica do popup
├── content/
│   ├── content.js             # Script principal do content
│   ├── overlay.js             # Overlay flutuante
│   ├── overlay.css            # Estilos do overlay
│   ├── area-selector.js       # Selecao manual de area
│   ├── area-selector.css      # Estilos do seletor
│   └── site-adapters/         # Adaptadores por site
│       ├── gartic.js
│       ├── gartic-phone.js
│       ├── sketch.js
│       └── drawize.js
├── shared/
│   ├── i18n.js                # Internacionalizacao (EN/PT/ES)
│   ├── constants.js           # Configuracoes e defaults
│   ├── color-matcher.js       # Matching de cores RGB
│   ├── image-processor.js     # Processamento de imagem
│   └── drawing-engine.js      # Motor de desenho com CDP
└── icons/                     # Icones da extensao
```

## Como Funciona

### Processamento da Imagem

1. A imagem e redimensionada para a resolucao escolhida
2. Cada pixel e mapeado para a cor mais proxima do palette do jogo
3. Os pixels sao agrupados por cor e organizados em regioes

### Motor de Desenho

1. O canvas do jogo e detectado automaticamente
2. A area e mapeada com escala proporcional
3. Para cada cor, as regioes sao processadas no modo escolhido
4. Os pontos sao enviados via **CDP** (`Input.dispatchMouseEvent`) para simular o mouse
5. Anti-aliasing e aplicado nas fronteiras de cor

### Modos de Desenho

| Modo | Descricao |
|------|-----------|
| Zigzag | Preenchimento em ziguezague, mais natural |
| Espiral | Desenho em espiral do centro para fora |
| Bordas primeiro | Contorno da regiao, depois preenchimento |
| Aleatorio | Segmentos em ordem aleatoria |
| Dentro para fora | Comeca pelo centro e vai para as bordas |

## Desenvolvimento

### Requisitos

- Google Chrome (ou navegador baseado em Chromium)
- Modo Desenvolvedor ativado

### Adicionando Suporte a um Novo Site

1. Crie um novo adaptador em `content/site-adapters/`
2. Implemente os metodos: `init()`, `setColor(hex)`, `getCanvas()`, `isActive()`, `refresh()`
3. Adicione o site em `SUPPORTED_SITES` em `shared/constants.js`
4. Adicione o site em `host_permissions` e `content_scripts` no `manifest.json`

## Troubleshooting

| Problema | Solucao |
|----------|---------|
| Canvas nao encontrado | Certifique-se de estar em uma sala de desenho ativa |
| "Proceed" aparecendo | Clique na barra amarela do debugger para habilitar CDP |
| Cores erradas | Verifique o palette na aba Palette do popup |
| Desenho muito lento | Reduza a resolucao ou aumente a velocidade |
| Imagem nao carrega | Recarregue a pagina e tente novamente |

## Licenca

MIT
