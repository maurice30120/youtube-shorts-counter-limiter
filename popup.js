// Mettre à jour l'affichage du compteur
function updateCounter() {
  browser.storage.local.get('shortsCount').then((result) => {
    document.getElementById('counter').textContent = result.shortsCount || 0;
  });
}

// Mettre à jour l'affichage de la limite
function updateLimitDisplay() {
  browser.storage.local.get('maxShorts').then((result) => {
    const maxShorts = result.maxShorts || 10;
    document.getElementById('current-limit').textContent = `Limite actuelle: ${maxShorts}`;
    document.getElementById('max-shorts').value = maxShorts;
  });
}

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', () => {
  updateCounter();
  updateLimitDisplay();
  
  // Gestion du bouton reset
  const resetBtn = document.getElementById('reset-counter');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      browser.storage.local.set({ shortsCount: 0 }).then(() => {
        updateCounter();
        // Mettre à jour le badge
        browser.runtime.sendMessage({ action: 'updateBadge', count: 0 });
      });
    });
  }
});

// Gestion du formulaire de paramètres
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('settings-form');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const newValue = parseInt(document.getElementById('max-shorts').value, 10);
      
      if (newValue && newValue > 0) {
        browser.storage.local.set({ maxShorts: newValue }).then(() => {
          updateLimitDisplay();
          // Notification visuelle
          const button = form.querySelector('button');
          const originalText = button.textContent;
          button.textContent = 'Sauvegardé!';
          button.style.background = '#4caf50';
          
          setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '#1976d2';
          }, 1500);
        });
      }
    });
  }
});

// Mettre à jour le compteur toutes les secondes
setInterval(updateCounter, 1000); 