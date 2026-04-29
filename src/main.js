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

function goHome() {
  stopTimer();
  state = null;
  applyTheme(null);
  renderLevelSelect(save, startLevel);
}

function startLevel(levelIdx) {
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

function onPick(stackIdx, tileEl) {
  if (state.status !== 'playing') return;
  const fromRect = tileEl?.getBoundingClientRect();
  const tile = pickTile(state, stackIdx);
  if (!tile) return;
  sfxPick();
  haptic('pick');
  drawGame();
  const slot = document.querySelector(`#tray .slot[data-tile-id="${tile.id}"]`);
  const arrive = () => {
    const matched = applyResolution(state);
    if (matched) {
      sfxMatch();
      haptic('match');
      fireConfettiAt(document.getElementById('tray'));
      drawGame();
    }
    finishTurn();
  };
  if (fromRect && slot) {
    flyTile(tile.type, fromRect, slot).then(arrive);
  } else {
    arrive();
  }
}

function flyTile(type, fromRect, toEl) {
  return new Promise((resolve) => {
    const toRect = toEl.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.className = 'tile flying';
    ghost.append(makeTileContent(type));
    ghost.style.left = `${fromRect.left}px`;
    ghost.style.top = `${fromRect.top}px`;
    ghost.style.width = `${fromRect.width}px`;
    ghost.style.height = `${fromRect.height}px`;
    document.body.append(ghost);
    const prevChildren = Array.from(toEl.childNodes);
    prevChildren.forEach((n) => n.remove());
    toEl.classList.remove('filled');
    // Force reflow so the initial styles (left/top/width/height/transform:none)
    // are committed before we change transform. Without this, the browser may
    // collapse the two states and skip the transition entirely.
    void ghost.offsetWidth;
    const dx = toRect.left - fromRect.left;
    const dy = toRect.top - fromRect.top;
    const sx = toRect.width / fromRect.width;
    const sy = toRect.height / fromRect.height;
    requestAnimationFrame(() => {
      ghost.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    });
    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      ghost.remove();
      prevChildren.forEach((n) => toEl.append(n));
      toEl.classList.add('filled', 'just-filled');
      setTimeout(() => toEl.classList.remove('just-filled'), 280);
      resolve();
    };
    ghost.addEventListener('transitionend', cleanup, { once: true });
    setTimeout(cleanup, 500);
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
