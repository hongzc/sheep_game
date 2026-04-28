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
    if (i > save.highestUnlocked) return; // 隐藏未解锁
    const completed = save.completedLevels[i];
    const card = el('button', 'level-card' + (completed ? ' completed' : ''));
    card.style.animationDelay = `${i * 60}ms`;

    const num = el('div', 'level-num');
    num.append(el('span', 'level-num-text', String(lv.id).padStart(2, '0')));
    if (completed) num.append(el('div', 'level-num-check', '✓'));
    card.append(num);

    const main = el('div', 'level-main');
    main.append(el('div', 'level-name', `第 ${lv.id} 关 · ${lv.name}`));
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
    wrap.append(el('p', 'lock-hint', `通关后解锁下一关 · 剩余 ${remaining} 关待挑战`));
  } else {
    wrap.append(el('p', 'lock-hint', '🏆 全关卡已通关'));
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
  const cols = state.stacks.length;
  const maxStack = Math.max(...state.level.heights);
  board.style.setProperty('--cols', String(cols));
  board.style.setProperty('--max-stack', String(maxStack));
  state.stacks.forEach((stack, stackIdx) => {
    const col = el('div', 'col');
    stack.forEach((tile, depth) => {
      const t = el('div', 'tile' + (depth === stack.length - 1 ? ' top' : ''));
      t.style.transform = `translateY(${depth * -6}px)`;
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
  const retry = el('button', 'btn' + (won ? '' : ' primary'), won ? '再玩一次' : '重试');
  retry.addEventListener('click', handlers.onRetry);
  actions.append(retry);
  // 通关后不显示关卡选择按钮（已通过 modal 完成关卡）
  if (!won) {
    const home = el('button', 'btn', '关卡选择');
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
