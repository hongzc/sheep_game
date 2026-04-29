// 12 只动物：emoji ↔ 文件名映射
// 出图后把 12 张 256×256 的 WebP 放到 assets/animals/，
// 然后把 USE_IMAGES 改成 true 即可切换。
export const USE_IMAGES = true;

export const ANIMAL_FILE = {
  '🐱': 'cat',
  '🐶': 'dog',
  '🐰': 'rabbit',
  '🐼': 'panda',
  '🦊': 'fox',
  '🐯': 'tiger',
  '🐨': 'koala',
  '🐮': 'cow',
  '🐷': 'pig',
  '🐸': 'frog',
  '🐵': 'monkey',
  '🐔': 'chicken',
};

export function tileImageSrc(emoji) {
  const name = ANIMAL_FILE[emoji];
  return name ? `assets/animals/${name}.webp` : null;
}

// 创建一个 tile 内部内容（img 或 emoji 文本），统一给 board / tray / 飞行 ghost 使用
export function makeTileContent(emojiType) {
  const inner = document.createElement('div');
  inner.className = 'tile-inner';
  if (USE_IMAGES) {
    const src = tileImageSrc(emojiType);
    if (src) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = emojiType;
      img.className = 'tile-img';
      img.draggable = false;
      img.onerror = () => {
        inner.textContent = emojiType;
      };
      inner.append(img);
      return inner;
    }
  }
  inner.textContent = emojiType;
  return inner;
}
