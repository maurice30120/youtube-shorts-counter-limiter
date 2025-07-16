// === ADVANCED BLOCKING MODES ===

// Configuration des modes de blocage
const BLOCKING_MODES = {
  GENTLE: {
    id: 'gentle',
    name: 'Mode Doux',
    description: 'Notification simple, pas de blocage forcé',
    icon: '🌸',
    strategies: ['notification', 'badge']
  },
  STANDARD: {
    id: 'standard', 
    name: 'Mode Standard',
    description: 'Blocage pendant pause + redirection',
    icon: '⚡',
    strategies: ['notification', 'block', 'pause']
  },
  STRICT: {
    id: 'strict',
    name: 'Mode Strict',
    description: 'Blocage total + alternatives suggérées',
    icon: '🔒',
    strategies: ['notification', 'block', 'alternatives', 'longPause']
  },
  ADAPTIVE: {
    id: 'adaptive',
    name: 'Mode Adaptatif',
    description: 'S\'adapte à vos habitudes',
    icon: '🤖',
    strategies: ['dynamic', 'learning', 'personalized']
  }
};

// Stratégies de blocage
class BlockingStrategies {
  
  static async notification(data) {
    browser.notifications.create({
      type: "basic",
      iconUrl: "icon48.png", 
      title: data.title || "Limite atteinte",
      message: data.message
    });
  }

  static async badge(state) {
    const badges = {
      'warning': { text: '⚠️', color: '#FFA500' },
      'blocked': { text: '🚫', color: '#FF0000' },
      'paused': { text: '❚❚', color: '#FFA500' }
    };
    
    const badge = badges[state] || badges.warning;
    
    // Utiliser browser.action (Manifest V3) avec fallback vers browser.browserAction (Manifest V2)
    try {
      if (browser.action) {
        browser.action.setBadgeText({ text: badge.text });
        browser.action.setBadgeBackgroundColor({ color: badge.color });
      } else if (browser.browserAction) {
        browser.browserAction.setBadgeText({ text: badge.text });
        browser.browserAction.setBadgeBackgroundColor({ color: badge.color });
      }
    } catch (error) {
      console.warn('Erreur lors de la mise à jour du badge (blocking-modes):', error);
      // Fallback pour mobile - sauvegarder l'état dans le storage
      await browser.storage.local.set({ 
        badgeState: { state, text: badge.text, color: badge.color },
        lastBadgeUpdate: Date.now()
      });
    }
  }

  static async redirect(tabId, originalUrl, isMobile = false) {
    let redirectUrl;
    
    if (isMobile) {
      redirectUrl = 'https://m.youtube.com';
      console.log(`Mobile redirection: ${originalUrl} -> ${redirectUrl}`);
    } else {
      const alternatives = await this.getSmartAlternatives();
      redirectUrl = alternatives[0]?.url || 'https://www.youtube.com';
      console.log(`Desktop redirection: ${originalUrl} -> ${redirectUrl}`);
    }
    
    try {
      await browser.tabs.update(tabId, { url: redirectUrl });
    } catch (error) {
      console.error(`Failed to redirect tab ${tabId}:`, error);
      // Fallback notification if redirection fails
      browser.notifications.create({
        type: "basic",
        iconUrl: "icon48.png",
        title: "Redirection échouée",
        message: "Impossible de vous rediriger. Veuillez naviguer manuellement."
      });
    }
  }

  static async block(tabId, originalUrl) {
    // Créer une page de blocage personnalisée
    const blockPageUrl = browser.runtime.getURL('blocked.html');
    browser.tabs.update(tabId, { url: blockPageUrl });
    
    // Enregistrer l'URL bloquée pour les statistiques
    this.logBlockedAttempt(originalUrl);
  }

  static async alternatives() {
    const alternatives = await this.getSmartAlternatives();
    
    // Afficher les alternatives dans une notification riche
    browser.notifications.create({
      type: "basic",
      iconUrl: "icon48.png",
      title: "🎯 Alternatives suggérées",
      message: `Essayez: ${alternatives.slice(0, 2).map(a => a.name).join(', ')}`
    });
    
    return alternatives;
  }

  static async getSmartAlternatives() {
    const result = await browser.storage.local.get(['userInterests', 'blockingHistory']);
    const userInterests = result.userInterests || [];
    const history = result.blockingHistory || [];
    
    // Base des alternatives par défaut
    const baseAlternatives = [
      { name: 'YouTube Accueil', url: 'https://www.youtube.com', category: 'video' },
      { name: 'Articles Wikipedia', url: 'https://fr.wikipedia.org/wiki/Sp%C3%A9cial:Page_au_hasard', category: 'education' },
      { name: 'Exercices physiques', url: 'https://www.youtube.com/results?search_query=exercice+5+minutes', category: 'health' },
      { name: 'Méditation guidée', url: 'https://www.youtube.com/results?search_query=méditation+guidée', category: 'wellness' },
      { name: 'Duolingo', url: 'https://www.duolingo.com', category: 'education' },
      { name: 'News Tech', url: 'https://www.lemonde.fr/pixels/', category: 'news' }
    ];
    
    // Personnaliser selon les intérêts utilisateur
    let alternatives = [...baseAlternatives];
    
    if (userInterests.includes('programming')) {
      alternatives.push(
        { name: 'GitHub Trending', url: 'https://github.com/trending', category: 'programming' },
        { name: 'Stack Overflow', url: 'https://stackoverflow.com', category: 'programming' }
      );
    }
    
    if (userInterests.includes('fitness')) {
      alternatives.push(
        { name: 'Workout vidéos', url: 'https://www.youtube.com/results?search_query=quick+workout', category: 'fitness' }
      );
    }
    
    // Filtrer les alternatives déjà utilisées récemment
    const recentUrls = history.slice(-10).map(h => h.alternativeUsed);
    alternatives = alternatives.filter(alt => !recentUrls.includes(alt.url));
    
    return alternatives.slice(0, 5);
  }

  static async longPause(duration = 30) {
    const pauseUntil = Date.now() + duration * 60 * 1000;
    await browser.storage.local.set({ pauseUntil, pauseReason: 'strict_mode' });
    
    // Mettre à jour le badge pour indiquer la pause longue
    await this.badge('paused');
    
    browser.notifications.create({
      type: "basic",
      iconUrl: "icon48.png",
      title: "🔒 Mode Strict activé",
      message: `Blocage de ${duration} minutes. Prenez l'air ! 🌱`
    });
    
    console.log(`Pause longue activée jusqu'à: ${new Date(pauseUntil).toLocaleTimeString()}`);
  }

  static async logBlockedAttempt(url) {
    const result = await browser.storage.local.get(['blockingHistory']);
    const history = result.blockingHistory || [];
    
    history.push({
      timestamp: Date.now(),
      url: url,
      blockedBy: 'extension',
      userAgent: navigator.userAgent
    });
    
    // Garder seulement les 100 dernières entrées
    const recentHistory = history.slice(-100);
    await browser.storage.local.set({ blockingHistory: recentHistory });
  }
}

// Mode adaptatif avec apprentissage
class AdaptiveMode {
  
  static async analyzeUserBehavior() {
    const result = await browser.storage.local.get([
      'dailyCounts', 'blockingHistory', 'streakData', 'userPatterns'
    ]);
    
    const patterns = this.extractPatterns(result);
    return this.recommendStrategy(patterns);
  }
  
  static extractPatterns(data) {
    const patterns = {
      peakHours: [],
      averageDaily: 0,
      streakSuccess: 0,
      blockingEffectiveness: {},
      timeOfDayTrends: {}
    };
    
    // Analyser les heures de pic
    if (data.blockingHistory) {
      const hourCounts = {};
      data.blockingHistory.forEach(entry => {
        const hour = new Date(entry.timestamp).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      
      patterns.peakHours = Object.entries(hourCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => parseInt(hour));
    }
    
    // Calculer la moyenne quotidienne
    if (data.dailyCounts) {
      const counts = Object.values(data.dailyCounts);
      patterns.averageDaily = counts.reduce((a, b) => a + b, 0) / counts.length || 0;
    }
    
    // Analyser l'efficacité des streaks
    if (data.streakData) {
      patterns.streakSuccess = data.streakData.bestStreak / (data.streakData.totalDays || 1);
    }
    
    return patterns;
  }
  
  static recommendStrategy(patterns) {
    let recommendedMode = 'standard';
    let suggestions = [];
    
    // Utilisateur très discipliné
    if (patterns.streakSuccess > 0.8 && patterns.averageDaily < 15) {
      recommendedMode = 'gentle';
      suggestions.push('Vous êtes très discipliné! Le mode doux suffit.');
    }
    // Utilisateur en difficulté
    else if (patterns.streakSuccess < 0.3 || patterns.averageDaily > 50) {
      recommendedMode = 'strict';
      suggestions.push('Le mode strict peut vous aider à reprendre le contrôle.');
    }
    // Heures de pic identifiées
    if (patterns.peakHours.length > 0) {
      suggestions.push(`Pics d'usage détectés à ${patterns.peakHours.join('h, ')}h`);
    }
    
    return {
      mode: recommendedMode,
      suggestions,
      patterns
    };
  }
}

// Gestionnaire principal des modes de blocage
class BlockingModeManager {
  
  static async applyBlockingMode(mode, context) {
    const modeConfig = BLOCKING_MODES[mode.toUpperCase()];
    if (!modeConfig) {
      console.error(`Mode de blocage inconnu: ${mode}`);
      return;
    }
    
    console.log(`Application du mode de blocage: ${modeConfig.name}`);
    
    for (const strategy of modeConfig.strategies) {
      try {
        await this.executeStrategy(strategy, context);
      } catch (error) {
        console.error(`Erreur lors de l'exécution de la stratégie ${strategy}:`, error);
      }
    }
  }
  
  static async executeStrategy(strategy, context) {
    switch (strategy) {
      case 'notification':
        await BlockingStrategies.notification({
          title: context.title || "Limite atteinte",
          message: context.message || `${context.count} Shorts visionnés.`
        });
        break;
        
      case 'badge':
        await BlockingStrategies.badge('blocked');
        break;
        
      case 'redirect':
        if (context.tabId && context.url) {
          await BlockingStrategies.redirect(context.tabId, context.url);
        }
        break;
        
      case 'block':
        if (context.tabId && context.url) {
          if (context.isMobile) {
            // Sur mobile, la redirection est plus fiable qu'une page de blocage
            await BlockingStrategies.redirect(context.tabId, context.url, true);
          } else {
            await BlockingStrategies.block(context.tabId, context.url);
          }
        }
        break;
        
      case 'alternatives':
        await BlockingStrategies.alternatives();
        break;
        
      case 'pause':
        const standardDuration = context.pauseDuration || 5;
        const pauseUntil = Date.now() + standardDuration * 60 * 1000;
        await browser.storage.local.set({ pauseUntil });
        
        // Mettre à jour le badge pour indiquer la pause
        await BlockingStrategies.badge('paused');
        
        // Notification de confirmation de pause (plus visible sur mobile)
        browser.notifications.create('pause-notification', {
          type: "basic",
          iconUrl: "icon48.png",
          title: "⏸️ Pause activée",
          message: `Pause de ${standardDuration} minutes en cours. Prenez une pause !`,
          priority: 2, // Haute priorité pour mobile
          requireInteraction: false // Ne nécessite pas d'interaction pour disparaître
        });
        
        // Notification supplémentaire pour mobile avec son
        if (context.isMobile) {
          setTimeout(() => {
            browser.notifications.create('pause-reminder', {
              type: "basic",
              iconUrl: "icon48.png",
              title: "🚫 Shorts bloqués",
              message: `${standardDuration} minutes de pause restantes`,
              priority: 2
            });
          }, 1000);
        }
        
        console.log(`Pause activée jusqu'à: ${new Date(pauseUntil).toLocaleTimeString()}`);
        break;
        
      case 'longPause':
        await BlockingStrategies.longPause(context.pauseDuration || 30);
        break;
        
      case 'dynamic':
        const recommendation = await AdaptiveMode.analyzeUserBehavior();
        await this.applyBlockingMode(recommendation.mode, context);
        break;
        
      default:
        console.warn(`Stratégie inconnue: ${strategy}`);
    }
  }
  
  static async getCurrentMode() {
    const result = await browser.storage.local.get(['blockingMode']);
    return result.blockingMode || 'standard';
  }
  
  static async setBlockingMode(mode) {
    if (!BLOCKING_MODES[mode.toUpperCase()]) {
      throw new Error(`Mode de blocage invalide: ${mode}`);
    }
    
    await browser.storage.local.set({ blockingMode: mode });
    console.log(`Mode de blocage défini sur: ${mode}`);
  }
}

// Export pour utilisation dans d'autres scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BlockingModeManager, BLOCKING_MODES, AdaptiveMode };
}
