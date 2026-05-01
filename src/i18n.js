// sheep 专属字典 + 关卡名 helpers。引擎从 shared/i18n.js 透传。
import { registerStrings, t, getLocale, setLocale, nextLocale } from './shared/i18n.js';

const sheepStrings = {
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
    time_used: '用时 {0}s',
    lost_sub: '槽位满了，再来一次？',
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
    time_used: 'Time {0}s',
    lost_sub: 'Tray is full. Try again?',
  },
};

registerStrings(sheepStrings);

export { t, getLocale, setLocale, nextLocale };

export function levelName(id) {
  return t('level_names')[id - 1] || `#${id}`;
}

export function levelTitle(id) {
  return `${t('level_prefix', id)} · ${levelName(id)}`;
}
