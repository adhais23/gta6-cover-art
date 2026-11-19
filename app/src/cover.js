// Draws the cover art: photo panels, a gradient-map grade, grain + vignette,
// and the title block (badge ribbon, Anton display title, Pacifico subtitle, hype stars).
// Everything draws on one canvas at whatever size the caller sets — the live preview,
// a screenshot scene, or an export at a post size.

import { panelRects } from './state.js';

const GRADE_WASH = {
  sunset: { top: '#ff7a3d', bottom: '#c2187a', glow: 'rgba(255, 122, 61, 0.28)' },
  neon: { top: '#22e6ff', bottom: '#ff2fb3', glow: 'rgba(34, 230, 255, 0.30)' },
  vice: { top: '#ffb03d', bottom: '#7a2bff', glow: 'rgba(255, 176, 61, 0.26)' },
  midnight: { top: '#5f7cff', bottom: '#12082e', glow: 'rgba(95, 124, 255, 0.26)' },
};

let grainTile = null;

/** A small tiled noise canvas, reused for the grain pass. */
function grainCanvas() {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 160;
  tile.height = 160;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  grainTile = tile;
  return tile;
}

/** Draws one photo into a panel rect, honouring its zoom and pan offsets. */
function paintPanel(ctx, photo, panel, rect) {
  if (!photo) {
    const fade = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    fade.addColorStop(0, '#3a2340');
    fade.addColorStop(1, '#191024');
    ctx.fillStyle = fade;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    return;
  }
  const iw = photo.naturalWidth;
  const ih = photo.naturalHeight;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const scale = base * (panel.zoom || 1);
  const pw = iw * scale;
  const ph = ih * scale;
  const cx = rect.x + rect.w / 2 + (panel.ox || 0) * rect.w;
  const cy = rect.y + rect.h / 2 + (panel.oy || 0) * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(photo, cx - pw / 2, cy - ph / 2, pw, ph);
  ctx.restore();
}

/** Fits display type to a width, shrinking until it fits or hits the floor. */
function fitFont(ctx, text, family, start, maxWidth, weight) {
  let size = start;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 14 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/** The title block: badge ribbon, big title, script subtitle, hype stars. */
function paintTitleBlock(ctx, state, W, H) {
  const grade = GRADE_WASH[state.grade] || GRADE_WASH.sunset;
  const bandH = H * 0.26;
  const bandY = H - bandH;
  const band = ctx.createLinearGradient(0, bandY, 0, H);
  band.addColorStop(0, 'rgba(12, 4, 24, 0)');
  band.addColorStop(0.45, 'rgba(12, 4, 24, 0.72)');
  band.addColorStop(1, 'rgba(12, 4, 24, 0.92)');
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, W, bandH);

  const pad = W * 0.045;
  let y = bandY + bandH * 0.30;

  // Badge ribbon.
  const badge = (state.badge || '').trim().toUpperCase();
  if (badge) {
    ctx.font = `400 ${Math.max(14, H * 0.018)}px "Bebas Neue", sans-serif`;
    const bw = ctx.measureText(badge).width + pad * 0.9;
    const bh = H * 0.038;
    ctx.fillStyle = grade.top;
    ctx.fillRect(pad, y - bh * 0.72, bw, bh);
    ctx.fillStyle = '#14061f';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge, pad + pad * 0.45, y - bh * 0.22);
    y += bh * 1.15;
  }

  // Display title in Anton, white with a hard offset shadow.
  const title = (state.title || '').trim().toUpperCase();
  if (title) {
    const size = fitFont(ctx, title, '"Anton", sans-serif', H * 0.105, W - pad * 2, 400);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ff2fb3';
    ctx.fillText(title, pad + size * 0.035, y + size * 0.98);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, pad, y + size * 0.95);
    y += size * 1.12;
  }

  // Script subtitle in Pacifico.
  const sub = (state.subtitle || '').trim();
  if (sub) {
    const size = fitFont(ctx, sub, '"Pacifico", cursive', H * 0.032, W - pad * 2, 400);
    ctx.fillStyle = '#ffd9ec';
    ctx.textAlign = 'left';
    ctx.fillText(sub, pad, y + size * 0.4);
    y += size * 1.5;
  }

  // Hype stars, top right of the band.
  const stars = '★'.repeat(Math.max(0, Math.min(5, state.hype || 0)));
  if (stars) {
    ctx.font = `${Math.max(16, H * 0.026)}px sans-serif`;
    ctx.fillStyle = '#ffc93d';
    ctx.textAlign = 'right';
    ctx.fillText(stars, W - pad, bandY + bandH * 0.24);
  }
}

/**
 * Draws the whole cover onto `canvas` at its own pixel size.
 * `photos` is an array of loaded images (or nulls); `state` is a cover state object.
 */
export function drawCoverArt(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const gap = Math.max(2, Math.round(W * 0.006));
  const grade = GRADE_WASH[state.grade] || GRADE_WASH.sunset;

  ctx.fillStyle = '#14061f';
  ctx.fillRect(0, 0, W, H);

  const rects = panelRects(state.layout);
  rects.forEach((cell, i) => {
    const panel = state.panels[i] || { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const rect = {
      x: cell.x * W + (cell.x > 0 ? gap / 2 : 0),
      y: cell.y * H + (cell.y > 0 ? gap / 2 : 0),
      w: cell.w * W - (cell.x > 0 ? gap / 2 : 0) - (cell.x + cell.w < 1 ? gap / 2 : 0),
      h: cell.h * H - (cell.y > 0 ? gap / 2 : 0) - (cell.y + cell.h < 1 ? gap / 2 : 0),
    };
    paintPanel(ctx, photos[panel.photo] || null, panel, rect);
  });

  // Gradient-map grade wash over the panels.
  const wash = ctx.createLinearGradient(0, 0, W * 0.25, H);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(1, grade.bottom);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  // Warm glow from the top corner.
  const glow = ctx.createRadialGradient(W * 0.85, 0, 0, W * 0.85, 0, W * 0.7);
  glow.addColorStop(0, grade.glow);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  paintTitleBlock(ctx, state, W, H);

  // Film grain.
  const tile = grainCanvas();
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  // Vignette.
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(8, 2, 16, 0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}
