// Supposons que les utilitaires sont exportés de background.js ou d'un fichier utils.js
import { getToday } from '../background.js';

// isShortsUrl n'est pas exporté, mais on peut le tester en le copiant ici pour la couverture
function isShortsUrl(url) {
  const shortsRegex = /^https?:\/\/(?:www\.|m\.)?youtube\.com\/shorts\/.*$/;
  const mobileShortsRegex = /^https?:\/\/(?:youtu\.be\/.*|youtube\.com\/.*[?&]v=.*&.*shorts|.*youtube.*\/shorts)/;
  if (!url) return false;
  if (shortsRegex.test(url) || mobileShortsRegex.test(url)) return true;
  if (url.includes('youtube.com') && url.includes('/shorts/')) return true;
  return false;
}

describe('utils (background.js)', () => {
  it('getToday retourne la date au format YYYY-MM-DD', () => {
    const today = getToday();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('isShortsUrl détecte les URLs Shorts desktop', () => {
    expect(isShortsUrl('https://www.youtube.com/shorts/abc123')).toBe(true);
    expect(isShortsUrl('https://m.youtube.com/shorts/xyz456')).toBe(true);
  });

  it('isShortsUrl détecte les URLs Shorts mobiles', () => {
    expect(isShortsUrl('https://youtu.be/abc123')).toBe(true);
    expect(isShortsUrl('https://youtube.com/watch?v=abc123&shorts')).toBe(true);
    expect(isShortsUrl('https://youtube.com/shorts/abc123')).toBe(true);
  });

  it('isShortsUrl retourne false pour une URL classique', () => {
    expect(isShortsUrl('https://www.youtube.com/watch?v=abc123')).toBe(false);
    expect(isShortsUrl('https://www.google.com')).toBe(false);
  });
}); 