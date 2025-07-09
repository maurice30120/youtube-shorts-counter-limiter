// popup.js

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

function renderWeeklyChart() {
  browser.storage.local.get('dailyCounts').then((result) => {
    const dailyCounts = result.dailyCounts || {};
    const labels = [];
    const data = [];

    // Prepare data for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().slice(0, 10);
      
      const label = d.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
      
      labels.push(label);
      data.push(dailyCounts[dateString] || 0);
    }

    // Render the chart
    const ctx = document.getElementById('weekly-chart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Shorts Vus',
          data: data,
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {if (Number.isInteger(value)) {return value;}}
            }
          }
        },
        plugins: {
            legend: {
                display: false
            }
        }
      }
    });
  });
}

function renderWatchTimeChart() {
  browser.storage.local.get('dailyWatchTime').then((result) => {
    const dailyWatchTime = result.dailyWatchTime || {};
    const labels = [];
    const data = [];

    // Prepare data for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().slice(0, 10);
      
      const label = d.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
      
      labels.push(label);
      // Convert ms to minutes for display
      const timeInMinutes = Math.round((dailyWatchTime[dateString] || 0) / 60000);
      data.push(timeInMinutes);
    }

    // Render the chart
    const ctx = document.getElementById('watch-time-chart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Minutes Vues',
          data: data,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) { return value + ' min'; }
            }
          }
        },
        plugins: {
            legend: {
                display: false
            }
        }
      }
    });
  });
}

function displayDebugLogs() {
  browser.storage.local.get('debugLogs').then((result) => {
    const debugLogs = result.debugLogs || [];
    const logContainer = document.getElementById('debug-logs');
    logContainer.innerHTML = ''; // Clear previous logs

    if (debugLogs.length === 0) {
      logContainer.textContent = 'Aucun log disponible.';
      return;
    }

    debugLogs.forEach(log => {
      const logEntry = document.createElement('div');
      logEntry.textContent = log;
      logContainer.appendChild(logEntry);
    });
    // Scroll to bottom
    logContainer.scrollTop = logContainer.scrollHeight;
  });
}


document.addEventListener('DOMContentLoaded', () => {
  // Initial display updates
  updateCounter();
  updateSettingsDisplay();
  renderWeeklyChart();
  renderWatchTimeChart();
  displayDebugLogs(); // Display debug logs on load

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
      if (changes.debugLogs) { // Update debug logs if they change
        displayDebugLogs();
      }
    }
  });
});