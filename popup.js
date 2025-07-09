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
  browser.storage.local.get([
    'dailyCounts', 
    'currentStreak', 
    'bestStreak', 
    'maxShorts',
    'avgTimePerShort',
    'unlockedAchievements'
  ]).then((result) => {
    const dailyCounts = result.dailyCounts || {};
    const currentStreak = result.currentStreak || 0;
    const bestStreak = result.bestStreak || 0;
    const maxShorts = result.maxShorts || 10;
    const avgTimePerShort = result.avgTimePerShort || 0;
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
    
    // Calculer le streak actuel
    updateStreakCount(dailyCounts, maxShorts);
    
    document.getElementById('today-count').textContent = todayCount;
    document.getElementById('week-total').textContent = weekTotal;
    document.getElementById('current-streak').textContent = currentStreak;
    document.getElementById('best-streak').textContent = bestStreak;
    
    // Afficher le temps moyen par short
    displayAverageTime(avgTimePerShort);
    
    // Afficher les achievements
    displayAchievements(result.unlockedAchievements || []);
  });
}

function updateStreakCount(dailyCounts, maxShorts) {
  let streak = 0;
  const today = new Date();
  
  // Vérifier les jours précédents en remontant
  for (let i = 0; i < 30; i++) { // Vérifier jusqu'à 30 jours
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateString = d.toISOString().slice(0, 10);
    const dayCount = dailyCounts[dateString] || 0;
    
    if (dayCount <= maxShorts) {
      streak++;
    } else {
      break; // Arrêter dès qu'on trouve un jour dépassé
    }
  }
  
  browser.storage.local.get(['currentStreak', 'bestStreak']).then((result) => {
    const currentStreak = result.currentStreak || 0;
    const bestStreak = result.bestStreak || 0;
    
    if (streak !== currentStreak) {
      const newBest = Math.max(bestStreak, streak);
      browser.storage.local.set({ 
        currentStreak: streak, 
        bestStreak: newBest 
      });
      
      // Notification pour nouveau record
      if (streak > bestStreak && streak > 0) {
        browser.notifications.create({
          type: "basic",
          iconUrl: "icon48.png",
          title: "🏆 Nouveau Record !",
          message: `Félicitations ! ${streak} jours consécutifs sans dépasser votre limite !`
        });
      }
    }
  });
}

function updateSettingsDisplay() {
  browser.storage.local.get(['maxShorts', 'pauseDuration', 'blockingMode']).then((result) => {
    const maxShorts = result.maxShorts || 10;
    const pauseDuration = result.pauseDuration || 5;
    const blockingMode = result.blockingMode || 'standard';

    document.getElementById('current-limit').textContent = `Limite: ${maxShorts} shorts`;
    document.getElementById('max-shorts').value = maxShorts;

    document.getElementById('current-pause').textContent = `Pause: ${pauseDuration} minutes`;
    document.getElementById('pause-duration').value = pauseDuration;
    
    document.getElementById('blocking-mode').value = blockingMode;
    
    // Display friendly mode name
    const modeNames = {
      'gentle': '🌸 Mode Doux',
      'standard': '⚡ Mode Standard',
      'strict': '🔒 Mode Strict',
      'adaptive': '🤖 Mode Adaptatif'
    };
    document.getElementById('current-mode').textContent = `Mode: ${modeNames[blockingMode] || 'Standard'}`;
  });
}

function saveSettings(event) {
  event.preventDefault();
  const newMaxShorts = parseInt(document.getElementById('max-shorts').value, 10);
  const newPauseDuration = parseInt(document.getElementById('pause-duration').value, 10);
  const newBlockingMode = document.getElementById('blocking-mode').value;

  const settingsToUpdate = {};
  if (newMaxShorts && newMaxShorts > 0) {
    settingsToUpdate.maxShorts = newMaxShorts;
  }
  if (newPauseDuration && newPauseDuration > 0) {
    settingsToUpdate.pauseDuration = newPauseDuration;
  }
  if (newBlockingMode) {
    settingsToUpdate.blockingMode = newBlockingMode;
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

function displayAverageTime(avgTimeMs) {
  const avgTimeElement = document.getElementById('avg-time');
  if (avgTimeElement) {
    if (avgTimeMs > 0) {
      const seconds = Math.round(avgTimeMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      
      if (minutes > 0) {
        avgTimeElement.textContent = `${minutes}m ${remainingSeconds}s`;
      } else {
        avgTimeElement.textContent = `${seconds}s`;
      }
    } else {
      avgTimeElement.textContent = '--';
    }
  }
}

function displayAchievements(unlockedAchievements) {
  const achievementsContainer = document.getElementById('achievements-container');
  if (!achievementsContainer) return;
  
  const achievements = {
    'first_day': { name: 'Premier Jour', icon: '🌟', description: 'Première limite respectée !' },
    'week_clean': { name: '7 Jours Clean', icon: '🔥', description: '7 jours consécutifs sans dépasser' },
    'month_clean': { name: 'Mois Parfait', icon: '👑', description: '30 jours consécutifs sans dépasser' },
    'speed_demon': { name: 'Speed Demon', icon: '⚡', description: 'Plus de 50 shorts en une journée' },
    'early_bird': { name: 'Lève-tôt', icon: '🌅', description: '5 jours d\'affilée avec limite respectée avant 18h' }
  };
  
  achievementsContainer.innerHTML = '';
  
  if (unlockedAchievements.length === 0) {
    achievementsContainer.innerHTML = '<div class="no-achievements">Aucun achievement débloqué pour le moment</div>';
    return;
  }
  
  unlockedAchievements.forEach(achievementId => {
    const achievement = achievements[achievementId];
    if (achievement) {
      const achievementDiv = document.createElement('div');
      achievementDiv.className = 'achievement-badge';
      achievementDiv.innerHTML = `
        <span class="achievement-icon">${achievement.icon}</span>
        <div class="achievement-info">
          <div class="achievement-name">${achievement.name}</div>
          <div class="achievement-desc">${achievement.description}</div>
        </div>
      `;
      achievementsContainer.appendChild(achievementDiv);
    }
  });
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Set up event listeners
  const settingsForm = document.getElementById('settings-form');
  const resetButton = document.getElementById('reset-counter');
  
  if (settingsForm) {
    settingsForm.addEventListener('submit', saveSettings);
  }
  
  if (resetButton) {
    resetButton.addEventListener('click', handleReset);
  }
  
  // Initial load of data
  updateCounter();
  updateStats();
  updateSettingsDisplay();
  renderWeeklyChart();
  renderWatchTimeChart();
});