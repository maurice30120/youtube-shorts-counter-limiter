// === Module Counter ===

/**
 * Map pour stocker les URLs déjà comptées (évite les doublons rapides).
 * @type {Map<string, number>}
 */
export const countedUrls = new Map();

/**
 * Incrémente le compteur de Shorts, met à jour le badge, l'historique quotidien et vérifie les achievements.
 * @param {Function} getStorage
 * @param {Function} setStorage
 * @param {Function} updateBadge
 * @param {Function} startWatchTimer
 * @param {Function} endWatchTimer
 * @param {Function} checkAchievements
 * @param {Function} checkAndResetStreak
 * @param {Function} applyAdvancedBlocking
 */
export function incrementCounter(getStorage, setStorage, updateBadge, startWatchTimer, endWatchTimer, checkAchievements, checkAndResetStreak, applyAdvancedBlocking) {
  getStorage(['shortsCount', 'maxShorts', 'pauseDuration', 'dailyCounts']).then((result) => {
    const newCount = (result.shortsCount || 0) + 1;
    const currentMaxShorts = result.maxShorts || 10;
    const currentPauseDuration = result.pauseDuration || 5;
    let dataToStore = { shortsCount: newCount };
    updateBadge('counting', newCount);
    const today = (new Date()).toISOString().slice(0, 10);
    const dailyCounts = result.dailyCounts || {};
    dailyCounts[today] = (dailyCounts[today] || 0) + 1;
    dataToStore.dailyCounts = dailyCounts;
    setStorage(dataToStore);
    startWatchTimer();
    checkAchievements();
    if (newCount >= currentMaxShorts) {
      endWatchTimer();
      checkAndResetStreak();
      applyAdvancedBlocking(newCount, currentMaxShorts, currentPauseDuration);
    }
  });
}

/**
 * Réinitialise le compteur et la pause, puis met à jour le badge.
 * @param {Function} setStorage
 * @param {Function} updateBadge
 */
export function resetCounter(setStorage, updateBadge) {
  setStorage({ shortsCount: 0, pauseUntil: 0 });
  updateBadge('counting', 0);
}

/**
 * Vérifie si la limite de Shorts est dépassée et réinitialise le streak si besoin.
 * @param {Function} getStorage
 * @param {Function} setStorage
 */
export function checkAndResetStreak(getStorage, setStorage) {
  getStorage(['maxShorts', 'dailyCounts', 'currentStreak']).then((result) => {
    const maxShorts = result.maxShorts || 10;
    const dailyCounts = result.dailyCounts || {};
    const currentStreak = result.currentStreak || 0;
    const today = (new Date()).toISOString().slice(0, 10);
    const todayCount = dailyCounts[today] || 0;
    if (todayCount >= maxShorts && currentStreak > 0) {
      setStorage({ currentStreak: 0 });
      browser.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: '💔 Streak perdu',
        message: `Votre streak de ${currentStreak} jours s\'arrête ici. Vous pouvez recommencer demain !`
      });
    }
  });
} 