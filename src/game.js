import { ANIMAL_POOL } from './levels.js';

export const TRAY_LIMIT = 7;
export const MATCH_COUNT = 3;

let nextTileId = 1;

function newTile(type, stackIdx, depth) {
  return { id: nextTileId++, type, stackIdx, depth };
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 把 total 张牌分成 typesCount 种，每种数量是 3 的倍数。
// 若 total 不能被 (typesCount*3) 均分，让前几种多 3 张，剩下少。
function buildTilePool(total, typesCount) {
  const types = ANIMAL_POOL.slice(0, typesCount);
  const groups = Math.floor(total / MATCH_COUNT); // 总组数
  if (groups < typesCount) {
    throw new Error(`Level too small: ${total} tiles cannot fill ${typesCount} types`);
  }
  const baseGroupsPerType = Math.floor(groups / typesCount);
  const extra = groups - baseGroupsPerType * typesCount;
  const tiles = [];
  types.forEach((t, i) => {
    const g = baseGroupsPerType + (i < extra ? 1 : 0);
    for (let n = 0; n < g * MATCH_COUNT; n++) tiles.push(t);
  });
  // total 不能被 3 整除时，丢弃尾部余数（保证理论可解）
  return tiles;
}

export function generateBoard(level) {
  const total = level.heights.reduce((a, b) => a + b, 0);
  const usable = Math.floor(total / MATCH_COUNT) * MATCH_COUNT;
  const pool = shuffleArray(buildTilePool(usable, level.typesCount));
  const stacks = level.heights.map(() => []);
  let cursor = 0;
  level.heights.forEach((h, stackIdx) => {
    for (let depth = 0; depth < h; depth++) {
      if (cursor >= pool.length) break;
      stacks[stackIdx].push(newTile(pool[cursor++], stackIdx, depth));
    }
  });
  return stacks;
}

export function pickTile(state, stackIdx) {
  if (state.status !== 'playing') return null;
  const stack = state.stacks[stackIdx];
  if (!stack || stack.length === 0) return null;
  if (state.tray.length >= TRAY_LIMIT) return null;
  const tile = stack.pop();
  state.tray.push(tile);
  state.history.push({ type: 'pick', stackIdx, tile });
  return tile;
}

export function applyResolution(state) {
  const before = state.tray.length;
  resolveMatches(state);
  const matched = state.tray.length < before;
  checkEnd(state);
  return matched;
}

export function resolveMatches(state) {
  while (true) {
    const counts = {};
    state.tray.forEach((t, i) => {
      (counts[t.type] ??= []).push(i);
    });
    let removed = false;
    for (const type in counts) {
      if (counts[type].length >= MATCH_COUNT) {
        const removeSet = new Set(counts[type].slice(0, MATCH_COUNT));
        state.tray = state.tray.filter((_, i) => !removeSet.has(i));
        // history 标记本次消除，方便撤销时跳过
        state.history.push({ type: 'match' });
        removed = true;
        break;
      }
    }
    if (!removed) break;
  }
}

export function checkEnd(state) {
  const boardEmpty = state.stacks.every((s) => s.length === 0);
  if (boardEmpty && state.tray.length === 0) {
    state.status = 'won';
    state.elapsedMs = Date.now() - state.startTime;
    return;
  }
  if (state.tray.length >= TRAY_LIMIT) {
    state.status = 'lost';
    state.elapsedMs = Date.now() - state.startTime;
  }
}

// === 道具 ===

// 撤销：仅撤销最后一次"取牌"，途中遇到 match 历史一并跳过/不做反向
export function useUndo(state) {
  if (state.status !== 'playing') return false;
  if (state.items.undo <= 0) return false;
  // 找到最近一次 pick；中间可能有 match
  for (let i = state.history.length - 1; i >= 0; i--) {
    if (state.history[i].type === 'pick') {
      const { stackIdx, tile } = state.history[i];
      // 从 tray 末尾移除该 tile（若已被消除则不允许撤销）
      const trayIdx = state.tray.findIndex((t) => t.id === tile.id);
      if (trayIdx === -1) return false;
      state.tray.splice(trayIdx, 1);
      state.stacks[stackIdx].push(tile);
      state.history.splice(i, 1);
      state.items.undo -= 1;
      return true;
    }
    if (state.history[i].type === 'match') {
      // 触碰过消除后无法继续撤销
      return false;
    }
  }
  return false;
}

// 洗牌：重排所有未消除牌的 type（不改变 id/位置）
export function useShuffle(state) {
  if (state.status !== 'playing') return false;
  if (state.items.shuffle <= 0) return false;
  const allTiles = [...state.stacks.flat(), ...state.tray];
  const types = shuffleArray(allTiles.map((t) => t.type));
  allTiles.forEach((t, i) => (t.type = types[i]));
  state.items.shuffle -= 1;
  state.history.push({ type: 'shuffle' });
  resolveMatches(state);
  checkEnd(state);
  return true;
}

// 移出 3 个：从 tray 头部移除最多 3 张（视为丢弃）
export function useRemove3(state) {
  if (state.status !== 'playing') return false;
  if (state.items.remove3 <= 0) return false;
  if (state.tray.length === 0) return false;
  const removed = state.tray.splice(0, Math.min(3, state.tray.length));
  state.items.remove3 -= 1;
  state.history.push({ type: 'remove3', removed });
  checkEnd(state);
  return true;
}

// 用于失败检测时给玩家提示（暂未启用，可备 hint 道具）
export function hasAnyMatchPossible(state) {
  const allTypes = [
    ...state.tray.map((t) => t.type),
    ...state.stacks.flatMap((s) => s.slice(-1).map((t) => t.type)),
  ];
  const counts = {};
  allTypes.forEach((t) => (counts[t] = (counts[t] || 0) + 1));
  return Object.values(counts).some((c) => c >= MATCH_COUNT);
}
