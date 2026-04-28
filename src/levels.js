// 动物 emoji 池（按辨识度排序，前面的优先）
export const ANIMAL_POOL = [
  '🐱', '🐶', '🐰', '🐼', '🦊', '🐯', '🐨', '🐮', '🐷', '🐸',
  '🐵', '🐔',
];

// 每关的列高度数组，长度 = 列数
// 牌总数 = sum(heights)，运行时会取 floor(total/3)*3 张并按 typesCount 均分（每种数量为 3 的倍数）
export const LEVELS = [
  {
    id: 1,
    name: '第 1 关 · 入门',
    heights: [3, 4, 4, 3, 4, 3, 3], // 7 列 = 24
    typesCount: 8,
    items: { undo: 2, shuffle: 1, remove3: 1 },
  },
  {
    id: 2,
    name: '第 2 关 · 进阶',
    heights: [5, 6, 5, 6, 5, 5, 5, 5], // 8 列 = 42
    typesCount: 10,
    items: { undo: 2, shuffle: 1, remove3: 0 },
  },
  {
    id: 3,
    name: '第 3 关 · 挑战',
    heights: [7, 8, 7, 8, 8, 7, 8, 6, 4], // 9 列 = 63
    typesCount: 10,
    items: { undo: 1, shuffle: 1, remove3: 0 },
  },
];
