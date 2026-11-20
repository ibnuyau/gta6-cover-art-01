// Neon Coast cover engine: draws a multi-panel poster cover onto a canvas.
// A cover is a layout of photo panels (each with its own photo, zoom and
// pan), a sunset/neon colour grade, a bold title and a script subtitle,
// finished with grain and a vignette. Everything is drawn with the 2D
// canvas API; no image ever leaves the machine.

/** Panel rectangles for each layout, in fractions of the cover (x, y, w, h). */
export const LAYOUTS = {
  hero: [
    [0, 0, 1, 0.6],
    [0, 0.6, 1 / 3, 0.4],
    [1 / 3, 0.6, 1 / 3, 0.4],
    [2 / 3, 0.6, 1 / 3, 0.4],
  ],
  grid: [
    [0, 0, 0.5, 0.5],
    [0.5, 0, 0.5, 0.5],
    [0, 0.5, 0.5, 0.5],
    [0.5, 0.5, 0.5, 0.5],
  ],
  strip: [
    [0, 0, 1 / 3, 1],
    [1 / 3, 0, 1 / 3, 1],
    [2 / 3, 0, 1 / 3, 1],
  ],
  full: [[0, 0, 1, 1]],
};

/** Colour grades: top and bottom wash colours plus the title gradient. */
export const GRADES = {
  sunset: { washTop: 'rgba(255, 140, 66, 0.16)', washBottom: 'rgba(214, 51, 132, 0.34)', title: ['#ffe66d', '#ff7b54', '#ff2e88'], glow: '#ff2e88' },
  neon: { washTop: 'rgba(0, 229, 255, 0.14)', washBottom: 'rgba(255, 45, 149, 0.36)', title: ['#a5f3fc', '#22d3ee', '#ff2e88'], glow: '#22d3ee' },
  teal: { washTop: 'rgba(45, 212, 191, 0.16)', washBottom: 'rgba(8, 47, 73, 0.42)', title: ['#fef08a', '#5eead4', '#0ea5e9'], glow: '#5eead4' },
  magenta: { washTop: 'rgba(255, 0, 110, 0.18)', washBottom: 'rgba(58, 12, 163, 0.4)', title: ['#ffd166', '#ef476f', '#7b2cbf'], glow: '#ef476f' },
};

const GUTTER = 0.008; // white gap between panels, as a fraction of cover width
const TITLE_BAND = 0.24; // fraction of cover height the title band covers

let grainTile = null;

/** Builds a small random-noise tile once, reused for the grain finish. */
export function makeGrainTile() {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 128;
  tile.height = 128;
  const tctx = tile.getContext('2d');
  const data = tctx.createImageData(128, 128);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 118 + Math.floor(Math.random() * 40);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  tctx.putImageData(data, 0, 0);
  grainTile = tile;
  return tile;
}

/** Draws one photo into a panel rect, cover-fit, with the panel's zoom/pan. */
export function drawPanelPhoto(ctx, photo, rect, view) {
  const [x, y, w, h] = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (photo) {
    const base = Math.max(w / photo.naturalWidth, h / photo.naturalHeight);
    const scale = base * (view.zoom || 1);
    const pw = photo.naturalWidth * scale;
    const ph = photo.naturalHeight * scale;
    const cx = x + w / 2 + (view.ox || 0) * w;
    const cy = y + h / 2 + (view.oy || 0) * h;
    ctx.drawImage(photo, cx - pw / 2, cy - ph / 2, pw, ph);
  } else {
    const shade = ctx.createLinearGradient(x, y, x + w, y + h);
    shade.addColorStop(0, '#3b2350');
    shade.addColorStop(1, '#1d1030');
    ctx.fillStyle = shade;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `${Math.round(h * 0.09)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('add a photo', x + w / 2, y + h / 2);
  }
  ctx.restore();
}

/** Washes the whole cover in the grade's sunset/neon colours. */
export function applyGrade(ctx, w, h, grade) {
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, grade.washTop);
  wash.addColorStop(1, grade.washBottom);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'overlay';
  const glow = ctx.createLinearGradient(0, h * 0.45, 0, h);
  glow.addColorStop(0, 'rgba(255, 255, 255, 0)');
  glow.addColorStop(1, 'rgba(255, 120, 60, 0.22)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

/** Draws the bold title and script subtitle across the foot of the cover. */
export function drawTitleBlock(ctx, w, h, title, subtitle, grade) {
  const bandH = h * TITLE_BAND;
  const bandY = h - bandH;
  const shade = ctx.createLinearGradient(0, bandY - h * 0.05, 0, h);
  shade.addColorStop(0, 'rgba(10, 4, 18, 0)');
  shade.addColorStop(0.35, 'rgba(10, 4, 18, 0.72)');
  shade.addColorStop(1, 'rgba(10, 4, 18, 0.88)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, bandY - h * 0.05, w, bandH + h * 0.05);

  const words = (title || 'NEON COAST').trim().toUpperCase();
  let size = h * 0.115;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fit = () => {
    ctx.font = `${size}px "Archivo Black", sans-serif`;
    return ctx.measureText(words).width <= w * 0.92;
  };
  while (!fit() && size > 20) size -= 4;
  const titleY = bandY + bandH * 0.42;
  const fill = ctx.createLinearGradient(0, titleY - size / 2, 0, titleY + size / 2);
  grade.title.forEach((colour, i) => fill.addColorStop(i / (grade.title.length - 1), colour));
  ctx.lineWidth = Math.max(3, size * 0.07);
  ctx.strokeStyle = 'rgba(12, 4, 20, 0.9)';
  ctx.lineJoin = 'round';
  ctx.shadowColor = grade.glow;
  ctx.shadowBlur = size * 0.35;
  ctx.strokeText(words, w / 2, titleY);
  ctx.fillStyle = fill;
  ctx.fillText(words, w / 2, titleY);
  ctx.shadowBlur = 0;

  const sub = (subtitle || '').trim();
  if (sub) {
    const subSize = Math.max(18, h * 0.038);
    ctx.font = `${subSize}px "Pacifico", cursive`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = grade.glow;
    ctx.shadowBlur = subSize * 0.6;
    ctx.fillText(sub, w / 2, bandY + bandH * 0.82);
    ctx.shadowBlur = 0;
  }
}

/** Speckles grain over the cover and darkens its corners. */
export function finishCover(ctx, w, h) {
  const tile = makeGrainTile();
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Draws the whole cover.
 * state: { layout, grade, title, subtitle, photos, panelPhotos, panelViews }
 * photos: array of loaded images; panelPhotos: photo index per panel (-1 = empty);
 * panelViews: { zoom, ox, oy } per panel.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const rects = LAYOUTS[state.layout] || LAYOUTS.hero;
  const gap = Math.round(w * GUTTER);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  rects.forEach((frac, i) => {
    const rect = [
      Math.round(frac[0] * w) + (frac[0] > 0 ? gap / 2 : 0),
      Math.round(frac[1] * h) + (frac[1] > 0 ? gap / 2 : 0),
      Math.round(frac[2] * w) - (frac[0] > 0 ? gap / 2 : 0) - (frac[0] + frac[2] < 1 ? gap / 2 : 0),
      Math.round(frac[3] * h) - (frac[1] > 0 ? gap / 2 : 0) - (frac[1] + frac[3] < 1 ? gap / 2 : 0),
    ];
    const photoIndex = state.panelPhotos[i];
    const photo = photoIndex >= 0 ? state.photos[photoIndex] : null;
    drawPanelPhoto(ctx, photo, rect, state.panelViews[i] || { zoom: 1, ox: 0, oy: 0 });
  });
  applyGrade(ctx, w, h, grade);
  drawTitleBlock(ctx, w, h, state.title, state.subtitle, grade);
  finishCover(ctx, w, h);
}

/** Returns the panel rectangles in cover pixels (for hit-testing clicks). */
export function panelRectsPx(canvas, layout) {
  const w = canvas.width;
  const h = canvas.height;
  const gap = Math.round(w * GUTTER);
  return (LAYOUTS[layout] || LAYOUTS.hero).map((frac) => [
    Math.round(frac[0] * w) + (frac[0] > 0 ? gap / 2 : 0),
    Math.round(frac[1] * h) + (frac[1] > 0 ? gap / 2 : 0),
    Math.round(frac[2] * w) - (frac[0] > 0 ? gap / 2 : 0) - (frac[0] + frac[2] < 1 ? gap / 2 : 0),
    Math.round(frac[3] * h) - (frac[1] > 0 ? gap / 2 : 0) - (frac[1] + frac[3] < 1 ? gap / 2 : 0),
  ]);
}
