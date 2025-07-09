// === IMPORTS ===
try {
  importScripts('improvements.js');
  importScripts('blocking-modes.js');
} catch (error) {
  console.warn('Could not import scripts:', error);
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

function checkAchievements() {
  browser.storage.local.get([
    'currentStreak', 
    'unlockedAchievements', 
    'dailyCounts',
    'maxShorts'
  ]).then((result) => {
    const streak = result.currentStreak || 0;
    const unlocked = result.unlockedAchievements || [];
    const dailyCounts = result.dailyCounts || {};
    const maxShorts = result.maxShorts || 10;
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = dailyCounts[today] || 0;
    
    // Achievement: Premier Jour
    if (streak >= 1 && !unlocked.includes('first_day')) {
      unlockAchievement('first_day');
    }
    
    // Achievement: 7 Jours Clean
    if (streak >= 7 && !unlocked.includes('week_clean')) {
      unlockAchievement('week_clean');
    }
    
    // Achievement: Mois Parfait
    if (streak >= 30 && !unlocked.includes('month_clean')) {
      unlockAchievement('month_clean');
    }
    
    // Achievement: Speed Demon
    if (todayCount >= 50 && !unlocked.includes('speed_demon')) {
      unlockAchievement('speed_demon');
    }
  });
}

function unlockAchievement(achievementId) {
  browser.storage.local.get('unlockedAchievements').then((result) => {
    const unlocked = result.unlockedAchievements || [];
    if (!unlocked.includes(achievementId)) {
      unlocked.push(achievementId);
      browser.storage.local.set({ unlockedAchievements: unlocked });
      
      const achievement = achievements[achievementId.toUpperCase()];
      browser.notifications.create({
        type: "basic",
        iconUrl: "icon48.png",
        title: `🏆 Achievement Débloqué !`,
        message: `${achievement.icon} ${achievement.name}: ${achievement.description}`
      });
      
      console.log(`Achievement unlocked: ${achievement.name}`);
    }
  });
}

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

  browser.action.setBadgeText({ text: text });
  browser.action.setBadgeBackgroundColor({ color: color });
}

// Fonction pour réinitialiser le compteur
function resetCounter() {
  console.log('Compteur réinitialisé. shortsCount et pauseUntil remis à 0.');
  browser.storage.local.set({ shortsCount: 0, pauseUntil: 0 });
  updateBadge('counting', 0);
}

// Regex pour détecter les URLs YouTube Shorts
const shortsRegex = /^https?:\/\/(?:www\.|m\.)?youtube\.com\/shorts\/.*$/;

// Fonction pour vérifier si l'URL est un Short
function isShortsUrl(url) {
  return shortsRegex.test(url);
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

// Fonction pour incrémenter le compteur
function incrementCounter() {
  browser.storage.local.get(['shortsCount', 'maxShorts', 'pauseDuration', 'dailyCounts']).then((result) => {
    // --- Logique pour le compteur de session et la pause ---
    const newCount = (result.shortsCount || 0) + 1;
    const currentMaxShorts = result.maxShorts || 10;
    const currentPauseDuration = result.pauseDuration || 5;
    
    let dataToStore = { shortsCount: newCount };

    updateBadge('counting', newCount);
    console.log(`Compteur de session mis à jour: ${newCount}/${currentMaxShorts}`);

    // --- Logique pour l'historique quotidien ---
    const today = new Date().toISOString().slice(0, 10); // Format YYYY-MM-DD
    const dailyCounts = result.dailyCounts || {};
    dailyCounts[today] = (dailyCounts[today] || 0) + 1;
    dataToStore.dailyCounts = dailyCounts;
    console.log(`Compteur du jour (${today}): ${dailyCounts[today]}`);

    // --- Sauvegarder les deux données en même temps ---
    browser.storage.local.set(dataToStore);

    // --- Démarrer le timer de visionnage ---
    startWatchTimer();

    // --- Vérifier les achievements ---
    checkAchievements();

    // --- Vérifier si la limite est atteinte ---
    if (newCount >= currentMaxShorts) {
      // Arrêter le timer de visionnage
      endWatchTimer();
      
      // Réinitialiser le streak car limite dépassée
      checkAndResetStreak();
      
      // Appliquer le mode de blocage configuré
      applyAdvancedBlocking(newCount, currentMaxShorts, currentPauseDuration);
    }
  });
}

// Fonction pour vérifier et réinitialiser le streak si limite dépassée
function checkAndResetStreak() {
  browser.storage.local.get(['maxShorts', 'dailyCounts', 'currentStreak']).then((result) => {
    const maxShorts = result.maxShorts || 10;
    const dailyCounts = result.dailyCounts || {};
    const currentStreak = result.currentStreak || 0;
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = dailyCounts[today] || 0;
    
    if (todayCount >= maxShorts && currentStreak > 0) {
      // Reset du streak car limite dépassée
      browser.storage.local.set({ currentStreak: 0 });
      console.log('Limite dépassée aujourd\'hui - Streak réinitialisé');
      
      // Notification de streak perdu
      browser.notifications.create({
        type: "basic",
        iconUrl: "icon48.png",
        title: "💔 Streak perdu",
        message: `Votre streak de ${currentStreak} jours s'arrête ici. Vous pouvez recommencer demain !`
      });
    }
  });
}

// Écouter les messages depuis le popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'resetCounter') {
    resetCounter();
  }
});

// Map pour stocker les URLs déjà comptées
let countedUrls = new Map();

// Surveiller les changements d'URL
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // S'assurer que l'URL est disponible
  if (!changeInfo.url) {
    return;
  }

  browser.storage.local.get(['pauseUntil', 'shortsCount']).then((result) => {
    const pauseUntil = result.pauseUntil || 0;
    const shortsCount = result.shortsCount || 0;
    console.log(`Vérification de la pause: Heure actuelle=${Date.now()}, Pause jusqu'à=${pauseUntil}`);

    // 1. Gérer la période de pause
    if (Date.now() < pauseUntil) {
      console.log('Pause active. Vérification si l\'URL est un Short...');
      if (isShortsUrl(changeInfo.url)) {
        const remainingMinutes = Math.ceil((pauseUntil - Date.now()) / 60000);
        
        // Appliquer le blocage selon le mode configuré
        applyPauseBlocking(tabId, changeInfo.url, remainingMinutes);
        return; // Bloquer seulement les Shorts pendant la pause
      }
      // Permettre la navigation normale pendant la pause
      console.log('Navigation autorisée pendant la pause (pas un Short)');
    }

    // 2. Gérer la réinitialisation du compteur
    // Si la pause est terminée et que l'utilisateur navigue hors des Shorts,
    // on réinitialise le compteur et la pause.
    if (pauseUntil > 0 && Date.now() > pauseUntil) {
        console.log('Pause terminée, réinitialisation du compteur');
        resetCounter();
        return;
    }

    // 3. Gérer le comptage des nouveaux Shorts
    if (isShortsUrl(changeInfo.url)) {
      if (!countedUrls.has(changeInfo.url)) {
        countedUrls.set(changeInfo.url, Date.now());
        incrementCounter();

        setTimeout(() => {
          countedUrls.delete(changeInfo.url);
        }, 5000); // Évite de compter plusieurs fois la même URL rapidement
      }
    } else {
      // Si on quitte les shorts, arrêter le timer
      endWatchTimer();
    }
  });
});

// New function to add debug logs to storage
function addDebugLog(message) {
  browser.storage.local.get('debugLogs').then((result) => {
    const debugLogs = result.debugLogs || [];
    const timestamp = new Date().toLocaleTimeString();
    debugLogs.push(`[${timestamp}] ${message}`);
    // Keep only the last 50 logs to prevent excessive storage use
    if (debugLogs.length > 50) {
      debugLogs.shift();
    }
    browser.storage.local.set({ debugLogs: debugLogs });
  });
}

let activeYouTubeTabs = {}; // { tabId: startTimeMs }

// Function to process watch time for a tab
async function processWatchTime(tabId, endTime) {
  if (activeYouTubeTabs[tabId]) {
    const startTime = activeYouTubeTabs[tabId];
    const duration = endTime - startTime;

    if (duration > 0) {
      addDebugLog(`Tracking stopped for tab ${tabId}. Duration: ${duration} ms.`);
      const result = await browser.storage.local.get('dailyWatchTime');
      const dailyWatchTime = result.dailyWatchTime || {};
      const today = new Date().toISOString().slice(0, 10);

      dailyWatchTime[today] = (dailyWatchTime[today] || 0) + duration;
      await browser.storage.local.set({ dailyWatchTime: dailyWatchTime });
      addDebugLog(`Temps de visionnage YouTube mis à jour pour ${today}: ${dailyWatchTime[today]} ms`);
    }
    delete activeYouTubeTabs[tabId];
  }
}

// Listener for tab activation
browser.tabs.onActivated.addListener(async (activeInfo) => {
  // Process time for previously active YouTube tab
  const allTabs = await browser.tabs.query({});
  for (const tab of allTabs) {
    if (tab.id !== activeInfo.tabId && activeYouTubeTabs[tab.id]) {
      await processWatchTime(tab.id, Date.now());
    }
  }

  // Start tracking for newly active tab if it's YouTube
  const activeTab = await browser.tabs.get(activeInfo.tabId);
  if (activeTab && activeTab.url && activeTab.url.includes('youtube.com')) {
    activeYouTubeTabs[activeTab.id] = Date.now();
    addDebugLog(`Tracking started for tab ${activeTab.id}: ${activeTab.url}`);
  }
});

// Listener for tab updates (URL change)
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // If URL changed for a tracked tab, stop tracking
  if (changeInfo.url && activeYouTubeTabs[tabId]) {
    await processWatchTime(tabId, Date.now());
  }

  // If new URL is YouTube, start tracking
  if (tab.url && tab.url.includes('youtube.com') && !activeYouTubeTabs[tabId]) {
    activeYouTubeTabs[tabId] = Date.now();
    addDebugLog(`Tracking started for tab ${tabId}: ${tab.url}`);
  }
});

// Listener for tab removal
browser.tabs.onRemoved.addListener(async (tabId) => {
  await processWatchTime(tabId, Date.now());
});

// Listener for window focus changes
browser.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === browser.windows.WINDOW_ID_NONE) { // Browser lost focus
    addDebugLog('Browser lost focus. Stopping all active YouTube tab tracking.');
    for (const tabId in activeYouTubeTabs) {
      await processWatchTime(tabId, Date.now());
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
let shortStartTime = null;

function startWatchTimer() {
  shortStartTime = Date.now();
}

function endWatchTimer() {
  if (shortStartTime) {
    const watchDuration = Date.now() - shortStartTime;
    addWatchTime(watchDuration);
    shortStartTime = null;
  }
}

function addWatchTime(duration) {
  browser.storage.local.get(['dailyWatchTime', 'totalWatchTime']).then((result) => {
    const today = new Date().toISOString().slice(0, 10);
    const dailyWatchTime = result.dailyWatchTime || {};
    const totalWatchTime = result.totalWatchTime || 0;
    
    dailyWatchTime[today] = (dailyWatchTime[today] || 0) + duration;
    
    browser.storage.local.set({ 
      dailyWatchTime, 
      totalWatchTime: totalWatchTime + duration 
    });
    
    // Calculer et mettre à jour le temps moyen
    calculateAverageWatchTime();
  });
}

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
    
    console.log(`Average time per short: ${Math.round(avgTimePerShort / 1000)}s`);
  });
}

// Fonction pour appliquer le blocage avancé selon le mode configuré
async function applyAdvancedBlocking(newCount, maxShorts, pauseDuration) {
  try {
    // Récupérer le mode de blocage configuré
    const result = await browser.storage.local.get(['blockingMode']);
    const blockingMode = result.blockingMode || 'standard';
    
    console.log(`Limite atteinte (${newCount}/${maxShorts}) - Application du mode: ${blockingMode}`);
    
    // Préparer le contexte pour le gestionnaire de blocage
    const context = {
      currentCount: newCount,
      maxShorts: maxShorts,
      pauseDuration: pauseDuration,
      limitExceeded: true,
      title: "🚫 Limite atteinte",
      message: `Vous avez atteint votre limite de ${maxShorts} Shorts`,
      count: newCount
    };
    
    // Appliquer le mode de blocage via le gestionnaire
    if (typeof BlockingModeManager !== 'undefined') {
      await BlockingModeManager.applyBlockingMode(blockingMode, context);
    } else {
      // Fallback si le gestionnaire n'est pas disponible
      console.warn('BlockingModeManager non disponible, utilisation du blocage standard');
      const pauseUntil = Date.now() + pauseDuration * 60 * 1000;
      await browser.storage.local.set({ pauseUntil });
      updateBadge('paused');
    }
  } catch (error) {
    console.error('Erreur lors de l\'application du blocage avancé:', error);
  }
}

// Fonction pour appliquer le blocage pendant la pause
async function applyPauseBlocking(tabId, url, remainingMinutes) {
  try {
    // Récupérer le mode de blocage configuré
    const result = await browser.storage.local.get(['blockingMode']);
    const blockingMode = result.blockingMode || 'standard';
    
    console.log(`Blocage pendant pause (${remainingMinutes} min restantes) - Mode: ${blockingMode}`);
    
    // Préparer le contexte pour le gestionnaire de blocage
    const context = {
      tabId: tabId,
      url: url,
      originalUrl: url,
      remainingMinutes: remainingMinutes,
      isPause: true,
      title: "⏸️ Pause en cours",
      message: `Veuillez attendre encore ${remainingMinutes} minutes`
    };
    
    // Appliquer le mode de blocage via le gestionnaire
    if (typeof BlockingModeManager !== 'undefined') {
      await BlockingModeManager.applyBlockingMode(blockingMode, context);
    } else {
      // Fallback si le gestionnaire n'est pas disponible
      console.warn('BlockingModeManager non disponible, utilisation du blocage standard');
      browser.notifications.create({
        type: "basic",
        iconUrl: "icon48.png",
        title: "Pause en cours",
        message: `Veuillez attendre encore ${remainingMinutes} minutes.`
      });
      redirectToYouTube(tabId, url);
    }
    
    // S'assurer que le badge reste en mode pause
    updateBadge('paused');
  } catch (error) {
    console.error('Erreur lors de l\'application du blocage pendant la pause:', error);
    // Fallback en cas d'erreur
    redirectToYouTube(tabId, url);
  }
}

// Vérification périodique de l'état de pause
function checkPauseStatus() {
  browser.storage.local.get(['pauseUntil']).then((result) => {
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
        browser.storage.local.set({ pauseUntil: 0 });
        browser.storage.local.get(['shortsCount']).then((countResult) => {
          updateBadge('counting', countResult.shortsCount || 0);
        });
      }
    }
  });
}

// Vérifier l'état de pause toutes les 30 secondes
setInterval(checkPauseStatus, 30000);

// Extension initialization - tab listeners are sufficient for tracking