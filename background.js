// Initialiser le compteur si nécessaire
browser.storage.local.get('shortsCount').then((result) => {
  if (!result.shortsCount) {
    browser.storage.local.set({ shortsCount: 0 });
  }
  updateBadge(result.shortsCount || 0);
});

// Fonction pour mettre à jour le badge
function updateBadge(count) {
  browser.browserAction.setBadgeText({ text: count.toString() });
  browser.browserAction.setBadgeBackgroundColor({ color: "#FF0000" });
}

// Fonction pour réinitialiser le compteur
function resetCounter() {
  browser.storage.local.set({ shortsCount: 0 });
  updateBadge(0);
}

// Regex pour détecter les URLs YouTube Shorts
const shortsRegex = /^https?:\/\/(?:www\.)?youtube\.com\/shorts\/.*$/;

// Regex pour détecter les URLs YouTube
const youtubeRegex = /^https?:\/\/(?:www\.)?youtube/;

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
  browser.storage.local.get('shortsCount').then((result) => {
    const newCount = (result.shortsCount || 0) + 1;
    browser.storage.local.set({ shortsCount: newCount });
    updateBadge(newCount);

    // Si le compteur dépasse 10, rediriger vers youtube.com
    if (newCount > 10) {
      browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0] && isShortsUrl(tabs[0].url)) {
          resetCounter(); // Réinitialiser le compteur avant la redirection
          browser.tabs.update(tabs[0].id, {url: "https://www.youtube.com"});
        }
      });
    }
  });
}

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