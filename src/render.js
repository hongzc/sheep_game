import { TRAY_LIMIT } from './game.js';
import { LEVELS } from './levels.js';

const $ = (id) => document.getElementById(id);

export function renderLevelSelect(save, onPick) {
  const root = $('app');
  root.innerHTML = '';
  const wrap = el('div', 'screen level-select');
  wrap.append(el('h1', 'title', 'Triple Pop'));
  wrap.append(el('p', 'subtitle', '选择关卡'));

  const list = el('div', 'level-list');
  LEVELS.forEach((lv, i) => {
    const unlocked = i <= save.highestUnlocked;
    const completed = save.completedLevels[i];
    const card = el('button', 'level-card' + (unlocked ? '' : ' locked'));
    card.append(el('div', 'level-name', lv.name));
    const meta = el('div', 'level-meta');
    meta.append(el('span', 'meta-item', `${lv.heights.length} 列`));
    meta.append(el('span', 'meta-item', `${lv.heights.reduce((a, b) => a + b, 0)} 张`));
    meta.append(el('span', 'meta-item', `${lv.typesCount} 种`));
    card.append(meta);
    if (completed) card.append(el('div', 'level-badge', '✓ 已通关'));
    else if (!unlocked) card.append(el('div', 'level-badge', '🔒 未解锁'));
    if (unlocked) card.addEventListener('click', () => onPick(i));
    list.append(card);
  });
  wrap.append(list);
  root.append(wrap);
}

export function renderGame(state, handlers) {
  const root = $('app');
  root.innerHTML = '';
  const wrap = el('div', 'screen game');

  // HUD
  const hud = el('div', 'hud');
  const back = el('button', 'icon-btn', '←');
  back.addEventListener('click', handlers.onBack);
  hud.append(back);
  hud.append(el('div', 'level-title', state.level.name));
  const timer = el('div', 'timer', '00:00');
  timer.id = 'timer';
  hud.append(timer);
  const mute = el('button', 'icon-btn mute-btn', handlers.isMuted?.() ? '🔇' : '🔊');
  mute.id = 'mute-btn';
  mute.addEventListener('click', handlers.onToggleMute);
  hud.append(mute);
  wrap.append(hud);

  // Board
  const board = el('div', 'board');
  board.id = 'board';
  state.stacks.forEach((stack, stackIdx) => {
    const col = el('div', 'col');
    stack.forEach((tile, depth) => {
      const t = el('div', 'tile' + (depth === stack.length - 1 ? ' top' : ''));
      t.style.transform = `translateY(${depth * -8}px)`;
      t.style.zIndex = String(depth);
      t.textContent = tile.type;
      t.dataset.tileId = String(tile.id);
      if (depth === stack.length - 1) {
        t.addEventListener('click', () => handlers.onPick(stackIdx, t));
      }
      col.append(t);
    });
    if (stack.length === 0) col.classList.add('empty');
    board.append(col);
  });
  wrap.append(board);

  // Tray
  const tray = el('div', 'tray');
  tray.id = 'tray';
  for (let i = 0; i < TRAY_LIMIT; i++) {
    const slot = el('div', 'slot');
    slot.dataset.slotIdx = String(i);
    const tile = state.tray[i];
    if (tile) {
      slot.classList.add('filled');
      slot.textContent = tile.type;
      slot.dataset.tileId = String(tile.id);
    }
    tray.append(slot);
  }
  wrap.append(tray);

  // Items
  const items = el('div', 'items');
  items.append(itemBtn('↶', '撤销', state.items.undo, handlers.onUndo));
  items.append(itemBtn('🔀', '洗牌', state.items.shuffle, handlers.onShuffle));
  items.append(itemBtn('✂️', '移出 3', state.items.remove3, handlers.onRemove3));
  wrap.append(items);

  root.append(wrap);
}

function itemBtn(icon, label, count, handler) {
  const b = el('button', 'item-btn' + (count <= 0 ? ' disabled' : ''));
  b.append(el('div', 'item-icon', icon));
  b.append(el('div', 'item-label', label));
  b.append(el('div', 'item-count', `× ${count}`));
  if (count > 0) b.addEventListener('click', handler);
  return b;
}

export function showResultModal({ won, elapsedMs, hasNext }, handlers) {
  const root = $('app');
  const overlay = el('div', 'modal-overlay');
  const modal = el('div', 'modal');
  modal.append(el('div', 'modal-emoji', won ? '🎉' : '😿'));
  modal.append(el('div', 'modal-title', won ? '通关！' : '失败了'));
  if (won) {
    const sec = (elapsedMs / 1000).toFixed(1);
    modal.append(el('div', 'modal-sub', `用时 ${sec}s`));
  } else {
    modal.append(el('div', 'modal-sub', '槽位满了，再来一次？'));
  }
  const actions = el('div', 'modal-actions');
  if (won && hasNext) {
    const next = el('button', 'btn primary', '下一关');
    next.addEventListener('click', handlers.onNext);
    actions.append(next);
  }
  const retry = el('button', 'btn', won ? '再玩一次' : '重试');
  retry.addEventListener('click', handlers.onRetry);
  actions.append(retry);
  const home = el('button', 'btn', '关卡选择');
  home.addEventListener('click', handlers.onHome);
  actions.append(home);
  modal.append(actions);
  overlay.append(modal);
  root.append(overlay);
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
