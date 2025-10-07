// === MODULES INTÉGRÉS ===

// === Module Achievements ===
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

// === Module Counter ===
const countedUrls = new Map();

function incrementCounter(getStorage, setStorage, updateBadge, startWatchTimer, endWatchTimer, checkAchievements, checkAndResetStreak, applyAdvancedBlocking) {
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
    setStorage(dataToStore).catch((error) => {
      console.error('Erreur lors de la sauvegarde du compteur:', error);
    });
    startWatchTimer();
    checkAchievements();
    if (newCount >= currentMaxShorts) {
      endWatchTimer();
      checkAndResetStreak();
      applyAdvancedBlocking(newCount, currentMaxShorts, currentPauseDuration);
    }
  }).catch((error) => {
    console.error('Erreur lors de l\'incrémentation du compteur:', error);
  });
}

function resetCounter(setStorage, updateBadge) {
  countedUrls.clear();
  setStorage({ 
    shortsCount: 0, 
    pauseUntil: 0 
  }).then(() => {
    updateBadge('counting', 0);
    console.log('Compteur réinitialisé avec succès');
  }).catch((error) => {
    console.error('Erreur lors de la réinitialisation:', error);
  });
}

function checkAndResetStreak(getStorage, setStorage) {
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

// === Module WatchTime ===
const activeYouTubeTabs = {};
let shortStartTime = null;

function startWatchTimer() {
  shortStartTime = Date.now();
}

function endWatchTimer(addWatchTime) {
  if (shortStartTime) {
    const watchDuration = Date.now() - shortStartTime;
    addWatchTime(watchDuration);
    shortStartTime = null;
  }
}

function addWatchTime(duration, getStorage, setStorage, calculateAverageWatchTime) {
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

function calculateAverageWatchTime(getStorage, setStorage) {
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

async function processWatchTime(tabId, endTime, getStorage, setStorage, addDebugLog) {
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

// === Module Blocking ===
async function applyAdvancedBlocking(newCount, maxShorts, pauseDuration, getStorage, setStorage, updateBadge) {
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

async function applyPauseBlocking(tabId, url, remainingMinutes, getStorage, updateBadge, redirectToYouTube) {
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

// === IMPORTS EXTERNES ===
// Note: importScripts fonctionne dans les background scripts Firefox
// mais pas dans les service workers Chrome
try {
  if (typeof importScripts !== 'undefined') {
    importScripts('improvements.js');
    importScripts('blocking-modes.js');
  }
} catch (error) {
  console.warn('Could not import external scripts:', error);
}

// === UTILITAIRES ===
function getToday() {
  return new Date().toISOString().slice(0, 10);
}

async function getStorage(keys) {
  return await browser.storage.local.get(keys);
}

async function setStorage(obj) {
  return await browser.storage.local.set(obj);
}

// Initialiser le compteur si nécessaire
browser.storage.local.get(['shortsCount', 'pauseUntil']).then((result) => {
  if (!result.shortsCount) {
    browser.storage.local.set({ shortsCount: 0 });
  }
  const pauseUntil = result.pauseUntil || 0;
  if (Date.now() < pauseUntil) {
    updateBadge('paused');
  } else {
    updateBadge('counting', result.shortsCount || 0);
  }
});

// === ACHIEVEMENTS SYSTEM ===

// Ajouter une option pour rendre le nombre de Shorts paramétrable
let maxShorts = 10; // Valeur par défaut
let pauseDuration = 5; // Valeur par défaut

// Charger la valeur depuis le stockage si elle existe
browser.storage.local.get(['maxShorts', 'pauseDuration']).then((result) => {
  if (result.maxShorts) {
    maxShorts = result.maxShorts;
  }
  if (result.pauseDuration) {
    pauseDuration = result.pauseDuration;
  }
});
// Fonction pour mettre à jour le badge en fonction de l'état
function updateBadge(state, value) {
  let text = '';
  let color = '#FF0000'; // Rouge par défaut pour le comptage

  if (state === 'counting') {
    text = value.toString();
  } else if (state === 'paused') {
    text = '❚❚'; // Symbole de pause
    color = '#FFA500'; // Orange pour la pause
  }

  // Utiliser browser.action (Manifest V3) avec fallback vers browser.browserAction (Manifest V2)
  try {
    if (browser.action) {
      browser.action.setBadgeText({ text: text });
      browser.action.setBadgeBackgroundColor({ color: color });
    } else if (browser.browserAction) {
      browser.browserAction.setBadgeText({ text: text });
      browser.browserAction.setBadgeBackgroundColor({ color: color });
    }
  } catch (error) {
    console.warn('Erreur lors de la mise à jour du badge:', error);
    // Fallback pour mobile - sauvegarder l'état dans le storage pour l'affichage popup
    browser.storage.local.set({ 
      badgeState: { state, value, text, color },
      lastBadgeUpdate: Date.now()
    });
  }
}

// Regex pour détecter les URLs YouTube Shorts (desktop et mobile)
const shortsRegex = /^https?:\/\/(?:www\.|m\.)?youtube\.com\/shorts(?:\/.*)?$/;
const mobileShortsRegex = /^https?:\/\/(?:youtu\.be\/.*|youtube\.com\/.*[?&]v=.*&.*shorts|.*youtube.*\/shorts)/;

// Fonction pour vérifier si l'URL est un Short
function isShortsUrl(url) {
  if (!url) return false;
  
  console.log(`🔍 Vérification URL: ${url}`);
  
  // Test avec les regex principaux
  const regexMatch = shortsRegex.test(url) || mobileShortsRegex.test(url);
  console.log(`📝 Regex match: ${regexMatch}`);
  
  if (regexMatch) {
    console.log(`✅ URL Shorts détectée par regex: ${url}`);
    return true;
  }
  
  // Test additionnel pour URLs mobiles spécifiques
  const containsMatch = url.includes('youtube.com') && (url.includes('/shorts/') || url.includes('/shorts'));
  console.log(`📝 Contains match: ${containsMatch}`);
  
  if (containsMatch) {
    console.log(`✅ URL Shorts détectée par contains: ${url}`);
    return true;
  }
  
  // Debug logging pour toutes les URLs YouTube
  if (url.includes('youtube.com')) {
    console.log(`❌ URL YouTube NON détectée comme Short: ${url}`);
  }
  
  return false;
}

// Fonction de redirection centralisée
async function redirectToYouTube(tabId, url) {
  if (isShortsUrl(url)) {
    const platformInfo = await browser.runtime.getPlatformInfo();
    let newUrl;

    if (platformInfo.os === 'android' || platformInfo.os === 'ios') {
      // Mobile OS: Redirect to mobile YouTube feed
      newUrl = 'https://m.youtube.com/feed/subscriptions'; // Or trending, etc.
      addDebugLog(`Redirection mobile: ${url} -> ${newUrl}`);
    } else {
      // Desktop OS: Redirect to main YouTube page (or try to find full video URL)
      // For now, keep it simple: redirect to main YouTube
      newUrl = url.replace(/\/shorts\/[^\/]+/, '');
      addDebugLog(`Redirection desktop: ${url} -> ${newUrl}`);
    }
    browser.tabs.update(tabId, { url: newUrl });
  }
}

/**
 * Listener : messages reçus depuis le popup ou d'autres scripts.
 * Permet de réinitialiser le compteur via l'UI.
 * @param {object} message - Message reçu
 * @param {object} sender - Infos sur l'expéditeur
 * @param {function} sendResponse - Callback pour répondre
 */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'resetCounter') {
    resetCounter(setStorage, updateBadge);
    // Envoyer une réponse pour confirmer le reset
    sendResponse({ success: true, message: 'Compteur réinitialisé' });
  }
});

// Map pour stocker les URLs déjà comptées

// Flag global pour activer/désactiver les logs de debug
let DEBUG_LOG_ENABLED = false;
getStorage(['debugLogEnabled']).then((result) => {
  DEBUG_LOG_ENABLED = !!result.debugLogEnabled;
});

function addDebugLog(message) {
  if (!DEBUG_LOG_ENABLED) return;
  getStorage('debugLogs').then((result) => {
    const debugLogs = result.debugLogs || [];
    const timestamp = new Date().toLocaleTimeString();
    debugLogs.push(`[${timestamp}] ${message}`);
    // Keep only the last 50 logs to prevent excessive storage use
    if (debugLogs.length > 50) {
      debugLogs.shift();
    }
    setStorage({ debugLogs: debugLogs });
  });
}

/**
 * Listener principal : surveille les changements d'URL des onglets.
 * Gère le blocage, le compteur de Shorts et le tracking du temps de visionnage.
 * @param {number} tabId - ID de l'onglet modifié
 * @param {object} changeInfo - Infos sur le changement (ex : nouvelle URL)
 * @param {object} tab - Objet onglet complet
 */
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  console.log(`🔄 Tab updated - ID: ${tabId}, URL: ${changeInfo.url}, Status: ${changeInfo.status}`);
  
  // Regrouper les accès au storage pour éviter les lectures multiples
  if (changeInfo.url) {
    const result = await getStorage([
      'pauseUntil', 'shortsCount', 'maxShorts', 'pauseDuration', 'dailyCounts'
    ]);
    const pauseUntil = result.pauseUntil || 0;
    const shortsCount = result.shortsCount || 0;
    const maxShorts = result.maxShorts || 10;
    const pauseDuration = result.pauseDuration || 5;
    const dailyCounts = result.dailyCounts || {};
    // --- Blocage/compteur Shorts ---
    console.log(`⏰ Pause check - pauseUntil: ${pauseUntil}, now: ${Date.now()}, inPause: ${pauseUntil > 0 && Date.now() < pauseUntil}`);
    if (pauseUntil > 0 && Date.now() < pauseUntil) {
      console.log(`⏸️ Pause active - blocage de l'accès`);
      // Pause encore active - bloquer l'accès aux Shorts
      if (isShortsUrl(changeInfo.url)) {
        const remainingMinutes = Math.ceil((pauseUntil - Date.now()) / 60000);
        applyPauseBlocking(tabId, changeInfo.url, remainingMinutes, getStorage, updateBadge, redirectToYouTube);
        return;
      }
    }
    if (pauseUntil > 0 && Date.now() > pauseUntil) {
      resetCounter(setStorage, updateBadge);
      return;
    }
    if (isShortsUrl(changeInfo.url)) {
      console.log(`🎯 URL Shorts détectée: ${changeInfo.url}`);
      console.log(`🗂️ countedUrls.has(${changeInfo.url}): ${countedUrls.has(changeInfo.url)}`);
      console.log(`🗂️ countedUrls.size: ${countedUrls.size}`);
      if (!countedUrls.has(changeInfo.url)) {
        console.log(`📊 Incrémentation du compteur pour: ${changeInfo.url}`);
        countedUrls.set(changeInfo.url, Date.now());
        // Utiliser les données déjà récupérées pour éviter un double accès au storage
        const newCount = shortsCount + 1;
        const today = getToday();
        const updatedDailyCounts = { ...dailyCounts };
        updatedDailyCounts[today] = (updatedDailyCounts[today] || 0) + 1;
        
        // Sauvegarder immédiatement
        setStorage({ 
          shortsCount: newCount, 
          dailyCounts: updatedDailyCounts 
        }).catch((error) => {
          console.error('Erreur lors de la sauvegarde:', error);
        });
        
        // Mettre à jour l'UI
        updateBadge('counting', newCount);
        startWatchTimer();
        
        // Vérifier les achievements
        checkAchievements(getStorage, (id) => unlockAchievement(id, getStorage, setStorage));
        
        // Vérifier si limite atteinte
        if (newCount >= maxShorts) {
          endWatchTimer((d) => addWatchTime(d, getStorage, setStorage, () => calculateAverageWatchTime(getStorage, setStorage)));
          checkAndResetStreak(getStorage, setStorage);
          applyAdvancedBlocking(newCount, maxShorts, pauseDuration, getStorage, setStorage, updateBadge);
        }
        setTimeout(() => {
          countedUrls.delete(changeInfo.url);
        }, 5000);
      }
    } else {
      endWatchTimer((d) => addWatchTime(d, getStorage, setStorage, () => calculateAverageWatchTime(getStorage, setStorage)));
    }
  }
  // --- Tracking du temps de visionnage ---
  if (changeInfo.url && activeYouTubeTabs[tabId]) {
    await processWatchTime(tabId, Date.now(), getStorage, setStorage, addDebugLog);
  }
  if (tab.url && tab.url.includes('youtube.com') && !activeYouTubeTabs[tabId]) {
    activeYouTubeTabs[tabId] = Date.now();
    addDebugLog(`Tracking started for tab ${tabId}: ${tab.url}`);
  }
});

/**
 * Listener : déclenché à la fermeture d'un onglet.
 * Termine le tracking du temps de visionnage pour cet onglet si besoin.
 * @param {number} tabId - ID de l'onglet fermé
 */
browser.tabs.onRemoved.addListener(async (tabId) => {
  await processWatchTime(tabId, Date.now(), getStorage, setStorage, addDebugLog);
});

/**
 * Listener : changement de focus de fenêtre navigateur.
 * Stoppe ou démarre le tracking du temps de visionnage selon le focus.
 * @param {number} windowId - ID de la fenêtre (ou WINDOW_ID_NONE si perte de focus)
 */
browser.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === browser.windows.WINDOW_ID_NONE) { // Browser lost focus
    addDebugLog('Browser lost focus. Stopping all active YouTube tab tracking.');
    for (const tabId in activeYouTubeTabs) {
      await processWatchTime(tabId, Date.now(), getStorage, setStorage, addDebugLog);
    }
  } else { // Browser gained focus
    addDebugLog('Browser gained focus. Checking active YouTube tabs.');
    const window = await browser.windows.get(windowId, { populate: true });
    if (window.focused && window.tabs) {
      const activeTab = window.tabs.find(t => t.active);
      if (activeTab && activeTab.url && activeTab.url.includes('youtube.com') && !activeYouTubeTabs[activeTab.id]) {
        activeYouTubeTabs[activeTab.id] = Date.now();
        addDebugLog(`Tracking started for tab ${activeTab.id}: ${activeTab.url}`);
      }
    }
  }
});

// === WATCH TIME TRACKING ===

// Fonction pour vérifier les achievements
// (SUPPRIMÉE car remplacée par le module achievements.js)

// Fonction pour appliquer le blocage avancé selon le mode configuré
// (SUPPRIMÉE car remplacée par le module blocking.js)

// Fonction pour appliquer le blocage pendant la pause
// (SUPPRIMÉE car remplacée par le module blocking.js)

// Vérification périodique de l'état de pause
function checkPauseStatus() {
  getStorage(['pauseUntil']).then((result) => {
    const pauseUntil = result.pauseUntil || 0;
    const now = Date.now();
    
    if (pauseUntil > 0) {
      if (now < pauseUntil) {
        // Pause toujours active
        updateBadge('paused');
        console.log(`Pause active jusqu'à: ${new Date(pauseUntil).toLocaleTimeString()}`);
      } else {
        // Pause expirée, nettoyer et réinitialiser
        console.log('Pause expirée, nettoyage...');
        setStorage({ pauseUntil: 0 });
        getStorage(['shortsCount']).then((countResult) => {
          updateBadge('counting', countResult.shortsCount || 0);
        });
      }
    }
  });
}

// Listener alternatif pour les navigations
browser.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId === 0 && details.url) { // Frame principal seulement
    console.log(`🌐 Navigation completed - URL: ${details.url}`);
    
    if (isShortsUrl(details.url)) {
      console.log(`🎯 URL Shorts détectée via webNavigation: ${details.url}`);
      
      // Récupérer les données du storage
      const result = await getStorage([
        'pauseUntil', 'shortsCount', 'maxShorts', 'pauseDuration', 'dailyCounts'
      ]);
      const pauseUntil = result.pauseUntil || 0;
      const shortsCount = result.shortsCount || 0;
      const maxShorts = result.maxShorts || 10;
      const pauseDuration = result.pauseDuration || 5;
      const dailyCounts = result.dailyCounts || {};
      
      // Vérifier si on est en pause
      if (pauseUntil > 0 && Date.now() < pauseUntil) {
        const remainingMinutes = Math.ceil((pauseUntil - Date.now()) / 60000);
        applyPauseBlocking(details.tabId, details.url, remainingMinutes, getStorage, updateBadge, redirectToYouTube);
        return;
      }
      
      // Vérifier si l'URL n'a pas déjà été comptée
      if (!countedUrls.has(details.url)) {
        console.log(`📊 Incrémentation du compteur via webNavigation pour: ${details.url}`);
        countedUrls.set(details.url, Date.now());
        
        // Incrémenter le compteur
        const newCount = shortsCount + 1;
        const today = getToday();
        const updatedDailyCounts = { ...dailyCounts };
        updatedDailyCounts[today] = (updatedDailyCounts[today] || 0) + 1;
        
        // Sauvegarder
        setStorage({ 
          shortsCount: newCount, 
          dailyCounts: updatedDailyCounts 
        }).catch((error) => {
          console.error('Erreur lors de la sauvegarde:', error);
        });
        
        // Mettre à jour l'UI
        updateBadge('counting', newCount);
        startWatchTimer();
        
        // Vérifier les achievements
        checkAchievements(getStorage, (id) => unlockAchievement(id, getStorage, setStorage));
        
        // Vérifier si limite atteinte
        if (newCount >= maxShorts) {
          endWatchTimer((d) => addWatchTime(d, getStorage, setStorage, () => calculateAverageWatchTime(getStorage, setStorage)));
          checkAndResetStreak(getStorage, setStorage);
          applyAdvancedBlocking(newCount, maxShorts, pauseDuration, getStorage, setStorage, updateBadge);
        }
        
        // Nettoyer après 5 secondes
        setTimeout(() => {
          countedUrls.delete(details.url);
        }, 5000);
      }
    }
  }
});

// Vérifier l'état de pause toutes les 30 secondes
setInterval(checkPauseStatus, 30000);

// Extension initialization - tab listeners are sufficient for tracking