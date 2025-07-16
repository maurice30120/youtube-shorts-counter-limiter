import { countedUrls, incrementCounter, resetCounter, checkAndResetStreak } from '../counter.js';

describe('counter.js', () => {
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
  const notifications = [];
  global.browser = {
    notifications: {
      create: jest.fn((opts) => notifications.push(opts))
    }
  };
  const updateBadge = jest.fn();
  const startWatchTimer = jest.fn();
  const endWatchTimer = jest.fn();
  const checkAchievements = jest.fn();
  const applyAdvancedBlocking = jest.fn();

  beforeEach(() => {
    storage = {
      shortsCount: 0,
      maxShorts: 10,
      pauseDuration: 5,
      dailyCounts: {},
      currentStreak: 0
    };
    notifications.length = 0;
    jest.clearAllMocks();
  });

  it('incrémente le compteur et le dailyCount', async () => {
    await incrementCounter(getStorage, setStorage, updateBadge, startWatchTimer, endWatchTimer, checkAchievements, checkAndResetStreak, applyAdvancedBlocking);
    expect(storage.shortsCount).toBe(1);
    const today = new Date().toISOString().slice(0, 10);
    expect(storage.dailyCounts[today]).toBe(1);
    expect(updateBadge).toHaveBeenCalledWith('counting', 1);
    expect(startWatchTimer).toHaveBeenCalled();
    expect(checkAchievements).toHaveBeenCalled();
  });

  it('resetCounter remet shortsCount et pauseUntil à 0', async () => {
    storage.shortsCount = 5;
    storage.pauseUntil = Date.now() + 10000;
    await resetCounter(setStorage, updateBadge);
    expect(storage.shortsCount).toBe(0);
    expect(storage.pauseUntil).toBe(0);
    expect(updateBadge).toHaveBeenCalledWith('counting', 0);
  });

  it('checkAndResetStreak remet le streak à 0 si limite dépassée', async () => {
    const today = new Date().toISOString().slice(0, 10);
    storage.maxShorts = 2;
    storage.dailyCounts = { [today]: 3 };
    storage.currentStreak = 5;
    await checkAndResetStreak(getStorage, setStorage);
    expect(storage.currentStreak).toBe(0);
    expect(notifications.length).toBeGreaterThan(0);
  });

  it('n appelle pas applyAdvancedBlocking si limite non atteinte', async () => {
    storage.shortsCount = 2;
    storage.maxShorts = 10;
    await incrementCounter(getStorage, setStorage, updateBadge, startWatchTimer, endWatchTimer, checkAchievements, checkAndResetStreak, applyAdvancedBlocking);
    expect(applyAdvancedBlocking).not.toHaveBeenCalled();
  });

  it('appelle applyAdvancedBlocking si limite atteinte', async () => {
    storage.shortsCount = 9;
    storage.maxShorts = 10;
    await incrementCounter(getStorage, setStorage, updateBadge, startWatchTimer, endWatchTimer, checkAchievements, checkAndResetStreak, applyAdvancedBlocking);
    expect(applyAdvancedBlocking).toHaveBeenCalled();
  });
}); 