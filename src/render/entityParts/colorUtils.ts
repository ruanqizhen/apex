// 把 #rrggbb / #rgb 转成 rgba 字符串，供鳍膜渐变等需要透明度的场合使用；
// 已经是 rgba/rgb/hsl 的颜色原样返回（渐变里再叠透明度会失真，不做二次处理）。
export function hexToRgba(color: string, alpha: number): string {
  const hex = color.replace('#', '');
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

export function darkenColor(color: string, percent: number): string {
  if (color.startsWith('hsl')) {
    const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (match) {
      const h = match[1];
      const s = match[2];
      const l = Math.max(0, parseInt(match[3]) - percent);
      return `hsl(${h}, ${s}%, ${l}%)`;
    }
    return '#000';
  }
  if (color.startsWith('rgba') || color.startsWith('rgb')) return color;

  const num = parseInt(color.replace('#', ''), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) - amt,
    G = (num >> 8 & 0x00FF) - amt,
    B = (num & 0x0000FF) - amt;
  return `#${(0x1000000 + (R < 0 ? 0 : R > 255 ? 255 : R) * 0x10000 + (G < 0 ? 0 : G > 255 ? 255 : G) * 0x100 + (B < 0 ? 0 : B > 255 ? 255 : B)).toString(16).slice(1)}`;
}

export function lightenColor(color: string, percent: number): string {
  if (color.startsWith('hsl')) {
    const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (match) {
      const h = match[1];
      const s = match[2];
      const l = Math.min(100, parseInt(match[3]) + percent);
      return `hsl(${h}, ${s}%, ${l}%)`;
    }
    return '#fff';
  }
  if (color.startsWith('rgba') || color.startsWith('rgb')) return color;

  const num = parseInt(color.replace('#', ''), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    G = (num >> 8 & 0x00FF) + amt,
    B = (num & 0x0000FF) + amt;
  return `#${(0x1000000 + (R < 0 ? 0 : R > 255 ? 255 : R) * 0x10000 + (G < 0 ? 0 : G > 255 ? 255 : G) * 0x100 + (B < 0 ? 0 : B > 255 ? 255 : B)).toString(16).slice(1)}`;
}
