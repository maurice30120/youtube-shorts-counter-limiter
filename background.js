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
      console.log('Pause active. Redirection...');
      if (isShortsUrl(changeInfo.url)) {
        const remainingMinutes = Math.ceil((pauseUntil - Date.now()) / 60000);
        browser.notifications.create({
          type: "basic",
          iconUrl: "icon48.png",
          title: "Pause en cours",
          message: `Veuillez attendre encore ${remainingMinutes} minutes.`
        });
        redirectToYouTube(tabId, changeInfo.url);
      }
      return; // Ne rien faire d'autre pendant la pause
    }

    // 2. Gérer la réinitialisation du compteur
    // Si la pause est terminée et que l'utilisateur navigue hors des Shorts,
    // on réinitialise le compteur et la pause.
    if (pauseUntil > 0 && Date.now() > pauseUntil) {
        resetCounter();
    }

    if (shortsCount > 0 && !isShortsUrl(changeInfo.url)) {
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

// --- Suivi du temps de visionnage --- 
const WATCH_INTERVAL = 5000; // ms

setInterval(() => {
  console.log('Interval de suivi du temps de visionnage déclenché.'); // New log
  // Vérifier si la fenêtre du navigateur est active
  browser.windows.getCurrent({ populate: true }).then((window) => {
    if (!window.focused) {
      console.log('Fenêtre non active, pas de suivi du temps.'); // New log
      return; // Ne rien faire si la fenêtre n'est pas active
    }

    // Trouver l'onglet actif dans la fenêtre active
    const activeTab = window.tabs.find(t => t.active);
    if (!activeTab || !activeTab.url) {
      console.log('Pas d\'onglet actif ou URL manquante, pas de suivi du temps.'); // New log
      return;
    }

    // Vérifier si l'onglet est sur YouTube
    if (activeTab.url.includes('youtube.com')) {
      console.log(`Onglet YouTube actif détecté: ${activeTab.url}`); // New log
      browser.storage.local.get('dailyWatchTime').then((result) => {
        const dailyWatchTime = result.dailyWatchTime || {};
        const today = new Date().toISOString().slice(0, 10);

        dailyWatchTime[today] = (dailyWatchTime[today] || 0) + WATCH_INTERVAL;

        browser.storage.local.set({ dailyWatchTime: dailyWatchTime });
        console.log(`Temps de visionnage YouTube mis à jour pour ${today}: ${dailyWatchTime[today]} ms`); // New log
      });
    } else {
        console.log(`Onglet actif n'est pas YouTube: ${activeTab.url}`); // New log
    }
  });
}, WATCH_INTERVAL);