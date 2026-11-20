// Wires Neon Coast Cover Studio: photo uploads, panel picking and drag/zoom,
// layout and grade buttons, caption editing, and PNG export at post sizes.
// A `?shot=` query sets up a fixed scene for a screenshot instead (shots.js).
import { drawCover, panelRectsPx, LAYOUTS } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const photoTray = document.getElementById('photoTray');
const panelBar = document.getElementById('panelBar');

/** The whole cover state; drawCover reads only this object. */
export const state = {
  layout: 'hero',
  grade: 'sunset',
  size: '1080x1080',
  title: 'NEON COAST',
  subtitle: 'sunset heist on the palm boulevard',
  photos: [],
  photoNames: [],
  panelPhotos: [-1, -1, -1, -1],
  panelViews: [{}, {}, {}, {}],
  selectedPanel: 0,
};

let fontsReady = false;

function panelCount() {
  return LAYOUTS[state.layout].length;
}

function redraw() {
  drawCover(canvas, state);
}

/** Applies the chosen export size to the canvas, then redraws at full size. */
export function applySize() {
  const [w, h] = state.size.split('x').map(Number);
  canvas.width = w;
  canvas.height = h;
  canvas.style.aspectRatio = `${w} / ${h}`;
  redraw();
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Rebuilds the photo tray thumbnails and the per-panel buttons. */
export function renderTray() {
  photoTray.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const thumb = document.createElement('img');
    thumb.src = photo.src;
    thumb.alt = state.photoNames[i] || `Photo ${i + 1}`;
    thumb.title = 'Click, then click a panel below to put this photo there';
    thumb.addEventListener('click', () => {
      state.panelPhotos[state.selectedPanel] = i;
      state.panelViews[state.selectedPanel] = { zoom: 1, ox: 0, oy: 0 };
      renderTray();
      redraw();
    });
    photoTray.appendChild(thumb);
  });
  panelBar.innerHTML = '';
  for (let i = 0; i < panelCount(); i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    const filled = state.panelPhotos[i] >= 0;
    btn.textContent = filled ? `Panel ${i + 1}: photo ${state.panelPhotos[i] + 1}` : `Panel ${i + 1}: empty`;
    btn.classList.toggle('picked', state.selectedPanel === i);
    btn.classList.toggle('empty', !filled);
    btn.addEventListener('click', () => {
      state.selectedPanel = i;
      renderTray();
    });
    panelBar.appendChild(btn);
  }
}

/** Adds loaded images to the library and fills empty panels with them. */
export function addPhotos(images, names) {
  images.forEach((img, k) => {
    state.photos.push(img);
    state.photoNames.push(names[k] || `Photo ${state.photos.length}`);
    const empty = state.panelPhotos.findIndex((p) => p < 0);
    if (empty >= 0) state.panelPhotos[empty] = state.photos.length - 1;
  });
  renderTray();
  redraw();
}

document.getElementById('photos').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  const loaded = [];
  for (const file of files) {
    loaded.push(await loadImage(URL.createObjectURL(file)));
  }
  addPhotos(loaded, files.map((f) => f.name));
  status.textContent = `${files.length} photo${files.length > 1 ? 's' : ''} loaded — click a panel, drag to move, scroll to zoom.`;
});

document.getElementById('useSamples').addEventListener('click', async () => {
  const boulevard = await loadImage('samples/boulevard.jpg');
  const neon = await loadImage('samples/neon.jpg');
  addPhotos([boulevard, neon], ['Boulevard sunset', 'Neon street']);
  status.textContent = 'Sample photos loaded.';
});

document.getElementById('fillAll').addEventListener('click', () => {
  if (!state.photos.length) {
    status.textContent = 'Add a photo first.';
    return;
  }
  const first = state.panelPhotos.find((p) => p >= 0);
  const pick = first >= 0 ? first : 0;
  for (let i = 0; i < panelCount(); i++) {
    state.panelPhotos[i] = pick;
    state.panelViews[i] = { zoom: 1, ox: 0, oy: 0 };
  }
  renderTray();
  redraw();
  status.textContent = 'Every panel now shows the same photo.';
});

function bindChoice(rowId, key, after) {
  document.getElementById(rowId).addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-' + key + ']');
    if (!btn) return;
    state[key] = btn.dataset[key];
    document.querySelectorAll(`#${rowId} button`).forEach((b) => b.classList.toggle('picked', b === btn));
    after();
  });
}

bindChoice('layoutRow', 'layout', () => {
  state.panelPhotos = state.panelPhotos.slice(0, panelCount());
  while (state.panelPhotos.length < panelCount()) state.panelPhotos.push(-1);
  state.selectedPanel = 0;
  renderTray();
  redraw();
});
bindChoice('gradeRow', 'grade', redraw);
bindChoice('sizeRow', 'size', applySize);

titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });

document.getElementById('export').addEventListener('click', () => {
  redraw();
  canvas.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed — try again.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-cover-${state.size}.png`;
    a.click();
    status.textContent = `Saved neon-coast-cover-${state.size}.png`;
  }, 'image/png');
});

/** Drag pans the selected panel's photo; wheel zooms it; click picks a panel. */
let dragging = null;
function canvasPoint(e) {
  const box = canvas.getBoundingClientRect();
  return [
    ((e.clientX - box.left) / box.width) * canvas.width,
    ((e.clientY - box.top) / box.height) * canvas.height,
  ];
}
canvas.addEventListener('pointerdown', (e) => {
  const [px, py] = canvasPoint(e);
  const rects = panelRectsPx(canvas, state.layout);
  const hit = rects.findIndex(([x, y, w, h]) => px >= x && px <= x + w && py >= y && py <= y + h);
  if (hit < 0) return;
  state.selectedPanel = hit;
  renderTray();
  const view = state.panelViews[hit] || { zoom: 1, ox: 0, oy: 0 };
  dragging = { panel: hit, x: px, y: py, ox: view.ox || 0, oy: view.oy || 0 };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const [px, py] = canvasPoint(e);
  const rect = panelRectsPx(canvas, state.layout)[dragging.panel];
  const view = state.panelViews[dragging.panel];
  view.ox = dragging.ox + (px - dragging.x) / rect[2];
  view.oy = dragging.oy + (py - dragging.y) / rect[3];
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const view = state.panelViews[state.selectedPanel];
  view.zoom = Math.min(4, Math.max(1, (view.zoom || 1) * (e.deltaY < 0 ? 1.1 : 0.9)));
  redraw();
}, { passive: false });

/** Waits for the vendored fonts, then paints the first cover. */
export function paintWhenFontsReady() {
  const done = () => { fontsReady = true; redraw(); };
  if (document.fonts && document.fonts.ready) {
    Promise.all([
      document.fonts.load('100px "Archivo Black"'),
      document.fonts.load('40px "Pacifico"'),
    ]).then(done).catch(done);
    document.fonts.ready.then(() => { if (!fontsReady) done(); });
  } else {
    done();
  }
}

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), state, { loadImage, addPhotos, applySize, renderTray });
} else {
  applySize();
  renderTray();
  paintWhenFontsReady();
}
