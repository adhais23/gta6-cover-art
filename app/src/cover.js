// Draws a Vice Coast cover on a canvas 2D context at any size: photo panels with a
// colour grade, a title band with gradient Anton lettering, a script subtitle, a badge
// ribbon, heat stars, grain and vignette. Pure drawing — no network, no DOM reads.

import { panelCount } from './state.js';

/** The panel rectangles for a layout, in cover coordinates (W x H). */
export function layoutPanels(W, H, layout) {
  const m = W * 0.02;
  const g = W * 0.012;
  const bandTop = H * 0.74;
  const region = { x: m, y: m, w: W - 2 * m, h: bandTop - 2 * m };
  if (layout === 'fullbleed') return [{ ...region }];
  if (layout === 'hero3') {
    const heroW = region.w * 0.62;
    const colX = region.x + heroW + g;
    const colW = region.w - heroW - g;
    const ch = (region.h - 2 * g) / 3;
    return [
      { x: region.x, y: region.y, w: heroW, h: region.h },
      { x: colX, y: region.y, w: colW, h: ch },
      { x: colX, y: region.y + ch + g, w: colW, h: ch },
      { x: colX, y: region.y + 2 * (ch + g), w: colW, h: ch },
    ];
  }
  if (layout === 'nine') {
    const cw = (region.w - 2 * g) / 3;
    const ch = (region.h - 2 * g) / 3;
    const rects = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        rects.push({ x: region.x + c * (cw + g), y: region.y + r * (ch + g), w: cw, h: ch });
      }
    }
    return rects;
  }
  const cw = (region.w - g) / 2;
  const ch = (region.h - g) / 2;
  return [
    { x: region.x, y: region.y, w: cw, h: ch },
    { x: region.x + cw + g, y: region.y, w: cw, h: ch },
    { x: region.x, y: region.y + ch + g, w: cw, h: ch },
    { x: region.x + cw + g, y: region.y + ch + g, w: cw, h: ch },
  ];
}

/** Which panel (if any) holds point (x, y) in cover coordinates. */
export function panelAt(W, H, layout, x, y) {
  const rects = layoutPanels(W, H, layout);
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

const GRADE_TINTS = {
  sunset: ['rgba(255, 176, 66, 0.14)', 'rgba(255, 41, 117, 0.42)'],
  neon: ['rgba(0, 229, 255, 0.16)', 'rgba(255, 41, 117, 0.40)'],
  vice: ['rgba(255, 154, 61, 0.12)', 'rgba(123, 47, 247, 0.34)'],
  original: null,
};

const TITLE_GRADIENTS = {
  sunset: ['#ffd319', '#ff9a3d', '#ff2975'],
  neon: ['#00e5ff', '#7b2ff7', '#ff2975'],
  vice: ['#ff9a3d', '#ff2975', '#c44dff'],
  original: ['#ffffff', '#ffd319', '#ff9a3d'],
};

const SUBTITLE_COLORS = { sunset: '#ffd319', neon: '#00e5ff', vice: '#ff9a3d', original: '#ffd319' };

/** Draws one photo into its panel rect, cover-fit, panned by (cx, cy) in [-1, 1] and zoomed. */
export function drawPhotoInPanel(ctx, img, rect, crop) {
  const { x, y, w, h } = rect;
  const zoom = Math.max(1, Math.min(4, crop.zoom || 1));
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const cx = Math.max(-1, Math.min(1, crop.cx || 0));
  const cy = Math.max(-1, Math.min(1, crop.cy || 0));
  const dx = x + (w - dw) / 2 + cx * Math.max(0, (dw - w) / 2);
  const dy = y + (h - dh) / 2 + cy * Math.max(0, (dh - h) / 2);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/** The colour grade wash + bottom shade over one panel. */
function gradePanel(ctx, rect, grade) {
  const { x, y, w, h } = rect;
  const tint = GRADE_TINTS[grade];
  if (tint) {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, tint[0]);
    grad.addColorStop(1, tint[1]);
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }
  const shade = ctx.createLinearGradient(x, y + h * 0.55, x, y + h);
  shade.addColorStop(0, 'rgba(10, 4, 20, 0)');
  shade.addColorStop(1, 'rgba(10, 4, 20, 0.45)');
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, w, h);
}

/** An empty panel: dark fill, dashed frame, its number and an invitation. */
function drawEmptyPanel(ctx, rect, index, W) {
  const { x, y, w, h } = rect;
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, '#2c1540');
  grad.addColorStop(1, '#180a26');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.strokeStyle = 'rgba(246, 238, 252, 0.5)';
  ctx.lineWidth = Math.max(1.5, W * 0.0015);
  ctx.setLineDash([W * 0.008, W * 0.006]);
  ctx.strokeRect(x + W * 0.004, y + W * 0.004, w - W * 0.008, h - W * 0.008);
  ctx.restore();
  ctx.fillStyle = 'rgba(246, 238, 252, 0.75)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.max(14, h * 0.11)}px "Bebas Neue", sans-serif`;
  ctx.fillText(`PANEL ${index + 1}`, x + w / 2, y + h / 2 - h * 0.06);
  ctx.font = `${Math.max(11, h * 0.06)}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(246, 238, 252, 0.5)';
  ctx.fillText('add a photo', x + w / 2, y + h / 2 + h * 0.09);
}

/** Largest font size (<= maxSize) whose text fits maxWidth. */
function fitFont(ctx, text, family, maxSize, maxWidth) {
  let size = maxSize;
  ctx.font = `${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(angle) * rad;
    const py = cy + Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// A fixed-seed grain tile, so every render of the same cover looks identical.
let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const size = 160;
  grainTile = document.createElement('canvas');
  grainTile.width = size;
  grainTile.height = size;
  const g = grainTile.getContext('2d');
  const data = g.createImageData(size, size);
  let seed = 20261119;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(next() * 255);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  g.putImageData(data, 0, 0);
  return grainTile;
}

/** Draws the whole cover: panels, grade, title band, badge, stars, grain, vignette. */
export function drawCover(ctx, state, photos, W, H) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#1a0b2e';
  ctx.fillRect(0, 0, W, H);
  const rects = layoutPanels(W, H, state.layout);
  const count = panelCount(state.layout);
  for (let i = 0; i < count; i++) {
    const rect = rects[i];
    const panel = state.panels[i];
    const img = panel && panel.photoId != null ? photos.get(panel.photoId) : null;
    if (img) {
      drawPhotoInPanel(ctx, img, rect, panel);
      gradePanel(ctx, rect, state.grade);
    } else {
      drawEmptyPanel(ctx, rect, i, W);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.lineWidth = Math.max(2, W * 0.003);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }

  // Title band.
  const bandTop = H * 0.74;
  const bandGrad = ctx.createLinearGradient(0, bandTop, 0, H);
  bandGrad.addColorStop(0, '#241040');
  bandGrad.addColorStop(1, '#12061f');
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, bandTop, W, H - bandTop);
  const rule = ctx.createLinearGradient(0, 0, W, 0);
  rule.addColorStop(0, '#ffd319');
  rule.addColorStop(0.5, '#ff2975');
  rule.addColorStop(1, '#7b2ff7');
  ctx.fillStyle = rule;
  ctx.fillRect(0, bandTop, W, Math.max(3, H * 0.006));

  // Subtitle in script, title in gradient Anton, heat stars beneath.
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (subtitle) {
    ctx.fillStyle = SUBTITLE_COLORS[state.grade] || '#ffd319';
    ctx.font = `${Math.max(16, H * 0.032)}px Pacifico, cursive`;
    ctx.fillText(subtitle, W / 2, bandTop + H * 0.055);
  }
  if (title) {
    const maxSize = H * 0.115;
    const size = fitFont(ctx, title, 'Anton, sans-serif', maxSize, W * 0.92);
    const y = bandTop + H * 0.155;
    const grad = ctx.createLinearGradient(W * 0.06, 0, W * 0.94, 0);
    const stops = TITLE_GRADIENTS[state.grade] || TITLE_GRADIENTS.sunset;
    grad.addColorStop(0, stops[0]);
    grad.addColorStop(0.5, stops[1]);
    grad.addColorStop(1, stops[2]);
    ctx.font = `${size}px Anton, sans-serif`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = size * 0.12;
    ctx.shadowOffsetY = size * 0.03;
    ctx.lineWidth = Math.max(2, size * 0.045);
    ctx.strokeStyle = 'rgba(16, 4, 28, 0.9)';
    ctx.strokeText(title, W / 2, y);
    ctx.fillStyle = grad;
    ctx.fillText(title, W / 2, y);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  const heat = Math.max(1, Math.min(5, state.heat || 1));
  const starR = Math.max(6, H * 0.013);
  const starGap = starR * 2.6;
  const starsW = starGap * 4;
  const starY = bandTop + H * 0.225;
  for (let i = 0; i < 5; i++) {
    const cx = W / 2 - starsW / 2 + i * starGap;
    starPath(ctx, cx, starY, starR);
    if (i < heat) {
      ctx.fillStyle = '#ffd319';
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(246, 238, 252, 0.45)';
      ctx.lineWidth = Math.max(1.5, starR * 0.14);
      ctx.stroke();
    }
  }

  // Badge ribbon, top-right corner, fully inside the cover.
  const badge = (state.badge || '').trim().toUpperCase();
  if (badge) {
    const bh = Math.max(18, H * 0.034);
    ctx.font = `${Math.max(11, bh * 0.52)}px "Bebas Neue", sans-serif`;
    const bw = ctx.measureText(badge).width + W * 0.05;
    ctx.save();
    ctx.translate(W - bw / 2 - W * 0.02, bh * 0.85);
    ctx.rotate(-0.08);
    const bg = ctx.createLinearGradient(0, 0, bw, 0);
    bg.addColorStop(0, '#ff2975');
    bg.addColorStop(1, '#ff9a3d');
    ctx.fillStyle = bg;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = bh * 0.3;
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge, 0, 1);
    ctx.restore();
  }

  // Grain, then vignette.
  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(getGrainTile(), 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (state.vignette) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vg.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
}
