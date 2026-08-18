#!/bin/bash

# Create simple SVG icons and convert to PNG
# This creates placeholder icons - replace with proper icons for production

cd /home/peuborges/Projetos/autodraw-extension/icons

# Create SVG for icon16
cat > icon16.svg << 'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea"/>
      <stop offset="100%" style="stop-color:#764ba2"/>
    </linearGradient>
  </defs>
  <rect width="16" height="16" rx="3" fill="url(#grad)"/>
  <text x="8" y="12" font-family="Arial" font-size="10" font-weight="bold" fill="white" text-anchor="middle">A</text>
</svg>
SVG

# Create SVG for icon48
cat > icon48.svg << 'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea"/>
      <stop offset="100%" style="stop-color:#764ba2"/>
    </linearGradient>
  </defs>
  <rect width="48" height="48" rx="8" fill="url(#grad)"/>
  <text x="24" y="34" font-family="Arial" font-size="28" font-weight="bold" fill="white" text-anchor="middle">AD</text>
</svg>
SVG

# Create SVG for icon128
cat > icon128.svg << 'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea"/>
      <stop offset="100%" style="stop-color:#764ba2"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="16" fill="url(#grad)"/>
  <text x="64" y="88" font-family="Arial" font-size="72" font-weight="bold" fill="white" text-anchor="middle">AD</text>
</svg>
SVG

# Convert SVG to PNG using ImageMagick if available
if command -v convert &> /dev/null; then
    convert icon16.svg icon16.png
    convert icon48.svg icon48.png
    convert icon128.svg icon128.png
    echo "Icons converted to PNG"
else
    echo "ImageMagick not found. Using SVG files directly."
    echo "For Chrome extension, convert SVG to PNG or use online converter."
    cp icon16.svg icon16.png
    cp icon48.svg icon48.png
    cp icon128.svg icon128.png
fi

ls -la
