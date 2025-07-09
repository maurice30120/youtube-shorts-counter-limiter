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
function redirectToYouTube(tabId, url) {
  if (isShortsUrl(url)) {
    const newUrl = url.replace(/\/shorts\/[^\/]+/, '');
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

    // --- Vérifier si la limite est atteinte ---
    if (newCount >= currentMaxShorts) {
      const pauseUntil = Date.now() + currentPauseDuration * 60 * 1000;
      browser.storage.local.set({ pauseUntil: pauseUntil });
      updateBadge('paused');

      browser.notifications.create({
        type: "basic",
        iconUrl: "icon48.png",
        title: "Limite atteinte",
        message: `Vous avez regardé ${currentMaxShorts} Shorts. Pause de ${currentPauseDuration} minutes.`
      });
 
      browser.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]) {
          redirectToYouTube(tabs[0].id, tabs[0].url);
        }
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
        browser.notifications.create({
          type: "basic",
          iconUrl: "icon48.png",
          title: "Pause en cours",
          message: `Veuillez attendre encore ${remainingMinutes} minutes.`
        });
        redirectToYouTube(tabId, changeInfo.url);
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
    }

    if (shortsCount > 0 && !isShortsUrl(changeInfo.url)) {
      console.log('Navigation hors Shorts, réinitialisation du compteur');
      resetCounter();
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

// Tab listeners are sufficient for tracking, no need for alarm-based fallback

// Extension initialization - tab listeners are sufficient for tracking