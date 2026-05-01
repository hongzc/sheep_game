import { LEVELS } from './levels.js';
import { load, save as saveKey } from './shared/storage.js';

const SAVE_KEY = 'triple_pop_save_v1';

export function loadSave() {
  const raw = load(SAVE_KEY);
  if (!raw) return defaultSave();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.completedLevels) return defaultSave();
    while (parsed.completedLevels.length < LEVELS.length) {
      parsed.completedLevels.push(false);
    }
    return parsed;
  } catch {
    return defaultSave();
  }
}

export function saveSave(save) {
  saveKey(SAVE_KEY, JSON.stringify(save));
}

function defaultSave() {
  return {
    highestUnlocked: 0,
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
    status: 'playing',
    items: { ...level.items },
    history: [],
    startTime: Date.now(),
    elapsedMs: 0,
    flyingIds: new Set(),
  };
}
