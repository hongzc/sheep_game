import { TRAY_LIMIT } from './game.js';
import { LEVELS } from './levels.js';
import { t, levelTitle, getLocale, setLocale } from './i18n.js';
import { makeTileContent } from './assets-map.js';

const $ = (id) => document.getElementById(id);

export function renderLevelSelect(save, onPick) {
  const root = $('app');
  root.innerHTML = '';
  const wrap = el('div', 'screen level-select');

  const langBtn = el('button', 'lang-btn', getLocale() === 'en' ? '中' : 'EN');
  langBtn.setAttribute('aria-label', 'Switch language');
  langBtn.addEventListener('click', () => {
    setLocale(getLocale() === 'en' ? 'zh' : 'en');
    renderLevelSelect(save, onPick);
  });
  wrap.append(langBtn);

  wrap.append(el('h1', 'title', t('title')));
  wrap.append(el('p', 'subtitle', t('select_level')));

  const list = el('div', 'level-list');
  LEVELS.forEach((lv, i) => {
    if (i > save.highestUnlocked) return;
    const completed = save.completedLevels[i];
    const card = el('button', 'level-card' + (completed ? ' completed' : ''));
    card.style.animationDelay = `${i * 60}ms`;

    const num = el('div', 'level-num');
    num.append(el('span', 'level-num-text', String(lv.id).padStart(2, '0')));
    if (completed) num.append(el('div', 'level-num-check', '✓'));
    card.append(num);

    const main = el('div', 'level-main');
    main.append(el('div', 'level-name', levelTitle(lv.id)));
    const stars = el('div', 'level-stars');
    for (let s = 1; s <= 5; s++) {
      stars.append(el('span', 'star' + (s <= lv.difficulty ? ' on' : ''), '★'));
    }
    main.append(stars);
    card.append(main);

    card.append(el('div', 'level-arrow', '›'));

    card.addEventListener('click', () => onPick(i));
    list.append(card);
  });
  wrap.append(list);
  const remaining = LEVELS.length - 1 - save.highestUnlocked;
  if (remaining > 0) {
    wrap.append(el('p', 'lock-hint', t('lock_hint', remaining)));
  } else {
    wrap.append(el('p', 'lock-hint', t('all_cleared')));
  }
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
  hud.append(el('div', 'level-title', levelTitle(state.level.id)));
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
  const cols = state.stacks.length;
  const maxStack = Math.max(...state.level.heights);
  board.style.setProperty('--cols', String(cols));
  board.style.setProperty('--max-stack', String(maxStack));
  const offsetPx = Math.min(10, Math.floor(50 / Math.max(1, maxStack - 1)));
  state.stacks.forEach((stack, stackIdx) => {
    const col = el('div', 'col');
    stack.forEach((tile, depth) => {
      const tEl = el('div', 'tile' + (depth === stack.length - 1 ? ' top' : ''));
      tEl.style.transform = `translateY(${depth * -offsetPx}px)`;
      tEl.style.zIndex = String(depth);
      tEl.dataset.tileId = String(tile.id);
      tEl.append(makeTileContent(tile.type));
      if (depth === stack.length - 1) {
        tEl.addEventListener('click', () => handlers.onPick(stackIdx, tEl));
      }
      col.append(tEl);
    });
    if (stack.length === 0) col.classList.add('empty');
    board.append(col);
  });
  wrap.append(board);

  // Tray
  const tray = el('div', 'tray');
  tray.id = 'tray';
  const flyingIds = state.flyingIds || new Set();
  for (let i = 0; i < TRAY_LIMIT; i++) {
    const slot = el('div', 'slot');
    slot.dataset.slotIdx = String(i);
    const tile = state.tray[i];
    if (tile) {
      slot.dataset.tileId = String(tile.id);
      if (flyingIds.has(tile.id)) {
        slot.classList.add('reserved');
      } else {
        slot.classList.add('filled');
        slot.append(makeTileContent(tile.type));
      }
    }
    tray.append(slot);
  }
  wrap.append(tray);

  // Items
  const items = el('div', 'items');
  items.append(itemBtn('↶', t('item_undo'), state.items.undo, handlers.onUndo));
  items.append(itemBtn('🔀', t('item_shuffle'), state.items.shuffle, handlers.onShuffle));
  items.append(itemBtn('✂️', t('item_remove3'), state.items.remove3, handlers.onRemove3));
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

export function redrawTray(state) {
  const trayEl = document.getElementById('tray');
  if (!trayEl) return;
  const flyingIds = state.flyingIds || new Set();
  for (let i = 0; i < TRAY_LIMIT; i++) {
    const slot = trayEl.children[i];
    if (!slot) continue;
    const tile = state.tray[i];
    while (slot.firstChild) slot.firstChild.remove();
    slot.classList.remove('filled', 'reserved', 'just-filled');
    delete slot.dataset.tileId;
    if (tile) {
      slot.dataset.tileId = String(tile.id);
      if (flyingIds.has(tile.id)) {
        slot.classList.add('reserved');
      } else {
        slot.classList.add('filled');
        slot.append(makeTileContent(tile.type));
      }
    }
  }
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
