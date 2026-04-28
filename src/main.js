import { LEVELS } from './levels.js';
import {
  loadSave,
  markLevelCompleted,
  createGameState,
} from './state.js';
import {
  generateBoard,
  pickTile,
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

function goHome() {
  state = null;
  renderLevelSelect(save, startLevel);
}

function startLevel(levelIdx) {
  const level = LEVELS[levelIdx];
  state = createGameState(level);
  state.levelIdx = levelIdx;
  state.stacks = generateBoard(level);
  drawGame();
}

function drawGame() {
  renderGame(state, {
    onBack: goHome,
    onPick: (stackIdx) => {
      const before = state.tray.length;
      const ok = pickTile(state, stackIdx);
      if (!ok) return;
      if (state.tray.length < before) haptic('match');
      else haptic('pick');
      finishTurn();
    },
    onUndo: () => {
      if (useUndo(state)) drawGame();
    },
    onShuffle: () => {
      if (useShuffle(state)) {
        haptic('match');
        finishTurn();
      }
    },
    onRemove3: () => {
      if (useRemove3(state)) {
        haptic('match');
        finishTurn();
      }
    },
  });
}

function finishTurn() {
  drawGame();
  if (state.status === 'won') {
    haptic('win');
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

// 启动
goHome();
