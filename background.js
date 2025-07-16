// === IMPORTS ===
import { achievements, checkAchievements, unlockAchievement } from './achievements.js';
import { countedUrls, incrementCounter, resetCounter, checkAndResetStreak } from './counter.js';
import { activeYouTubeTabs, startWatchTimer, endWatchTimer, addWatchTime, calculateAverageWatchTime, processWatchTime } from './watchTime.js';
import { applyAdvancedBlocking, applyPauseBlocking } from './blocking.js';
try {
  importScripts('improvements.js');
  importScripts('blocking-modes.js');
} catch (error) {
  console.warn('Could not import scripts:', error);
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
const shortsRegex = /^https?:\/\/(?:www\.|m\.)?youtube\.com\/shorts\/.*$/;
const mobileShortsRegex = /^https?:\/\/(?:youtu\.be\/.*|youtube\.com\/.*[?&]v=.*&.*shorts|.*youtube.*\/shorts)/;

// Fonction pour vérifier si l'URL est un Short
function isShortsUrl(url) {
  if (!url) return false;
  
  // Test avec les regex principaux
  if (shortsRegex.test(url) || mobileShortsRegex.test(url)) {
    return true;
  }
  
  // Test additionnel pour URLs mobiles spécifiques
  if (url.includes('youtube.com') && url.includes('/shorts/')) {
    return true;
  }
  
  // Debug logging pour mobile
  if (url.includes('youtube.com')) {
    console.log(`URL YouTube détectée: ${url}, Shorts: ${shortsRegex.test(url)}`);
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
    if (pauseUntil > 0 && Date.now() > pauseUntil) {
      resetCounter(setStorage, updateBadge);
      return;
    }
    if (isShortsUrl(changeInfo.url)) {
      if (!countedUrls.has(changeInfo.url)) {
        countedUrls.set(changeInfo.url, Date.now());
        incrementCounter(
          getStorage,
          setStorage,
          updateBadge,
          startWatchTimer,
          (d) => endWatchTimer((d) => addWatchTime(d, getStorage, setStorage, () => calculateAverageWatchTime(getStorage, setStorage))),
          () => checkAchievements(getStorage, (id) => unlockAchievement(id, getStorage, setStorage)),
          () => checkAndResetStreak(getStorage, setStorage),
          (n, m, p) => applyAdvancedBlocking(n, m, p, getStorage, setStorage, updateBadge)
        );
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

// Vérifier l'état de pause toutes les 30 secondes
setInterval(checkPauseStatus, 30000);

// Extension initialization - tab listeners are sufficient for tracking