import React, { useState, useEffect } from 'react';

import WeeklyChart from './components/WeeklyChart';
import WatchTimeChart from './components/WatchTimeChart';

const App: React.FC = () => {
  const [shortsCount, setShortsCount] = useState(0);
  const [maxShorts, setMaxShorts] = useState(10);
  const [pauseDuration, setPauseDuration] = useState(5);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Load initial data from storage
  useEffect(() => {
    browser.storage.local.get(['shortsCount', 'maxShorts', 'pauseDuration', 'debugLogs']).then((result: any) => {
      setShortsCount(result.shortsCount || 0);
      setMaxShorts(result.maxShorts || 10);
      setPauseDuration(result.pauseDuration || 5);
      setDebugLogs(result.debugLogs || []);
    });
  }, []);

  // Listen for storage changes
  useEffect(() => {
    const listener = (changes: any, area: string) => {
      if (area === 'local') {
        if (changes.shortsCount) {
          setShortsCount(changes.shortsCount.newValue || 0);
        }
        if (changes.maxShorts) {
          setMaxShorts(changes.maxShorts.newValue || 10);
        }
        if (changes.pauseDuration) {
          setPauseDuration(changes.pauseDuration.newValue || 5);
        }
        if (changes.debugLogs) {
          setDebugLogs(changes.debugLogs.newValue || []);
        }
      }
    };
    browser.storage.onChanged.addListener(listener);
    return () => {
      browser.storage.onChanged.removeListener(listener);
    };
  }, []);

  const handleSaveSettings = (event: React.FormEvent) => {
    event.preventDefault();
    const newMaxShorts = parseInt((document.getElementById('max-shorts') as HTMLInputElement).value, 10);
    const newPauseDuration = parseInt((document.getElementById('pause-duration') as HTMLInputElement).value, 10);

    const settingsToUpdate: { maxShorts?: number; pauseDuration?: number } = {};
    if (newMaxShorts && newMaxShorts > 0) {
      settingsToUpdate.maxShorts = newMaxShorts;
    }
    if (newPauseDuration && newPauseDuration > 0) {
      settingsToUpdate.pauseDuration = newPauseDuration;
    }

    if (Object.keys(settingsToUpdate).length > 0) {
      browser.storage.local.set(settingsToUpdate).then(() => {
        // Visual feedback (will be handled by React state updates)
      });
    }
  };

  const handleReset = () => {
    browser.runtime.sendMessage({ action: 'resetCounter' });
    setShortsCount(0); // Immediate visual feedback
  };

  return (
    <div style={{ width: '400px', padding: '15px', fontFamily: 'Arial, sans-serif', fontSize: '14px' }}>
      <h3>Compteur de Shorts (Session Actuelle)</h3>
      <div className="counter" id="counter">{shortsCount}</div>

      <hr />

      <h4>Statistiques (7 derniers jours)</h4>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <WeeklyChart />
      </div>

      <hr />

      <h4>Temps de visionnage (7 derniers jours)</h4>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <WatchTimeChart />
      </div>

      <hr />

      <div className="settings">
        <h4>Paramètres</h4>
        <form id="settings-form" onSubmit={handleSaveSettings}>
          <div>
            <label htmlFor="max-shorts">Limite de Shorts par session :</label>
            <input
              type="number"
              id="max-shorts"
              name="max-shorts"
              min="1"
              max="100"
              value={maxShorts}
              onChange={(e) => setMaxShorts(parseInt(e.target.value, 10) || 0)}
            />
            <p id="current-limit">Limite actuelle: {maxShorts}</p>
          </div>
          <div>
            <label htmlFor="pause-duration">Pause (minutes) :</label>
            <input
              type="number"
              id="pause-duration"
              name="pause-duration"
              min="1"
              max="120"
              value={pauseDuration}
              onChange={(e) => setPauseDuration(parseInt(e.target.value, 10) || 0)}
            />
            <p id="current-pause" style={{ fontSize: '11px', color: '#666', margin: '5px 0' }}>
              Pause actuelle: {pauseDuration} minutes
            </p>
          </div>
          <button type="submit">Sauvegarder</button>
        </form>
        <button id="reset-counter" className="reset-btn" onClick={handleReset}>
          Remettre la session à zéro
        </button>
      </div>

      <hr />
      <h4>Logs de débogage</h4>
      <div id="debug-logs" style={{ fontSize: '0.8em', maxHeight: '150px', overflowY: 'scroll', border: '1px solid #eee', padding: '5px' }}>
        {debugLogs.length === 0 ? (
          <div>Aucun log disponible.</div>
        ) : (
          debugLogs.map((log, index) => <div key={index}>{log}</div>)
        )}
      </div>
    </div>
  );
};

export default App;