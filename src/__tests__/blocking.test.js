import { applyAdvancedBlocking, applyPauseBlocking } from '../blocking.js';

describe('blocking.js', () => {
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
  const updateBadge = jest.fn();
  const redirectToYouTube = jest.fn();
  global.browser = {
    runtime: {
      getPlatformInfo: jest.fn(async () => ({ os: 'android' }))
    },
    notifications: {
      create: jest.fn()
    }
  };
  global.BlockingModeManager = undefined;

  beforeEach(() => {
    storage = { blockingMode: 'standard' };
    jest.clearAllMocks();
    global.BlockingModeManager = undefined;
  });

  it('applyAdvancedBlocking fallback met pauseUntil et badge', async () => {
    await applyAdvancedBlocking(11, 10, 5, getStorage, setStorage, updateBadge);
    expect(storage.pauseUntil).toBeGreaterThan(Date.now());
    expect(updateBadge).toHaveBeenCalledWith('paused');
  });

  it('applyPauseBlocking fallback notifie et redirige', async () => {
    await applyPauseBlocking(1, 'https://youtube.com/shorts/abc', 3, getStorage, updateBadge, redirectToYouTube);
    expect(updateBadge).toHaveBeenCalledWith('paused');
    expect(redirectToYouTube).toHaveBeenCalledWith(1, 'https://youtube.com/shorts/abc');
    expect(global.browser.notifications.create).toHaveBeenCalled();
  });

  it('applyAdvancedBlocking appelle BlockingModeManager si défini', async () => {
    const applyBlockingMode = jest.fn();
    global.BlockingModeManager = { applyBlockingMode };
    await applyAdvancedBlocking(11, 10, 5, getStorage, setStorage, updateBadge);
    expect(applyBlockingMode).toHaveBeenCalled();
  });

  it('applyPauseBlocking appelle BlockingModeManager si défini', async () => {
    const applyBlockingMode = jest.fn();
    global.BlockingModeManager = { applyBlockingMode };
    await applyPauseBlocking(1, 'https://youtube.com/shorts/abc', 3, getStorage, updateBadge, redirectToYouTube);
    expect(applyBlockingMode).toHaveBeenCalled();
  });
}); 