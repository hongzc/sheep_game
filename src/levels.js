// 动物 emoji 池（按辨识度排序，前面的优先）
export const ANIMAL_POOL = [
  '🐱', '🐶', '🐰', '🐼', '🦊', '🐯', '🐨', '🐮', '🐷', '🐸',
  '🐵', '🐔',
];

// 8 关阶梯式难度：牌数↑ + 类型数↑ + 道具配额↓
export const LEVELS = [
  {
    id: 1,
    name: '新手',
    difficulty: 1,
    heights: [6, 6, 6, 6, 6, 6, 6], // 7 列 = 42
    typesCount: 8,
    items: { undo: 2, shuffle: 1, remove3: 1 },
  },
  {
    id: 2,
    name: '入门',
    difficulty: 2,
    heights: [7, 7, 7, 7, 7, 7, 7], // 7 列 = 49
    typesCount: 9,
    items: { undo: 2, shuffle: 1, remove3: 0 },
  },
  {
    id: 3,
    name: '进阶',
    difficulty: 2,
    heights: [8, 8, 8, 8, 8, 8, 8, 8], // 8 列 = 64
    typesCount: 10,
    items: { undo: 1, shuffle: 1, remove3: 1 },
  },
  {
    id: 4,
    name: '挑战',
    difficulty: 3,
    heights: [9, 9, 9, 9, 9, 9, 9, 9], // 8 列 = 72
    typesCount: 10,
    items: { undo: 1, shuffle: 1, remove3: 0 },
  },
  {
    id: 5,
    name: '高手',
    difficulty: 3,
    heights: [10, 10, 10, 10, 10, 10, 10, 10], // 8 列 = 80
    typesCount: 11,
    items: { undo: 1, shuffle: 1, remove3: 0 },
  },
  {
    id: 6,
    name: '大师',
    difficulty: 4,
    heights: [11, 11, 11, 11, 11, 11, 11, 11, 11], // 9 列 = 99
    typesCount: 11,
    items: { undo: 1, shuffle: 0, remove3: 1 },
  },
  {
    id: 7,
    name: '噩梦',
    difficulty: 4,
    heights: [12, 12, 12, 12, 12, 12, 12, 12, 12], // 9 列 = 108
    typesCount: 12,
    items: { undo: 0, shuffle: 1, remove3: 0 },
  },
  {
    id: 8,
    name: '终极',
    difficulty: 5,
    heights: [13, 13, 13, 13, 13, 13, 13, 13, 13], // 9 列 = 117
    typesCount: 12,
    items: { undo: 0, shuffle: 0, remove3: 0 },
  },
];
