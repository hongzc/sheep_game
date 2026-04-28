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

const tg = window.Telegram?.WebApp;
let save = loadSave();
let state = null;
let timerInterval = null;
let busy = false;

if (tg) {
  tg.ready();
  tg.expand();
}

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

function goHome() {
  stopTimer();
  state = null;
  busy = false;
  renderLevelSelect(save, startLevel);
}

function startLevel(levelIdx) {
  const level = LEVELS[levelIdx];
  state = createGameState(level);
  state.levelIdx = levelIdx;
  state.stacks = generateBoard(level);
  busy = false;
  drawGame();
  startTimer();
}

function drawGame() {
  renderGame(state, {
    onBack: goHome,
    onPick: (stackIdx, tileEl) => onPick(stackIdx, tileEl),
    onUndo: () => {
      if (busy) return;
      if (useUndo(state)) drawGame();
    },
    onShuffle: () => {
      if (busy) return;
      if (useShuffle(state)) {
        haptic('match');
        drawGame();
        finishTurn();
      }
    },
    onRemove3: () => {
      if (busy) return;
      if (useRemove3(state)) {
        haptic('match');
        drawGame();
        finishTurn();
      }
    },
  });
}

async function onPick(stackIdx, tileEl) {
  if (busy) return;
  if (state.status !== 'playing') return;
  const fromRect = tileEl?.getBoundingClientRect();
  const tile = pickTile(state, stackIdx);
  if (!tile) return;
  haptic('pick');
  busy = true;
  drawGame();
  const slot = document.querySelector(`#tray .slot[data-tile-id="${tile.id}"]`);
  if (fromRect && slot) {
    await flyTile(tile.type, fromRect, slot);
  }
  const matched = applyResolution(state);
  if (matched) {
    haptic('match');
    fireConfettiAt(document.getElementById('tray'));
    drawGame();
  }
  busy = false;
  finishTurn();
}

function flyTile(type, fromRect, toEl) {
  return new Promise((resolve) => {
    const toRect = toEl.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.className = 'tile flying';
    ghost.textContent = type;
    ghost.style.left = `${fromRect.left}px`;
    ghost.style.top = `${fromRect.top}px`;
    ghost.style.width = `${fromRect.width}px`;
    ghost.style.height = `${fromRect.height}px`;
    document.body.append(ghost);
    const prevText = toEl.textContent;
    toEl.textContent = '';
    toEl.classList.remove('filled');
    requestAnimationFrame(() => {
      const dx = toRect.left - fromRect.left;
      const dy = toRect.top - fromRect.top;
      const sx = toRect.width / fromRect.width;
      const sy = toRect.height / fromRect.height;
      ghost.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    });
    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      ghost.remove();
      toEl.textContent = prevText;
      toEl.classList.add('filled', 'just-filled');
      setTimeout(() => toEl.classList.remove('just-filled'), 280);
      resolve();
    };
    ghost.addEventListener('transitionend', cleanup, { once: true });
    setTimeout(cleanup, 360);
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
    haptic('win');
    if (window.confetti) {
      window.confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 } });
    }
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
    haptic('lose');
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
