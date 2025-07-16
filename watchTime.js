// === Module WatchTime ===

/**
 * Objet pour suivre le temps de visionnage par tabId.
 * @type {Object<number, number>}
 */
export const activeYouTubeTabs = {};

let shortStartTime = null;

/**
 * Démarre le timer de visionnage d'un Short.
 */
export function startWatchTimer() {
  shortStartTime = Date.now();
}

/**
 * Termine le timer de visionnage d'un Short et ajoute la durée au total.
 * @param {Function} addWatchTime
 */
export function endWatchTimer(addWatchTime) {
  if (shortStartTime) {
    const watchDuration = Date.now() - shortStartTime;
    addWatchTime(watchDuration);
    shortStartTime = null;
  }
}

/**
 * Ajoute une durée de visionnage au total et à la journée, puis recalcule la moyenne.
 * @param {number} duration
 * @param {Function} getStorage
 * @param {Function} setStorage
 * @param {Function} calculateAverageWatchTime
 */
export function addWatchTime(duration, getStorage, setStorage, calculateAverageWatchTime) {
  getStorage(['dailyWatchTime', 'totalWatchTime']).then((result) => {
    const today = (new Date()).toISOString().slice(0, 10);
    const dailyWatchTime = result.dailyWatchTime || {};
    const totalWatchTime = result.totalWatchTime || 0;
    dailyWatchTime[today] = (dailyWatchTime[today] || 0) + duration;
    setStorage({
      dailyWatchTime,
      totalWatchTime: totalWatchTime + duration
    });
    calculateAverageWatchTime();
  });
}

/**
 * Calcule et met à jour le temps moyen de visionnage par Short.
 * @param {Function} getStorage
 * @param {Function} setStorage
 */
export function calculateAverageWatchTime(getStorage, setStorage) {
  getStorage(['dailyWatchTime', 'dailyCounts']).then((result) => {
    const dailyWatchTime = result.dailyWatchTime || {};
    const dailyCounts = result.dailyCounts || {};
    let totalTime = 0;
    let totalShorts = 0;
    Object.keys(dailyWatchTime).forEach(date => {
      totalTime += dailyWatchTime[date] || 0;
      totalShorts += dailyCounts[date] || 0;
    });
    const avgTimePerShort = totalShorts > 0 ? totalTime / totalShorts : 0;
    setStorage({ avgTimePerShort });
  });
}

/**
 * Traite le temps de visionnage pour un tab donné (YouTube).
 * @param {number} tabId
 * @param {number} endTime
 * @param {Function} getStorage
 * @param {Function} setStorage
 * @param {Function} addDebugLog
 */
export async function processWatchTime(tabId, endTime, getStorage, setStorage, addDebugLog) {
  if (activeYouTubeTabs[tabId]) {
    const startTime = activeYouTubeTabs[tabId];
    const duration = endTime - startTime;
    if (duration > 0) {
      addDebugLog(`Tracking stopped for tab ${tabId}. Duration: ${duration} ms.`);
      const result = await getStorage('dailyWatchTime');
      const dailyWatchTime = result.dailyWatchTime || {};
      const today = (new Date()).toISOString().slice(0, 10);
      dailyWatchTime[today] = (dailyWatchTime[today] || 0) + duration;
      await setStorage({ dailyWatchTime: dailyWatchTime });
      addDebugLog(`Temps de visionnage YouTube mis à jour pour ${today}: ${dailyWatchTime[today]} ms`);
    }
    delete activeYouTubeTabs[tabId];
  }
} 