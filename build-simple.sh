#!/bin/bash

# Script de build simplifié pour éviter les problèmes CSP
echo "🚀 Build de l'extension YouTube Shorts Counter..."

# Créer le dossier dist
mkdir -p dist

# Copier les fichiers nécessaires
echo "📁 Copie des fichiers..."
cp public/manifest.json dist/
cp public/*.png dist/
cp public/*.svg dist/
cp chart.js dist/
cp background.js dist/
cp popup.html dist/
cp popup.js dist/

echo "✅ Build terminé ! Fichiers disponibles dans ./dist/"
echo "📦 Prêt pour installation en tant qu'extension de navigateur"

# Lister les fichiers créés
echo "📋 Fichiers générés :"
ls -la dist/
