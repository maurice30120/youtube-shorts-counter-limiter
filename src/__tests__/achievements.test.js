import { achievements, checkAchievements, unlockAchievement } from '../achievements.js';

describe('achievements.js', () => {
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

  beforeEach(() => {
    storage = {
      currentStreak: 0,
      unlockedAchievements: [],
      dailyCounts: {},
      maxShorts: 10
    };
    notifications.length = 0;
    jest.clearAllMocks();
  });

  it('structure de achievements', () => {
    expect(achievements.FIRST_DAY).toBeDefined();
    expect(achievements.WEEK_CLEAN).toBeDefined();
    expect(achievements.MONTH_CLEAN).toBeDefined();
    expect(achievements.SPEED_DEMON).toBeDefined();
    expect(achievements.EARLY_BIRD).toBeDefined();
  });

  it('débloque le premier achievement si streak >= 1', async () => {
    storage.currentStreak = 1;
    await checkAchievements(getStorage, (id) => unlockAchievement(id, getStorage, setStorage));
    expect(storage.unlockedAchievements).toContain('first_day');
    expect(notifications.length).toBeGreaterThan(0);
  });

  it('débloque week_clean si streak >= 7', async () => {
    storage.currentStreak = 7;
    await checkAchievements(getStorage, (id) => unlockAchievement(id, getStorage, setStorage));
    expect(storage.unlockedAchievements).toContain('week_clean');
  });

  it('débloque month_clean si streak >= 30', async () => {
    storage.currentStreak = 30;
    await checkAchievements(getStorage, (id) => unlockAchievement(id, getStorage, setStorage));
    expect(storage.unlockedAchievements).toContain('month_clean');
  });

  it('débloque speed_demon si dailyCount >= 50', async () => {
    const today = new Date().toISOString().slice(0, 10);
    storage.dailyCounts = { [today]: 50 };
    await checkAchievements(getStorage, (id) => unlockAchievement(id, getStorage, setStorage));
    expect(storage.unlockedAchievements).toContain('speed_demon');
  });

  it('ne débloque pas deux fois le même achievement', async () => {
    storage.currentStreak = 7;
    storage.unlockedAchievements = ['week_clean'];
    await checkAchievements(getStorage, (id) => unlockAchievement(id, getStorage, setStorage));
    expect(storage.unlockedAchievements.filter(a => a === 'week_clean').length).toBe(1);
  });
}); 