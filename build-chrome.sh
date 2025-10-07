#!/bin/bash

# Script de build pour Chrome/Edge
echo "🔧 Building for Chrome/Edge..."

# Copier le manifest Chrome
cp public/manifest-chrome.json public/manifest.json

# Créer le dossier de build
mkdir -p build/chrome

# Copier tous les fichiers nécessaires
cp -r public/* build/chrome/
cp background.js build/chrome/
cp popup.js build/chrome/
cp popup.html build/chrome/
cp improvements.js build/chrome/
cp blocking-modes.js build/chrome/

echo "✅ Build Chrome terminé dans build/chrome/"
echo "📦 Vous pouvez maintenant charger build/chrome/ comme extension non packagée dans Chrome/Edge"
