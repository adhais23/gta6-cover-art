// Wires the Vice Coast Cover Lab editor: photos, layout, grade, words, effects, panel
// dragging and zooming, undo/redo, and PNG export. A `?shot=` query runs a fixed scene
// for a screenshot instead (./shots.js).
import { drawCover, layoutPanels, panelAt } from './cover.js';
import { createState, panelCount, snapshot, History, SIZES } from './state.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const state = createState();
const history = new History(state);
/** Loaded photos: id -> HTMLImageElement. */
const photos = new Map();
let nextPhotoId = 1;

const $ = (id) => document.getElementById(id);
const titleInput = $('title');
const subtitleInput = $('subtitle');
const badgeInput = $('badge');
const heatInput = $('heat');
const heatStars = $('heatStars');
const statusEl = $('status');

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function addPhoto(img, name) {
  const id = nextPhotoId++;
  photos.set(id, img);
  state.selectedPhotoId = id;
  renderTray();
  return id;
}

function renderTray() {
  const tray = $('photoTray');
  tray.innerHTML = '';
  for (const [id, img] of photos) {
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.alt = `Photo ${id}`;
    thumb.title = `Photo ${id} — click to put in the selected panel`;
    if (id === state.selectedPhotoId) thumb.classList.add('selected');
    thumb.addEventListener('click', () => {
      state.selectedPhotoId = id;
      assignPhotoToPanel(id, state.selectedPanel);
      renderTray();
      render();
    });
    tray.appendChild(thumb);
  }
}

function renderPanelStrip() {
  const strip = $('panelStrip');
  strip.innerHTML = '';
  const count = panelCount(state.layout);
  for (let i = 0; i < count; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    const panel = state.panels[i];
    b.textContent = panel.photoId != null ? `Panel ${i + 1} · photo ${panel.photoId}` : `Panel ${i + 1} · empty`;
    if (i === state.selectedPanel) b.classList.add('active');
    b.addEventListener('click', () => {
      state.selectedPanel = i;
      renderPanelStrip();
      render();
    });
    strip.appendChild(b);
  }
}

function render() {
  const [w, h] = SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(ctx, state, photos, w, h);
  $('undo').disabled = !history.canUndo;
  $('redo').disabled = !history.canRedo;
}

function assignPhotoToPanel(photoId, panelIndex) {
  const panel = state.panels[panelIndex];
  if (!panel || panel.photoId === photoId) return;
  history.push();
  panel.photoId = photoId;
  panel.cx = 0;
  panel.cy = 0;
  panel.zoom = 1;
  renderPanelStrip();
}

function syncChoiceGroup(el, value) {
  for (const b of el.querySelectorAll('button[data-layout], button[data-grade], button[data-size]')) {
    b.classList.toggle('active', b.dataset.layout === value || b.dataset.grade === value || b.dataset.size === value);
  }
}

function syncInputs() {
  titleInput.value = state.title;
  subtitleInput.value = state.subtitle;
  badgeInput.value = state.badge;
  heatInput.value = String(state.heat);
  heatStars.textContent = '★'.repeat(state.heat) + '☆'.repeat(5 - state.heat);
  $('grain').checked = state.grain;
  $('vignette').checked = state.vignette;
  syncChoiceGroup($('layoutChoices'), state.layout);
  syncChoiceGroup($('gradeChoices'), state.grade);
  syncChoiceGroup($('sizeChoices'), state.size);
  renderPanelStrip();
  renderTray();
}

// --- Choice groups: layout, grade, export size --------------------------------
$('layoutChoices').addEventListener('click', (e) => {
  const layout = e.target.closest('button')?.dataset.layout;
  if (!layout || layout === state.layout) return;
  history.push();
  state.layout = layout;
  state.selectedPanel = 0;
  syncChoiceGroup($('layoutChoices'), layout);
  renderPanelStrip();
  render();
});
$('gradeChoices').addEventListener('click', (e) => {
  const grade = e.target.closest('button')?.dataset.grade;
  if (!grade || grade === state.grade) return;
  history.push();
  state.grade = grade;
  syncChoiceGroup($('gradeChoices'), grade);
  render();
});
$('sizeChoices').addEventListener('click', (e) => {
  const size = e.target.closest('button')?.dataset.size;
  if (!size || size === state.size) return;
  history.push();
  state.size = size;
  syncChoiceGroup($('sizeChoices'), size);
  render();
});

// --- Words ----------------------------------------------------------------------
// Text edits push ONE history entry per editing session: on the first keystroke after
// focus, before the state changes — pushing on 'change' would snapshot the new text
// and undo would restore it instead of the old text.
function bindText(input, key) {
  let armed = true;
  input.addEventListener('focus', () => { armed = true; });
  input.addEventListener('input', () => {
    if (armed) { history.push(); armed = false; }
    state[key] = input.value;
    render();
  });
  input.addEventListener('blur', () => { armed = true; });
}
bindText(titleInput, 'title');
bindText(subtitleInput, 'subtitle');
bindText(badgeInput, 'badge');
let heatArmed = true;
heatInput.addEventListener('input', () => {
  if (heatArmed) { history.push(); heatArmed = false; }
  state.heat = Number(heatInput.value);
  heatStars.textContent = '★'.repeat(state.heat) + '☆'.repeat(5 - state.heat);
  render();
});
heatInput.addEventListener('change', () => { heatArmed = true; });
$('grain').addEventListener('change', (e) => { history.push(); state.grain = e.target.checked; render(); });
$('vignette').addEventListener('change', (e) => { history.push(); state.vignette = e.target.checked; render(); });

// --- Photos ---------------------------------------------------------------------
$('photoInput').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  for (const file of files) {
    const img = await loadImage(URL.createObjectURL(file));
    const id = addPhoto(img, file.name);
    if (state.panels[state.selectedPanel].photoId == null) assignPhotoToPanel(id, state.selectedPanel);
  }
  render();
  e.target.value = '';
});
async function loadSample(name) {
  const img = await loadImage(`samples/${name}.jpg`);
  const id = addPhoto(img, name);
  if (state.panels[state.selectedPanel].photoId == null) assignPhotoToPanel(id, state.selectedPanel);
  render();
  return id;
}
$('sampleBoulevard').addEventListener('click', () => loadSample('boulevard'));
$('samplePier').addEventListener('click', () => loadSample('pier'));
$('fillAll').addEventListener('click', () => {
  const id = state.selectedPhotoId;
  if (id == null) {
    statusEl.textContent = 'Load or pick a photo first.';
    return;
  }
  history.push();
  const count = panelCount(state.layout);
  for (let i = 0; i < count; i++) {
    const p = state.panels[i];
    p.photoId = id;
    p.cx = 0;
    p.cy = 0;
    p.zoom = 1;
  }
  renderPanelStrip();
  render();
  statusEl.textContent = 'All panels filled with the selected photo.';
});

// --- Panel crop: drag to pan, scroll to zoom -------------------------------------
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function drawSize(img, rect, zoom) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  return { dw: img.naturalWidth * scale, dh: img.naturalHeight * scale };
}

let drag = null;
let wheelBurst = false;
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const index = panelAt(canvas.width, canvas.height, state.layout, p.x, p.y);
  if (index === -1) return;
  canvas.setPointerCapture(e.pointerId);
  history.push();
  state.selectedPanel = index;
  renderPanelStrip();
  const rects = layoutPanels(canvas.width, canvas.height, state.layout);
  drag = { index, lastX: p.x, lastY: p.y, rect: rects[index] };
  render();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const panel = state.panels[drag.index];
  const img = photos.get(panel.photoId);
  if (!img) { drag = null; return; }
  const { dw, dh } = drawSize(img, drag.rect, panel.zoom);
  const rx = Math.max(0, (dw - drag.rect.w) / 2);
  const ry = Math.max(0, (dh - drag.rect.h) / 2);
  if (rx > 0) panel.cx = Math.max(-1, Math.min(1, panel.cx + (p.x - drag.lastX) / rx));
  if (ry > 0) panel.cy = Math.max(-1, Math.min(1, panel.cy + (p.y - drag.lastY) / ry));
  drag.lastX = p.x;
  drag.lastY = p.y;
  render();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = canvasPoint(e);
  const index = panelAt(canvas.width, canvas.height, state.layout, p.x, p.y);
  if (index === -1) return;
  if (!wheelBurst) {
    history.push();
    wheelBurst = true;
    setTimeout(() => { wheelBurst = false; }, 400);
  }
  const panel = state.panels[index];
  panel.zoom = Math.max(1, Math.min(4, panel.zoom * Math.exp(-e.deltaY * 0.0012)));
  state.selectedPanel = index;
  renderPanelStrip();
  render();
}, { passive: false });

$('zoomIn').addEventListener('click', () => {
  history.push();
  const p = state.panels[state.selectedPanel];
  p.zoom = Math.max(1, Math.min(4, p.zoom * 1.25));
  render();
});
$('zoomOut').addEventListener('click', () => {
  history.push();
  const p = state.panels[state.selectedPanel];
  p.zoom = Math.max(1, Math.min(4, p.zoom / 1.25));
  render();
});
$('fitPanel').addEventListener('click', () => {
  history.push();
  const p = state.panels[state.selectedPanel];
  p.cx = 0;
  p.cy = 0;
  p.zoom = 1;
  render();
});

// --- Undo / redo ------------------------------------------------------------------
function doUndo() { if (history.undo()) { syncInputs(); render(); } }
function doRedo() { if (history.redo()) { syncInputs(); render(); } }
$('undo').addEventListener('click', doUndo);
$('redo').addEventListener('click', doRedo);
document.addEventListener('keydown', (e) => {
  // Inside a text field, Ctrl+Z stays the field's own undo.
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) doRedo();
    else doUndo();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    doRedo();
  }
});

// --- Export -----------------------------------------------------------------------
/** Renders the cover at W x H and returns a PNG data URL. */
export async function exportCover(w, h) {
  await document.fonts.ready;
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off.getContext('2d'), state, photos, w, h);
  return off.toDataURL('image/png');
}

$('export').addEventListener('click', async () => {
  const [w, h] = SIZES[state.size];
  const url = await exportCover(w, h);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vice-coast-${w}x${h}.png`;
  a.click();
  statusEl.textContent = `Saved vice-coast-${w}x${h}.png`;
});

// Handles for screenshots and tests.
window.__viceCoast = { state, photos, render, exportCover, loadSample, snapshot };

// --- Boot: a ?shot= scene, or the plain editor ------------------------------------
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, {
    state, photos, render, loadImage, loadSample,
    canvas, syncInputs,
    setSize: (w, h) => { canvas.width = w; canvas.height = h; },
  });
} else {
  document.fonts.ready.then(render);
  render();
}
