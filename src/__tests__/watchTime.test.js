import { activeYouTubeTabs, startWatchTimer, endWatchTimer, addWatchTime, calculateAverageWatchTime, processWatchTime } from '../watchTime.js';

describe('watchTime.js', () => {
  let storage = {};
  const getStorage = jest.fn(async (keys) => {
    if (Array.isArray(keys)) {
      const result = {};
      keys.forEach(k => result[k] = storage[k]);
      return result;
    }
    return { [keys]: storage[keys] };
  });
  const setStorage = jest.fn(async (obj) => {
    Object.assign(storage, obj);
  });
  const addDebugLog = jest.fn();
  let now = Date.now();
  beforeEach(() => {
    storage = {
      dailyWatchTime: {},
      totalWatchTime: 0,
      dailyCounts: { [new Date().toISOString().slice(0, 10)]: 2 }
    };
    Object.keys(activeYouTubeTabs).forEach(k => delete activeYouTubeTabs[k]);
    jest.clearAllMocks();
    now = Date.now();
  });

  it('startWatchTimer initialise le timer', () => {
    startWatchTimer();
    expect(typeof global.shortStartTime === 'number' || typeof shortStartTime === 'number').toBe(true);
  });

  it('endWatchTimer appelle addWatchTime si timer actif', () => {
    let called = false;
    startWatchTimer();
    endWatchTimer(() => { called = true; });
    expect(called).toBe(true);
  });

  it('addWatchTime ajoute la durée au total et au daily', async () => {
    await addWatchTime(1000, getStorage, setStorage, () => calculateAverageWatchTime(getStorage, setStorage));
    const today = new Date().toISOString().slice(0, 10);
    expect(storage.dailyWatchTime[today]).toBe(1000);
    expect(storage.totalWatchTime).toBe(1000);
  });

  it('calculateAverageWatchTime calcule la moyenne', async () => {
    storage.dailyWatchTime = { '2024-01-01': 2000, '2024-01-02': 1000 };
    storage.dailyCounts = { '2024-01-01': 2, '2024-01-02': 1 };
    await calculateAverageWatchTime(getStorage, setStorage);
    expect(storage.avgTimePerShort).toBeCloseTo(1000);
  });

  it('processWatchTime ajoute la durée à dailyWatchTime et log', async () => {
    activeYouTubeTabs[42] = now - 5000;
    await processWatchTime(42, now, getStorage, setStorage, addDebugLog);
    const today = new Date().toISOString().slice(0, 10);
    expect(storage.dailyWatchTime[today]).toBe(5000);
    expect(addDebugLog).toHaveBeenCalled();
    expect(activeYouTubeTabs[42]).toBeUndefined();
  });
}); 