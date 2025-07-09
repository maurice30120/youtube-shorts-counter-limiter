

function updateCounter() {
  browser.storage.local.get('shortsCount').then((result) => {
    const count = result.shortsCount || 0;
    document.getElementById('counter').textContent = count;
  });
}

function updateSettingsDisplay() {
  browser.storage.local.get(['maxShorts', 'pauseDuration']).then((result) => {
    const maxShorts = result.maxShorts || 10;
    const pauseDuration = result.pauseDuration || 5;

    document.getElementById('current-limit').textContent = `Limite actuelle: ${maxShorts}`;
    document.getElementById('max-shorts').value = maxShorts;

    document.getElementById('current-pause').textContent = `Pause actuelle: ${pauseDuration} minutes`;
    document.getElementById('pause-duration').value = pauseDuration;
  });
}

function saveSettings(event) {
  event.preventDefault();
  const newMaxShorts = parseInt(document.getElementById('max-shorts').value, 10);
  const newPauseDuration = parseInt(document.getElementById('pause-duration').value, 10);

  const settingsToUpdate = {};
  if (newMaxShorts && newMaxShorts > 0) {
    settingsToUpdate.maxShorts = newMaxShorts;
  }
  if (newPauseDuration && newPauseDuration > 0) {
    settingsToUpdate.pauseDuration = newPauseDuration;
  }

  if (Object.keys(settingsToUpdate).length > 0) {
      browser.storage.local.set(settingsToUpdate).then(() => {
        const button = document.querySelector('#settings-form button');
        const originalText = button.textContent;
        button.textContent = 'Sauvegardé!';
        button.style.background = '#4caf50';

        setTimeout(() => {
            button.textContent = 'Sauvegarder';
            button.style.background = '#1976d2';
        }, 1500);
    });
  }
}

function handleReset() {
    browser.runtime.sendMessage({ action: 'resetCounter' });
    // Fournir un retour visuel immédiat
    document.getElementById('counter').textContent = '0';
}

document.addEventListener('DOMContentLoaded', () => {
  // Initial display updates
  updateCounter();
  updateSettingsDisplay();

  // Set up event listeners
  document.getElementById('settings-form').addEventListener('submit', saveSettings);
  document.getElementById('reset-counter').addEventListener('click', handleReset);

  // Listen for storage changes to keep the UI in sync
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.shortsCount) {
        document.getElementById('counter').textContent = changes.shortsCount.newValue || 0;
      }
      if (changes.maxShorts || changes.pauseDuration) {
        updateSettingsDisplay();
      }
    }
  });
});
