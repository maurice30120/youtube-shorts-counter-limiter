// === Module Blocking ===

/**
 * Applique le blocage avancé selon le mode configuré.
 * @param {number} newCount
 * @param {number} maxShorts
 * @param {number} pauseDuration
 * @param {Function} getStorage
 * @param {Function} setStorage
 * @param {Function} updateBadge
 */
export async function applyAdvancedBlocking(newCount, maxShorts, pauseDuration, getStorage, setStorage, updateBadge) {
  try {
    const result = await getStorage(['blockingMode']);
    const blockingMode = result.blockingMode || 'standard';
    const platformInfo = await browser.runtime.getPlatformInfo();
    const isMobile = platformInfo.os === 'android' || platformInfo.os === 'ios';
    const context = {
      currentCount: newCount,
      maxShorts: maxShorts,
      pauseDuration: pauseDuration,
      limitExceeded: true,
      isMobile: isMobile,
      title: '🚫 Limite atteinte',
      message: `Vous avez atteint votre limite de ${maxShorts} Shorts`,
      count: newCount
    };
    if (typeof BlockingModeManager !== 'undefined') {
      await BlockingModeManager.applyBlockingMode(blockingMode, context);
    } else {
      const pauseUntil = Date.now() + pauseDuration * 60 * 1000;
      await setStorage({ pauseUntil });
      updateBadge('paused');
    }
  } catch (error) {
    console.error('Erreur lors de l\'application du blocage avancé:', error);
  }
}

/**
 * Applique le blocage pendant la pause.
 * @param {number} tabId
 * @param {string} url
 * @param {number} remainingMinutes
 * @param {Function} getStorage
 * @param {Function} updateBadge
 * @param {Function} redirectToYouTube
 */
export async function applyPauseBlocking(tabId, url, remainingMinutes, getStorage, updateBadge, redirectToYouTube) {
  try {
    const result = await getStorage(['blockingMode']);
    const blockingMode = result.blockingMode || 'standard';
    const platformInfo = await browser.runtime.getPlatformInfo();
    const isMobile = platformInfo.os === 'android' || platformInfo.os === 'ios';
    const context = {
      tabId: tabId,
      url: url,
      originalUrl: url,
      remainingMinutes: remainingMinutes,
      isPause: true,
      isMobile: isMobile,
      title: '⏸️ Pause en cours',
      message: `Veuillez attendre encore ${remainingMinutes} minutes`
    };
    if (typeof BlockingModeManager !== 'undefined') {
      await BlockingModeManager.applyBlockingMode(blockingMode, context);
    } else {
      browser.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'Pause en cours',
        message: `Veuillez attendre encore ${remainingMinutes} minutes.`
      });
      redirectToYouTube(tabId, url);
    }
    updateBadge('paused');
  } catch (error) {
    console.error('Erreur lors de l\'application du blocage pendant la pause:', error);
    redirectToYouTube(tabId, url);
  }
} 