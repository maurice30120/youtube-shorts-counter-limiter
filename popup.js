// popup.js

function updateCounter() {
  browser.storage.local.get(['shortsCount', 'maxShorts', 'pauseUntil']).then((result) => {
    const count = result.shortsCount || 0;
    const maxShorts = result.maxShorts || 10;
    const pauseUntil = result.pauseUntil || 0;
    
    document.getElementById('counter').textContent = count;
    
    // Mettre à jour la barre de progression
    const progressPercent = Math.min((count / maxShorts) * 100, 100);
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
      progressFill.style.width = `${progressPercent}%`;
    }
    
    // Afficher l'état de pause si actif
    const counterLabel = document.querySelector('.counter-label');
    if (Date.now() < pauseUntil) {
      const remainingMinutes = Math.ceil((pauseUntil - Date.now()) / 60000);
      counterLabel.textContent = `⏸️ Pause en cours (${remainingMinutes} min restantes)`;
      counterLabel.style.color = '#feca57';
    } else {
      counterLabel.textContent = 'Shorts vus cette session';
      counterLabel.style.color = '';
    }
  });
}

function updateStats() {
  browser.storage.local.get('dailyCounts').then((result) => {
    const dailyCounts = result.dailyCounts || {};
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = dailyCounts[today] || 0;
    
    // Calculer le total de la semaine
    let weekTotal = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().slice(0, 10);
      weekTotal += dailyCounts[dateString] || 0;
    }
    
    document.getElementById('today-count').textContent = todayCount;
    document.getElementById('week-total').textContent = weekTotal;
  });
}

function updateSettingsDisplay() {
  browser.storage.local.get(['maxShorts', 'pauseDuration']).then((result) => {
    const maxShorts = result.maxShorts || 10;
    const pauseDuration = result.pauseDuration || 5;

    document.getElementById('current-limit').textContent = `Limite: ${maxShorts} shorts`;
    document.getElementById('max-shorts').value = maxShorts;

    document.getElementById('current-pause').textContent = `Pause: ${pauseDuration} minutes`;
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
        updateSettingsDisplay();
        updateCounter(); // Mettre à jour la barre de progression
        
        const button = document.querySelector('#settings-form button');
        const originalText = button.textContent;
        button.textContent = '✅ Sauvegardé!';
        button.style.background = 'linear-gradient(45deg, #4caf50, #45a049)';

        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = 'linear-gradient(45deg, #4facfe, #00f2fe)';
        }, 2000);
    });
  }
}

function handleReset() {
    browser.runtime.sendMessage({ action: 'resetCounter' });
    // Fournir un retour visuel immédiat
    document.getElementById('counter').textContent = '0';
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
      progressFill.style.width = '0%';
    }
    updateStats();
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
          backgroundColor: 'rgba(79, 172, 254, 0.3)',
          borderColor: 'rgba(79, 172, 254, 0.8)',
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: 'rgba(255, 255, 255, 0.8)',
              callback: function(value) {if (Number.isInteger(value)) {return value;}}
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
              borderColor: 'rgba(255, 255, 255, 0.2)'
            }
          },
          x: {
            ticks: {
              color: 'rgba(255, 255, 255, 0.8)'
            },
            grid: {
              display: false
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1
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
          backgroundColor: 'rgba(255, 202, 87, 0.3)',
          borderColor: 'rgba(255, 202, 87, 0.8)',
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: 'rgba(255, 255, 255, 0.8)',
              callback: function(value) {
                return value + ' min';
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
              borderColor: 'rgba(255, 255, 255, 0.2)'
            }
          },
          x: {
            ticks: {
              color: 'rgba(255, 255, 255, 0.8)'
            },
            grid: {
              display: false
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                return context.parsed.y + ' minutes';
              }
            }
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
  updateStats();
  updateSettingsDisplay();
  renderWeeklyChart();
  renderWatchTimeChart();

  // Set up event listeners
  document.getElementById('settings-form').addEventListener('submit', saveSettings);
  document.getElementById('reset-counter').addEventListener('click', handleReset);

  // Listen for storage changes to keep the UI in sync
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.shortsCount) {
        updateCounter();
      }
      if (changes.dailyCounts) {
        updateStats();
        renderWeeklyChart();
      }
      if (changes.maxShorts || changes.pauseDuration) {
        updateSettingsDisplay();
        updateCounter(); // Pour mettre à jour la barre de progression
      }
    }
  });

  // Mettre à jour les données toutes les 2 secondes
  setInterval(() => {
    updateCounter();
    updateStats();
  }, 2000);
});