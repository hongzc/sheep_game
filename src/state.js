import { LEVELS } from './levels.js';

const SAVE_KEY = 'triple_pop_save_v1';

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    if (!parsed.completedLevels) return defaultSave();
    return parsed;
  } catch {
    return defaultSave();
  }
}

export function saveSave(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // ignore quota / private mode
  }
}

function defaultSave() {
  return {
    highestUnlocked: 0, // 索引，0 = 第 1 关
    completedLevels: LEVELS.map(() => false),
    lastPlayedAt: 0,
  };
}

export function isLevelUnlocked(save, levelIdx) {
  return levelIdx <= save.highestUnlocked;
}

export function markLevelCompleted(save, levelIdx) {
  save.completedLevels[levelIdx] = true;
  if (levelIdx + 1 < LEVELS.length && levelIdx + 1 > save.highestUnlocked) {
    save.highestUnlocked = levelIdx + 1;
  }
  save.lastPlayedAt = Date.now();
  saveSave(save);
}

export function createGameState(level) {
  return {
    level,
    stacks: [],
    tray: [],
    status: 'playing', // 'playing' | 'won' | 'lost'
    items: { ...level.items },
    history: [],
    startTime: Date.now(),
    elapsedMs: 0,
  };
}
