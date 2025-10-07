#!/bin/bash

# Script de build pour Firefox
echo "🔧 Building for Firefox..."

# Copier le manifest Firefox
cp public/manifest-firefox.json public/manifest.json

# Créer le dossier de build
mkdir -p build/firefox

# Copier tous les fichiers nécessaires
cp -r public/* build/firefox/
cp background.js build/firefox/
cp popup.js build/firefox/
cp popup.html build/firefox/
cp improvements.js build/firefox/
cp blocking-modes.js build/firefox/

echo "✅ Build Firefox terminé dans build/firefox/"
echo "📦 Vous pouvez maintenant charger build/firefox/ comme extension temporaire dans Firefox"
