// 动物 emoji 池（按辨识度排序，前面的优先）
export const ANIMAL_POOL = [
  '🐱', '🐶', '🐰', '🐼', '🦊', '🐯', '🐨', '🐮', '🐷', '🐸',
];

// 每关的列高度数组，长度 = 列数
// 牌总数 = sum(heights)，必须是 typesPerLevel * 3 的倍数（即每种类型至少 3 张）
export const LEVELS = [
  {
    id: 1,
    name: '第 1 关 · 入门',
    heights: [3, 3, 3, 3, 3, 3], // 6 列 × 3 = 18
    typesCount: 6,
    items: { undo: 2, shuffle: 1, remove3: 1 },
  },
  {
    id: 2,
    name: '第 2 关 · 进阶',
    heights: [4, 5, 4, 5, 4, 4, 4], // 7 列 = 30
    typesCount: 7, // 30 / 7 不能整除，运行时会调整为最接近的 3 的倍数
    items: { undo: 2, shuffle: 1, remove3: 1 },
  },
  {
    id: 3,
    name: '第 3 关 · 挑战',
    heights: [5, 6, 7, 6, 7, 6, 6, 5], // 8 列 = 48
    typesCount: 8,
    items: { undo: 3, shuffle: 2, remove3: 1 },
  },
];
