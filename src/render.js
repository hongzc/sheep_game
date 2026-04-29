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
    if (i > save.highestUnlocked) return; // 隐藏未解锁
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
  state.stacks.forEach((stack, stackIdx) => {
    const col = el('div', 'col');
    stack.forEach((tile, depth) => {
      const tEl = el('div', 'tile' + (depth === stack.length - 1 ? ' top' : ''));
      tEl.style.transform = `translateY(${depth * -10}px)`;
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
  for (let i = 0; i < TRAY_LIMIT; i++) {
    const slot = el('div', 'slot');
    slot.dataset.slotIdx = String(i);
    const tile = state.tray[i];
    if (tile) {
      slot.classList.add('filled');
      slot.append(makeTileContent(tile.type));
      slot.dataset.tileId = String(tile.id);
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

export function showResultModal({ won, elapsedMs, hasNext }, handlers) {
  const root = $('app');
  const overlay = el('div', 'modal-overlay');
  const modal = el('div', 'modal');
  modal.append(el('div', 'modal-emoji', won ? '🎉' : '😿'));
  modal.append(el('div', 'modal-title', won ? t('won_title') : t('lost_title')));
  if (won) {
    const sec = (elapsedMs / 1000).toFixed(1);
    modal.append(el('div', 'modal-sub', t('time_used', sec)));
  } else {
    modal.append(el('div', 'modal-sub', t('lost_sub')));
  }
  const actions = el('div', 'modal-actions');
  if (won && hasNext) {
    const next = el('button', 'btn primary', t('btn_next'));
    next.addEventListener('click', handlers.onNext);
    actions.append(next);
  }
  const retry = el('button', 'btn' + (won ? '' : ' primary'), won ? t('btn_play_again') : t('btn_retry'));
  retry.addEventListener('click', handlers.onRetry);
  actions.append(retry);
  if (!won) {
    const home = el('button', 'btn', t('btn_home'));
    home.addEventListener('click', handlers.onHome);
    actions.append(home);
  }
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
