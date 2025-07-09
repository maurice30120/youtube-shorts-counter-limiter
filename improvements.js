// Nouvelles fonctionnalités à implémenter

// 1. Système de Streaks
function updateStreaks() {
  browser.storage.local.get(['dailyCounts', 'maxShorts', 'currentStreak', 'bestStreak']).then((result) => {
    const dailyCounts = result.dailyCounts || {};
    const maxShorts = result.maxShorts || 10;
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = dailyCounts[today] || 0;
    
    let currentStreak = result.currentStreak || 0;
    let bestStreak = result.bestStreak || 0;
    
    // Si on n'a pas dépassé aujourd'hui, continuer le streak
    if (todayCount <= maxShorts) {
      currentStreak += 1;
      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
      }
    } else {
      currentStreak = 0; // Reset streak
    }
    
    browser.storage.local.set({ currentStreak, bestStreak });
  });
}

// 2. Temps moyen par short
function calculateAverageWatchTime() {
  browser.storage.local.get(['dailyWatchTime', 'dailyCounts']).then((result) => {
    const dailyWatchTime = result.dailyWatchTime || {};
    const dailyCounts = result.dailyCounts || {};
    
    let totalTime = 0;
    let totalShorts = 0;
    
    Object.keys(dailyWatchTime).forEach(date => {
      totalTime += dailyWatchTime[date] || 0;
      totalShorts += dailyCounts[date] || 0;
    });
    
    const avgTimePerShort = totalShorts > 0 ? totalTime / totalShorts : 0;
    browser.storage.local.set({ avgTimePerShort });
  });
}

// 3. Système d'achievements
const achievements = {
  FIRST_DAY: { id: 'first_day', name: 'Premier Jour', description: 'Première limite respectée' },
  WEEK_CLEAN: { id: 'week_clean', name: '7 Jours Clean', description: '7 jours sans dépasser' },
  MONTH_CLEAN: { id: 'month_clean', name: 'Mois Parfait', description: '30 jours consécutifs' },
  REDUCTION_50: { id: 'reduction_50', name: 'Réduction 50%', description: '50% de réduction vs le mois passé' }
};

function checkAchievements() {
  browser.storage.local.get(['currentStreak', 'unlockedAchievements']).then((result) => {
    const streak = result.currentStreak || 0;
    const unlocked = result.unlockedAchievements || [];
    
    // Vérifier les achievements
    if (streak >= 1 && !unlocked.includes('first_day')) {
      unlockAchievement('first_day');
    }
    if (streak >= 7 && !unlocked.includes('week_clean')) {
      unlockAchievement('week_clean');
    }
    if (streak >= 30 && !unlocked.includes('month_clean')) {
      unlockAchievement('month_clean');
    }
  });
}

function unlockAchievement(achievementId) {
  browser.storage.local.get('unlockedAchievements').then((result) => {
    const unlocked = result.unlockedAchievements || [];
    if (!unlocked.includes(achievementId)) {
      unlocked.push(achievementId);
      browser.storage.local.set({ unlockedAchievements: unlocked });
      
      // Notification d'achievement
      const achievement = achievements[achievementId.toUpperCase()];
      browser.notifications.create({
        type: "basic",
        iconUrl: "icon48.png",
        title: "🏆 Achievement Débloqué !",
        message: `${achievement.name}: ${achievement.description}`
      });
    }
  });
}

// 4. Alternatives intelligentes
const alternatives = [
  "Pourquoi pas lire un article sur un sujet qui vous intéresse ?",
  "C'est le moment parfait pour une courte méditation.",
  "Que diriez-vous d'écouter un podcast éducatif ?",
  "Une petite pause pour boire de l'eau et s'étirer ?",
  "Consultez vos objectifs personnels pour cette semaine.",
  "Contactez un ami que vous n'avez pas vu récemment."
];

function suggestAlternative() {
  const randomAlternative = alternatives[Math.floor(Math.random() * alternatives.length)];
  browser.notifications.create({
    type: "basic",
    iconUrl: "icon48.png",
    title: "💡 Suggestion Alternative",
    message: randomAlternative
  });
}

// 5. Mode adaptatif basé sur l'historique
function calculateAdaptiveLimit() {
  browser.storage.local.get('dailyCounts').then((result) => {
    const dailyCounts = result.dailyCounts || {};
    const last7Days = [];
    
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().slice(0, 10);
      last7Days.push(dailyCounts[dateString] || 0);
    }
    
    const average = last7Days.reduce((a, b) => a + b, 0) / 7;
    const suggested = Math.max(1, Math.floor(average * 0.8)); // 20% de réduction
    
    browser.storage.local.set({ suggestedLimit: suggested });
  });
}
