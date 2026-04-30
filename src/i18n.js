const dict = {
  zh: {
    title: 'Triple Pop',
    select_level: '选择关卡',
    level_names: ['新手', '入门', '进阶', '挑战', '高手', '大师', '噩梦', '终极'],
    level_prefix: '第 {0} 关',
    lock_hint: '通关后解锁下一关 · 剩余 {0} 关待挑战',
    all_cleared: '🏆 全关卡已通关',
    item_undo: '撤销',
    item_shuffle: '洗牌',
    item_remove3: '移出 3',
    won_title: '通关！',
    lost_title: '失败了',
    time_used: '用时 {0}s',
    lost_sub: '槽位满了，再来一次？',
    btn_next: '下一关',
    btn_play_again: '再玩一次',
    btn_retry: '重试',
    btn_home: '关卡选择',
    btn_follow: '🐾 关注 TinyPaws',
  },
  en: {
    title: 'Triple Pop',
    select_level: 'Select Level',
    level_names: ['Rookie', 'Easy', 'Medium', 'Hard', 'Expert', 'Master', 'Nightmare', 'Ultimate'],
    level_prefix: 'Level {0}',
    lock_hint: 'Clear a level to unlock the next · {0} to go',
    all_cleared: '🏆 All levels cleared',
    item_undo: 'Undo',
    item_shuffle: 'Shuffle',
    item_remove3: 'Remove 3',
    won_title: 'You Won!',
    lost_title: 'Game Over',
    time_used: 'Time {0}s',
    lost_sub: 'Tray is full. Try again?',
    btn_next: 'Next Level',
    btn_play_again: 'Play Again',
    btn_retry: 'Retry',
    btn_home: 'Levels',
    btn_follow: '🐾 Follow TinyPaws',
  },
};

const LOCALE_KEY = 'triple_pop_locale_v1';
const SUPPORTED = ['en', 'zh'];

function loadLocale() {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved && SUPPORTED.includes(saved)) return saved;
  } catch {
    // ignore
  }
  return 'en';
}

let currentLocale = loadLocale();
try { document.documentElement.lang = currentLocale; } catch {}

export function getLocale() {
  return currentLocale;
}

export function setLocale(loc) {
  if (!SUPPORTED.includes(loc)) return;
  currentLocale = loc;
  try { localStorage.setItem(LOCALE_KEY, loc); } catch {}
  try { document.documentElement.lang = loc; } catch {}
}

export function nextLocale() {
  return currentLocale === 'en' ? 'zh' : 'en';
}

export function t(key, ...args) {
  const tbl = dict[currentLocale] || dict.en;
  let v = tbl[key];
  if (v === undefined) v = dict.en[key];
  if (typeof v === 'string') {
    args.forEach((a, i) => {
      v = v.replace(`{${i}}`, String(a));
    });
  }
  return v;
}

export function levelName(id) {
  return t('level_names')[id - 1] || `#${id}`;
}

export function levelTitle(id) {
  return `${t('level_prefix', id)} · ${levelName(id)}`;
}
