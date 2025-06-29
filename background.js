// Initialiser le compteur si nécessaire
browser.storage.local.get('shortsCount').then((result) => {
  if (!result.shortsCount) {
    browser.storage.local.set({ shortsCount: 0 });
  }
  updateBadge(result.shortsCount || 0);
});


// Ajouter une option pour rendre le nombre de Shorts paramétrable
let maxShorts = 10; // Valeur par défaut

// Charger la valeur depuis le stockage si elle existe
browser.storage.local.get('maxShorts').then((result) => {
  if (result.maxShorts) {
    maxShorts = result.maxShorts;
  }
});
// Fonction pour mettre à jour le badge
function updateBadge(count) {
  browser.action.setBadgeText({ text: count.toString() });
  browser.action.setBadgeBackgroundColor({ color: "#FF0000" });
}

// Fonction pour réinitialiser le compteur
function resetCounter() {
  browser.storage.local.set({ shortsCount: 0 });
  updateBadge(0);
}

// Regex pour détecter les URLs YouTube Shorts
const shortsRegex = /^https?:\/\/(?:www\.|m\.)?youtube\.com\/shorts\/.*$/;

// Regex pour détecter les URLs YouTube
const youtubeRegex = /^https?:\/\/(?:www\.|m\.)?youtube/;

// Fonction pour vérifier si l'URL est un Short
function isShortsUrl(url) {
  return shortsRegex.test(url);
}

// Fonction verifier si l'URL est youtube mais ne contien pas shorts
function isYoutubeUrl(url) {
  return youtubeRegex.test(url) && !url.includes('shorts');
}

// Fonction pour incrémenter le compteur
function incrementCounter() {
  browser.storage.local.get(['shortsCount', 'maxShorts']).then((result) => {
    const newCount = (result.shortsCount || 0) + 1;
    const currentMaxShorts = result.maxShorts || 10; // Récupérer la valeur actuelle
    
    browser.storage.local.set({ shortsCount: newCount });
    updateBadge(newCount);
    console.log(`Compteur Shorts mis à jour: ${newCount}/${currentMaxShorts}`);

    // Vérifier si la limite est atteinte
    if (newCount >= currentMaxShorts) {
      browser.notifications.create({
        type: "basic",
        iconUrl: "icon48.png",
        title: "Limite atteinte",
        message: `Vous avez regardé ${currentMaxShorts} Shorts. Redirection vers YouTube...`
      });
 
      browser.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0] && isShortsUrl(tabs[0].url)) {
          resetCounter(); // Réinitialiser le compteur avant la modification de l'URL
          const newUrl = tabs[0].url.replace(/\/shorts\/[^/]+/, '');
          browser.tabs.update(tabs[0].id, { url: newUrl });
        }
      });
    }
  });
}

// Écouter les messages depuis le popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateBadge') {
    updateBadge(message.count);
  }
});

// Map pour stocker les URLs déjà comptées
let countedUrls = new Map();

// Surveiller les changements d'URL
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Réinitialiser le compteur si c'est un nouvel onglet ou une redirection vers youtube.com
  if (changeInfo.url && (changeInfo.url === "https://www.youtube.com/" || !isShortsUrl(changeInfo.url))) {
    resetCounter();
  }

  if (changeInfo.url && isShortsUrl(changeInfo.url)) {
    // Vérifier si cette URL n'a pas déjà été comptée récemment
    if (!countedUrls.has(changeInfo.url)) {
      countedUrls.set(changeInfo.url, Date.now());
      incrementCounter();

      // Nettoyer les anciennes entrées après 5 secondes
      setTimeout(() => {
        countedUrls.delete(changeInfo.url);
      }, 5000);
    }
  }
});
