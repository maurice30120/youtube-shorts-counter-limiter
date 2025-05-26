// Mettre à jour l'affichage du compteur
function updateCounter() {
  browser.storage.local.get('shortsCount').then((result) => {
    document.getElementById('counter').textContent = result.shortsCount || 0;
  });
}

// Mettre à jour le compteur au chargement
document.addEventListener('DOMContentLoaded', updateCounter);

// Mettre à jour le compteur toutes les secondes
setInterval(updateCounter, 1000); 