<div align="center">

  <img src="icons/icon128.png" width="120" alt="AutoDraw Logo">

  # AutoDraw Extension

  **Desenho automatico em jogos de desenho**

  [![GitHub release](https://img.shields.io/badge/version-2.0.0-purple?style=for-the-badge)](https://github.com/MCookinho/AutoDraw-Extension)
  [![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)
  [![Chrome](https://img.shields.io/badge/Chrome-MV3-blue?style=for-the-badge&logo=google-chrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
  [![Platforms](https://img.shields.io/badge/platforms-Win%20%7C%20Mac%20%7C%20Linux-orange?style=for-the-badge)]()

  <br>

  Envie uma imagem e o AutoDraw desenha ela automaticamente no canvas do jogo,
  usando as cores disponiveis na palette, com movimentos que imitam um desenho real.

  <br>

  [**Como Instalar**](#como-instalar) • [**Como Usar**](#como-usar) • [**Sites Suportados**](#sites-suportados) • [**Funcionalidades**](#funcionalidades)

</div>

---

## O Que e o AutoDraw?

O AutoDraw e uma extensao para navegadores baseados em Chromium (Chrome, Edge, Brave) que automatiza o desenho em jogos online. Ele processa uma imagem que voce envia, mapeia as cores para a palette disponivel no jogo, e desenha pixel a pixel usando o Chrome DevTools Protocol (CDP) para simular eventos reais de mouse.

### Como Funciona

```
  Sua Imagem          Processamento           Desenho no Jogo
 ┌──────────┐      ┌──────────────┐      ┌──────────────────┐
 │ /upload/  │ ──>  │ Redimensiona │ ──>  │  CDP mouse moves │
 │  imagem   │      │ Mapeia cores │      │  Corretas cores  │
 │  QUALQUER │      │ Agrupa areas │      │  Modo escolhido  │
 └──────────┘      └──────────────┘      └──────────────────┘
```

---

## Funcionalidades

<table>
<tr>
<td width="50%">

### Modos de Desenho

| Modo | Descricao |
|:-----|:----------|
| **Zigzag** | Preenchimento em ziguezague, mais natural |
| **Espiral** | Desenho em espiral do centro para fora |
| **Bordas Primeiro** | Contorno da regiao, depois preenchimento |
| **Aleatorio** | Segmentos em ordem aleatoria |
| **Dentro para Fora** | Comeca pelo centro e vai para as bordas |

</td>
<td width="50%">

### Controles

| Configuracao | Descricao |
|:-------------|:----------|
| **Velocidade** | 1 a 100 (quanto maior, mais rapido) |
| **Resolucao** | 16 a 256 pixels (detalhe da imagem) |
| **Delay entre cores** | 0 a 500ms de pausa ao trocar cor |
| **Anti-aliasing** | Pontos intermediarios nas bordas |
| **Auto-start** | Comeca a desenhar ao abrir o overlay |

</td>
</tr>
</table>

### Modo Decalque

Uma sobreposicao transparente da imagem de referencia sobre o canvas do jogo, com filtros configuraveis:

- **Opacidade** — Controla a transparencia (5% a 100%)
- **Escala** — Redimensiona o overlay (20% a 300%)
- **Filtros** — Brilho, contraste, saturacao, escala de cinza, inverter, deteccao de contornos
- **Eyedropper** — Pressione **ESPACO** sobre a imagem para pegar a cor naquele ponto

### Atalhos de Teclado

| Atalho | Acao |
|:-------|:-----|
| `Ctrl+Shift+D` | Abrir/Fechar overlay |
| `Ctrl+Shift+S` | Iniciar desenho |
| `Ctrl+Shift+X` | Parar desenho |
| `Ctrl+Shift+T` | Alternar modo decalque |

### Mais

- **3 idiomas** — English, Portugues, Espanol
- **Tema claro/escuro** — Interface com efeito Glassmorphism
- **Exportar/Importar** — Salve e restaure suas configuracoes
- **Palette** — Veja as cores disponiveis no jogo
- **Persistencia** — Imagem salva automaticamente, nao perde em F5

---

## Sites Suportados

| Site | URL | Status |
|:-----|:----|:-------|
| Gartic | `gartic.io` | Suportado |
| Gartic Phone | `garticphone.com` | Suportado |
| Sketch.io | `sketch.io` | Suportado |
| Drawize | `drawize.com` | Suportado |

---

## Como Instalar

<br>

> **Nao e necessario publicar na Chrome Web Store!** Voce carrega a extensao direto da pasta.

<br>

### Passo 1 — Baixar o Repositorio

```bash
git clone https://github.com/MCookinho/AutoDraw-Extension.git
```

Ou clique em **Code > Download ZIP** no GitHub e extraia.

<br>

### Passo 2 — Abrir a Pagina de Extensoes

No seu navegador, digite na barra de endereco:

```
chrome://extensions/
```

<br>

### Passo 3 — Ativar Modo Desenvolvedor

No canto superior direito, ative o toggle **"Modo Desenvolvedor"**:

```
[ ] Modo Desenvolvedor  ──>  [x] Modo Desenvolvedor
```

<br>

### Passo 4 — Carregar a Extensao

1. Clique em **"Carregar extensao descompactada"**
2. Selecione a pasta `autodraw-extension`
3. Pronto! O icone do AutoDraw aparece na barra de ferramentas

<br>

### Para Firefox

1. Abra `about:debugging#/runtime/this-firefox`
2. Clique em **"Carregar Complemento Temporario"**
3. Selecione qualquer arquivo dentro da pasta

---

## Como Usar

<br>

### 1. Acesse um Jogo Suportado

Abra o Gartic Phone (ou qualquer site suportado) e entre em uma sala de desenho.

<br>

### 2. Envie uma Imagem

Clique no icone do AutoDraw e arraste uma imagem ou clique para selecionar.

```
┌─────────────────────────────────┐
│                                 │
│   ┌───────────────────────┐     │
│   │                       │     │
│   │   Solte a imagem aqui │     │
│   │   ou clique para       │     │
│   │   enviar              │     │
│   │                       │     │
│   │   PNG, JPG, GIF, MP4  │     │
│   └───────────────────────┘     │
│                                 │
└─────────────────────────────────┘
```

<br>

### 3. Abra as Ferramentas

Clique em **"Abrir Ferramentas"**. Um overlay flutuante aparecera no jogo.

<br>

### 4. Selecione a Area

- **Canvas** — Detecta o canvas automaticamente
- **Selecionar** — Desenha um retangulo manualmente

<br>

### 5. Inicie o Desenho

Clique em **"Iniciar desenho"** e aguarde a barra de progresso.

<br>

### Importante: Debugger

O Gartic Phone exige que voce clique em **"Proceed"** na barra amarela que aparece no topo da pagina. Sem isso, o CDP nao consegue controlar o mouse.

---

## Estrutura do Projeto

```
autodraw-extension/
├── manifest.json                  Configuracao da extensao (Manifest V3)
│
├── background/
│   └── background.js              Service worker (atalhos + CDP)
│
├── popup/
│   ├── popup.html                 Interface do popup
│   ├── popup.css                  Estilos Glassmorphism
│   └── popup.js                   Logica do popup
│
├── content/
│   ├── content.js                 Script principal (bridge popup <-> adapter)
│   ├── overlay.js                 Overlay flutuante
│   ├── overlay.css                Estilos do overlay
│   ├── area-selector.js           Selecao manual de area
│   ├── area-selector.css          Estilos do seletor
│   └── site-adapters/
│       ├── gartic.js              Adaptador Gartic
│       ├── gartic-phone.js        Adaptador Gartic Phone
│       ├── sketch.js              Adaptador Sketch.io
│       └── drawize.js             Adaptador Drawize
│
├── shared/
│   ├── i18n.js                    Internacionalizacao (EN/PT/ES)
│   ├── constants.js               Configuracoes e defaults
│   ├── color-matcher.js           Matching de cores RGB
│   ├── image-processor.js         Processamento de imagem
│   └── drawing-engine.js          Motor de desenho com CDP
│
└── icons/                         Icones da extensao
```

---

## Desenvolvimento

### Tecnologias

- **Manifest V3** — Arquitetura moderna de extensoes Chrome
- **Chrome DevTools Protocol** — Controle direto do mouse via CDP
- **Canvas API** — Processamento e analise de imagem
- **React Fiber Walking** — Deteccao de estado de cor em apps React
- **Glassmorphism** — Interface com blur, transparencia e gradientes

### Adicionando Suporte a um Novo Site

1. Crie um adaptador em `content/site-adapters/`
2. Implemente os metodos obrigatorios:

```javascript
window.AutoDraw.NewSiteAdapter = (() => {
  function init() { /* detectar canvas e ferramentas */ }
  function isActive() { /* retorna true se o canvas foi encontrado */ }
  function getCanvas() { /* retorna o elemento canvas */ }
  function setColor(hexColor) { /* define a cor ativa no jogo */ }
  function refresh() { /* re-detecta canvas e ferramentas */ }
  return { name: 'NewSiteAdapter', init, isActive, getCanvas, setColor, refresh };
})();
```

3. Adicione o site em `SUPPORTED_SITES` em `shared/constants.js`
4. Adicione o site em `host_permissions` e `content_scripts` no `manifest.json`

---

## Troubleshooting

| Problema | Solucao |
|:---------|:--------|
| Canvas nao encontrado | Entre em uma sala de desenho ativa |
| Barra amarela aparecendo | Clique em **"Proceed"** para habilitar o CDP |
| Cores erradas | Verifique a aba Palette no popup |
| Desenho muito lento | Reduza a resolucao ou aumente a velocidade |
| Imagem nao carrega | Recarregue a pagina e reabra o overlay |
| Overlay nao abre | Verifique se voce esta em um site suportado |

---

## Licenca

[MIT](LICENSE) — Sinta-se livre para usar, modificar e distribuir.

---

<div align="center">

Feito com dedicao por **MCookinho**

[![GitHub](https://img.shields.io/badge/GitHub-MCookinho-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/MCookinho)

</div>
