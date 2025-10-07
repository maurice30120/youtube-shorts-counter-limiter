// === Module Achievements ===
/**
 * Objet contenant la définition des achievements disponibles.
 * @type {Object}
 */
const achievements = {
  FIRST_DAY: {
    id: 'first_day',
    name: 'Premier Jour',
    description: 'Première limite respectée !',
    icon: '🌟'
  },
  WEEK_CLEAN: {
    id: 'week_clean',
    name: '7 Jours Clean',
    description: '7 jours consécutifs sans dépasser',
    icon: '🔥'
  },
  MONTH_CLEAN: {
    id: 'month_clean',
    name: 'Mois Parfait',
    description: '30 jours consécutifs sans dépasser',
    icon: '👑'
  },
  SPEED_DEMON: {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Plus de 50 shorts en une journée',
    icon: '⚡'
  },
  EARLY_BIRD: {
    id: 'early_bird',
    name: 'Lève-tôt',
    description: '5 jours d\'affilée avec limit respectée avant 18h',
    icon: '🌅'
  }
};

/**
 * Vérifie et débloque les achievements selon l'état actuel du streak et des compteurs.
 * @returns {Promise<void>}
 */
async function checkAchievements(getStorage, unlockAchievement) {
  const result = await getStorage([
    'currentStreak',
    'unlockedAchievements',
    'dailyCounts',
    'maxShorts'
  ]);
  const streak = result.currentStreak || 0;
  const unlocked = result.unlockedAchievements || [];
  const dailyCounts = result.dailyCounts || {};
  const maxShorts = result.maxShorts || 10;
  const today = (new Date()).toISOString().slice(0, 10);
  const todayCount = dailyCounts[today] || 0;

  if (streak >= 1 && !unlocked.includes('first_day')) {
    await unlockAchievement('first_day');
  }
  if (streak >= 7 && !unlocked.includes('week_clean')) {
    await unlockAchievement('week_clean');
  }
  if (streak >= 30 && !unlocked.includes('month_clean')) {
    await unlockAchievement('month_clean');
  }
  if (todayCount >= 50 && !unlocked.includes('speed_demon')) {
    await unlockAchievement('speed_demon');
  }
}

/**
 * Débloque un achievement et affiche une notification.
 * @param {string} achievementId
 * @param {Function} getStorage
 * @param {Function} setStorage
 * @returns {Promise<void>}
 */
async function unlockAchievement(achievementId, getStorage, setStorage) {
  const result = await getStorage('unlockedAchievements');
  const unlocked = result.unlockedAchievements || [];
  if (!unlocked.includes(achievementId)) {
    unlocked.push(achievementId);
    await setStorage({ unlockedAchievements: unlocked });
    const achievement = achievements[achievementId.toUpperCase()];
    browser.notifications.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: `🏆 Achievement Débloqué !`,
      message: `${achievement.icon} ${achievement.name}: ${achievement.description}`
    });
    console.log(`Achievement unlocked: ${achievement.name}`);
  }
} 