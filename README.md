# YouTube Shorts Counter

Une extension Firefox qui compte le nombre de YouTube Shorts visités et redirige vers youtube.com après 10 Shorts.

## Fonctionnalités

- Compte le nombre de YouTube Shorts visités
- Affiche le compteur sur l'icône de l'extension
- Redirige automatiquement vers youtube.com après 10 Shorts
- Réinitialise le compteur à chaque nouvel onglet ou redirection

## Installation

1. Clonez ce dépôt
2. Ouvrez Firefox
3. Tapez `about:debugging` dans la barre d'adresse
4. Cliquez sur "Ce Firefox"
5. Cliquez sur "Charger un module temporaire"
6. Sélectionnez le fichier `manifest.json` de l'extension

## Structure du projet

- `manifest.json` : Configuration de l'extension
- `background.js` : Logique principale de l'extension
- `popup.html` : Interface utilisateur de la popup
- `popup.js` : Logique de la popup
- `icon.svg` : Icône de l'extension (à convertir en PNG)

## Développement

Pour modifier l'extension :

1. Modifiez les fichiers source
2. Rechargez l'extension dans `about:debugging`
3. Testez les modifications

## Licence

MIT 