import { LEVELS } from './levels.js';
import {
  loadSave,
  markLevelCompleted,
  createGameState,
} from './state.js';
import {
  generateBoard,
  pickTile,
  applyResolution,
  useUndo,
  useShuffle,
  useRemove3,
} from './game.js';
import {
  renderLevelSelect,
  renderGame,
  showResultModal,
} from './render.js';
import {
  sfxPick, sfxMatch, sfxWin, sfxLose, sfxItem,
  isMuted, toggleMute, unlockAudio,
} from './audio.js';
import { identify, track } from './analytics.js';
import { makeTileContent } from './assets-map.js';

const tg = window.Telegram?.WebApp;
let save = loadSave();
let state = null;
let timerInterval = null;

if (tg) {
  tg.ready();
  tg.expand();
}

// 埋点身份
const tgUser = tg?.initDataUnsafe?.user;
if (tgUser) identify(tgUser);
track('app_loaded', {
  has_telegram_user: !!tgUser,
  platform: tg?.platform || 'web',
  color_scheme: tg?.colorScheme || 'unknown',
});

// 解锁 AudioContext（浏览器要求首次手势触发）
window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('touchstart', unlockAudio, { once: true });

function haptic(kind) {
  if (!tg?.HapticFeedback) return;
  if (kind === 'pick') tg.HapticFeedback.selectionChanged();
  else if (kind === 'match') tg.HapticFeedback.impactOccurred('medium');
  else if (kind === 'win') tg.HapticFeedback.notificationOccurred('success');
  else if (kind === 'lose') tg.HapticFeedback.notificationOccurred('error');
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function startTimer() {
  stopTimer();
  timerInterval = setInterval(() => {
    if (!state || state.status !== 'playing') return;
    const el = document.getElementById('timer');
    if (!el) return;
    const ms = Date.now() - state.startTime;
    const s = Math.floor(ms / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    el.textContent = `${mm}:${ss}`;
  }, 250);
}

function applyTheme(theme) {
  if (theme) document.body.dataset.theme = theme;
  else delete document.body.dataset.theme;
}

function clearFlyingGhosts() {
  document.querySelectorAll('.tile.flying').forEach((g) => g.remove());
}

function goHome() {
  stopTimer();
  clearFlyingGhosts();
  state = null;
  applyTheme(null);
  renderLevelSelect(save, startLevel);
}

function startLevel(levelIdx) {
  clearFlyingGhosts();
  const level = LEVELS[levelIdx];
  state = createGameState(level);
  state.levelIdx = levelIdx;
  state.stacks = generateBoard(level);
  state.itemsUsed = { undo: 0, shuffle: 0, remove3: 0 };
  applyTheme(level.theme);
  track('level_start', { level_id: level.id, level_name: level.name });
  drawGame();
  startTimer();
}

function drawGame() {
  renderGame(state, {
    onBack: goHome,
    onPick: (stackIdx, tileEl) => onPick(stackIdx, tileEl),
    onUndo: () => {
      if (useUndo(state)) {
        state.itemsUsed.undo++;
        track('item_used', { item: 'undo', level_id: state.level.id });
        sfxItem();
        drawGame();
      }
    },
    onShuffle: () => {
      if (useShuffle(state)) {
        state.itemsUsed.shuffle++;
        track('item_used', { item: 'shuffle', level_id: state.level.id });
        sfxItem();
        haptic('match');
        drawGame();
        finishTurn();
      }
    },
    onRemove3: () => {
      if (useRemove3(state)) {
        state.itemsUsed.remove3++;
        track('item_used', { item: 'remove3', level_id: state.level.id });
        sfxItem();
        haptic('match');
        drawGame();
        finishTurn();
      }
    },
    onToggleMute: () => {
      const m = toggleMute();
      track('mute_toggled', { muted: m });
      const btn = document.getElementById('mute-btn');
      if (btn) btn.textContent = m ? '🔇' : '🔊';
    },
    isMuted,
  });
}

function snapshotTileSource(el) {
  // 用 offsetWidth/Height 拿到不受 :active scale 影响的真实尺寸；
  // 中心点用 getBoundingClientRect（transform-origin 是 center，中心仍准确）
  const r = el.getBoundingClientRect();
  const w = el.offsetWidth || r.width;
  const h = el.offsetHeight || r.height;
  return {
    cx: r.left + r.width / 2,
    cy: r.top + r.height / 2,
    w,
    h,
  };
}

function onPick(stackIdx, tileEl) {
  if (!state || state.status !== 'playing') return;
  if (!tileEl) return;
  const src = snapshotTileSource(tileEl);

  const tile = pickTile(state, stackIdx);
  if (!tile) return;
  state.flyingIds.add(tile.id);

  sfxPick();
  haptic('pick');

  // 外科手术式更新：不重建 board DOM，避免 iOS 在 pointerdown/pointerup 间吞 click
  tileEl.style.visibility = 'hidden';
  tileEl.classList.remove('top');

  // 立刻把下一张提升为新 top（不等飞行结束），用户飞行期间也能继续点
  const prevSibling = tileEl.previousElementSibling;
  if (prevSibling && prevSibling.classList.contains('tile')) {
    prevSibling.classList.add('top');
    prevSibling.addEventListener('click', () => onPick(stackIdx, prevSibling));
  }

  const trayEl = document.getElementById('tray');
  const trayIdx = state.tray.length - 1;
  const slot = trayEl?.children[trayIdx];
  if (slot) {
    slot.dataset.tileId = String(tile.id);
    slot.classList.add('reserved');
    slot.classList.remove('filled', 'just-filled');
    while (slot.firstChild) slot.firstChild.remove();
  }

  const tileId = tile.id;
  const tileType = tile.type;

  const onArrived = () => {
    if (!state) return;
    state.flyingIds.delete(tileId);

    // tray 槽位：reserved → filled
    const landed = document.querySelector(
      `#tray .slot[data-tile-id="${tileId}"]`,
    );
    if (landed) {
      landed.classList.remove('reserved');
      landed.classList.add('filled', 'just-filled');
      landed.append(makeTileContent(tileType));
      setTimeout(() => landed.classList.remove('just-filled'), 280);
    }

    // board 列：飞行结束，移除已隐藏的旧 top；新 top 已在 onPick 时升级好
    if (tileEl.parentElement) {
      const col = tileEl.parentElement;
      col.removeChild(tileEl);
      if (col.children.length === 0) col.classList.add('empty');
    }

    const matched = applyResolution(state);
    if (matched) {
      sfxMatch();
      haptic('match');
      fireConfettiAt(document.getElementById('tray'));
      drawGame();
    }
    finishTurn();
  };

  if (slot && src.w > 0 && src.h > 0) {
    const toRect = slot.getBoundingClientRect();
    flyTile(tile.type, src, toRect).then(onArrived);
  } else {
    onArrived();
  }
}

function flyTile(type, src, toRect) {
  return new Promise((resolve) => {
    const ghost = document.createElement('div');
    ghost.className = 'tile flying';
    ghost.append(makeTileContent(type));
    const left = src.cx - src.w / 2;
    const top = src.cy - src.h / 2;
    ghost.style.left = `${left}px`;
    ghost.style.top = `${top}px`;
    ghost.style.width = `${src.w}px`;
    ghost.style.height = `${src.h}px`;
    ghost.style.transform = 'translate(0px, 0px) scale(1, 1)';
    document.body.append(ghost);
    // 强制 reflow 让初始 transform 落到样式里，再在下一帧改写终态
    void ghost.offsetWidth;

    const targetCx = toRect.left + toRect.width / 2;
    const targetCy = toRect.top + toRect.height / 2;
    const dx = targetCx - src.cx;
    const dy = targetCy - src.cy;
    const sx = toRect.width / src.w;
    const sy = toRect.height / src.h;

    // 双 rAF：跨过 commit 边界，确保 transition 一定触发
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        ghost.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
      });
    });

    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      ghost.remove();
      resolve();
    };
    ghost.addEventListener('transitionend', (e) => {
      if (e.propertyName === 'transform') cleanup();
    });
    // 兜底（CSS 是 0.32s，留 80ms 余量）
    setTimeout(cleanup, 400);
  });
}

function fireConfettiAt(el) {
  if (!window.confetti || !el) return;
  const r = el.getBoundingClientRect();
  const x = (r.left + r.width / 2) / window.innerWidth;
  const y = (r.top + r.height / 2) / window.innerHeight;
  window.confetti({
    particleCount: 60,
    spread: 70,
    startVelocity: 35,
    origin: { x, y },
    scalar: 0.8,
    ticks: 120,
  });
}

function finishTurn() {
  if (state.status === 'won') {
    stopTimer();
    sfxWin();
    haptic('win');
    if (window.confetti) {
      window.confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 } });
    }
    track('level_win', {
      level_id: state.level.id,
      elapsed_ms: state.elapsedMs,
      undo_used: state.itemsUsed?.undo || 0,
      shuffle_used: state.itemsUsed?.shuffle || 0,
      remove3_used: state.itemsUsed?.remove3 || 0,
    });
    markLevelCompleted(save, state.levelIdx);
    showResultModal(
      {
        won: true,
        elapsedMs: state.elapsedMs,
        hasNext: state.levelIdx + 1 < LEVELS.length,
      },
      {
        onNext: () => startLevel(state.levelIdx + 1),
        onRetry: () => startLevel(state.levelIdx),
        onHome: goHome,
        onFollow: () => {
          track('follow_clicked', {
            source: 'win_modal',
            level_id: state.level.id,
          });
          const url = 'https://t.me/tinypaws_games';
          if (tg?.openTelegramLink) tg.openTelegramLink(url);
          else window.open(url, '_blank');
        },
      },
    );
  } else if (state.status === 'lost') {
    stopTimer();
    sfxLose();
    haptic('lose');
    track('level_lose', {
      level_id: state.level.id,
      elapsed_ms: state.elapsedMs,
      tray_size: state.tray.length,
      undo_used: state.itemsUsed?.undo || 0,
      shuffle_used: state.itemsUsed?.shuffle || 0,
      remove3_used: state.itemsUsed?.remove3 || 0,
    });
    showResultModal(
      { won: false, elapsedMs: state.elapsedMs, hasNext: false },
      {
        onRetry: () => startLevel(state.levelIdx),
        onHome: goHome,
      },
    );
  }
}

goHome();
