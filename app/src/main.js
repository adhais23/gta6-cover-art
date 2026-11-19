// Wires Vice Coast Cover Lab: photo slots, layout + grade pickers, caption editing,
// per-panel crop, undo/redo, PNG export in four post sizes, and ?shot= scenes.

import { drawCoverArt } from './cover.js';
import { runShot } from './shots.js';
import {
  EXPORT_SIZES, GRADES, GRADE_LABELS, LAYOUTS, LAYOUT_LABELS,
  cloneState, freshState, makeHistory, panelCount, panelRects,
} from './state.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const history = makeHistory(freshState());
const photos = [null, null, null, null];
const SAMPLE_NAMES = ['boulevard', 'pier'];

const $ = (id) => document.getElementById(id);

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function state() { return history.current; }

function redraw() {
  drawCoverArt(canvas, state(), photos);
  syncControls();
  $('undo').disabled = !history.canUndo();
  $('redo').disabled = !history.canRedo();
}

function commit(next) {
  history.push(next);
  redraw();
}

function patch(patchObj) {
  const next = cloneState(state());
  Object.assign(next, patchObj);
  commit(next);
}

function patchPanel(patchObj) {
  const next = cloneState(state());
  Object.assign(next.panels[next.selectedPanel], patchObj);
  commit(next);
}

/** Rebuilds the picker buttons and slider values from the current state. */
/** Sets a field's value unless the user is typing in it (keeps the caret where it is). */
function setField(id, value) {
  const el = $(id);
  if (document.activeElement !== el) el.value = value;
}

function syncControls() {
  const s = state();
  document.querySelectorAll('[data-layout]').forEach((b) => {
    b.classList.toggle('picked', b.dataset.layout === s.layout);
    b.setAttribute('aria-pressed', String(b.dataset.layout === s.layout));
  });
  document.querySelectorAll('[data-grade]').forEach((b) => {
    b.classList.toggle('picked', b.dataset.grade === s.grade);
    b.setAttribute('aria-pressed', String(b.dataset.grade === s.grade));
  });
  document.querySelectorAll('[data-size]').forEach((b) => {
    b.classList.toggle('picked', b.dataset.size === s.sizeId);
    b.setAttribute('aria-pressed', String(b.dataset.size === s.sizeId));
  });
  setField('title', s.title);
  setField('subtitle', s.subtitle);
  setField('badge', s.badge);
  setField('hype', String(s.hype));
  $('hypeOut').textContent = `${s.hype} / 5`;
  const panel = s.panels[s.selectedPanel];
  $('panelLabel').textContent = `Panel ${s.selectedPanel + 1} of ${panelCount(s.layout)}`;
  $('panelPhoto').value = String(panel.photo);
  setField('zoom', String(panel.zoom));
  $('zoomOut').textContent = `${Math.round(panel.zoom * 100)}%`;
  setField('panX', String(panel.ox));
  setField('panY', String(panel.oy));
  buildPhotoStrip();
  buildPanelDots();
}

/** Thumbnails of the loaded photos; click one to assign it to the selected panel. */
function buildPhotoStrip() {
  const strip = $('photoStrip');
  strip.replaceChildren();
  photos.forEach((img, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb';
    btn.textContent = img ? `Photo ${i + 1}` : `Empty ${i + 1}`;
    btn.classList.toggle('assigned', state().panels[state().selectedPanel].photo === i);
    btn.disabled = !img;
    btn.addEventListener('click', () => patchPanel({ photo: i }));
    strip.appendChild(btn);
  });
}

/** One dot per panel; click to select the panel to crop. */
function buildPanelDots() {
  const dots = $('panelDots');
  dots.replaceChildren();
  const count = panelCount(state().layout);
  for (let i = 0; i < count; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dot';
    btn.textContent = String(i + 1);
    btn.classList.toggle('picked', i === state().selectedPanel);
    btn.setAttribute('aria-label', `Select panel ${i + 1}`);
    btn.addEventListener('click', () => patch({ selectedPanel: i }));
    dots.appendChild(btn);
  }
}

/** Paints the preview canvas at the chosen export size's aspect. */
function fitPreview() {
  const size = EXPORT_SIZES.find((x) => x.id === state().sizeId) || EXPORT_SIZES[0];
  canvas.width = size.w;
  canvas.height = size.h;
  redraw();
}

/** Exports the current cover as a PNG at the chosen post size. */
function exportPng() {
  const size = EXPORT_SIZES.find((x) => x.id === state().sizeId) || EXPORT_SIZES[0];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCoverArt(off, state(), photos);
  off.toBlob((blob) => {
    if (!blob) { status.textContent = 'Export failed — try again.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-coast-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved vice-coast-${size.w}x${size.h}.png`;
  }, 'image/png');
}

function buildPickers() {
  const layoutBox = $('layoutPicker');
  LAYOUTS.forEach((id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = id;
    b.textContent = LAYOUT_LABELS[id];
    b.addEventListener('click', () => {
      const next = cloneState(state());
      next.layout = id;
      next.selectedPanel = 0;
      commit(next);
    });
    layoutBox.appendChild(b);
  });
  const gradeBox = $('gradePicker');
  GRADES.forEach((id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = id;
    b.textContent = GRADE_LABELS[id];
    b.addEventListener('click', () => patch({ grade: id }));
    gradeBox.appendChild(b);
  });
  const sizeBox = $('sizePicker');
  EXPORT_SIZES.forEach((size) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.size = size.id;
    b.textContent = size.label;
    b.addEventListener('click', () => { patch({ sizeId: size.id }); fitPreview(); });
    sizeBox.appendChild(b);
  });
}

function wireInputs() {
  $('photoFiles').addEventListener('change', async (e) => {
    const files = [...e.target.files].slice(0, 4);
    for (const file of files) {
      const slot = photos.findIndex((p) => p === null);
      if (slot === -1) break;
      try {
        photos[slot] = await loadImage(URL.createObjectURL(file));
      } catch { /* unreadable file: leave the slot empty */ }
    }
    status.textContent = files.length ? `${files.length} photo(s) loaded.` : 'No photo chosen.';
    redraw();
  });
  $('loadSamples').addEventListener('click', async () => {
    for (let i = 0; i < SAMPLE_NAMES.length; i++) {
      try { photos[i] = await loadImage(`samples/${SAMPLE_NAMES[i]}.jpg`); } catch { /* keep slot empty */ }
    }
    status.textContent = 'Sample photos loaded.';
    redraw();
  });
  // Live edits (typing, slider drags) preview at once and commit as ONE undo step:
  // the state before the edit starts is captured on the first input, and the
  // finished state is committed on change. Mutating history.current in place
  // would make undo restore the edited text instead of the text before it.
  let editBase = null;
  const beginEdit = () => { if (!editBase) editBase = cloneState(state()); };
  const endEdit = () => {
    if (editBase) { history.commitFrom(editBase, state()); editBase = null; }
    redraw();
  };
  const liveText = (id, apply) => {
    $(id).addEventListener('input', (e) => { beginEdit(); apply(e.target.value); redraw(); });
    $(id).addEventListener('change', endEdit);
  };
  liveText('title', (v) => { state().title = v; });
  liveText('subtitle', (v) => { state().subtitle = v; });
  liveText('badge', (v) => { state().badge = v; });
  liveText('hype', (v) => { state().hype = Number(v); });
  $('panelPhoto').addEventListener('change', (e) => patchPanel({ photo: Number(e.target.value) }));
  const liveCrop = (id, apply) => {
    $(id).addEventListener('input', (e) => {
      beginEdit();
      const next = cloneState(state());
      apply(next.panels[next.selectedPanel], Number(e.target.value));
      history.replace(next);
      redraw();
    });
    $(id).addEventListener('change', endEdit);
  };
  liveCrop('zoom', (panel, v) => { panel.zoom = v; });
  liveCrop('panX', (panel, v) => { panel.ox = v; });
  liveCrop('panY', (panel, v) => { panel.oy = v; });
  $('undo').addEventListener('click', () => { if (history.undo()) redraw(); });
  $('redo').addEventListener('click', () => { if (history.redo()) redraw(); });
  $('export').addEventListener('click', exportPng);
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) { if (history.redo()) redraw(); }
      else if (history.undo()) redraw();
    }
  });
  canvas.addEventListener('click', (e) => {
    const box = canvas.getBoundingClientRect();
    const fx = (e.clientX - box.left) / box.width;
    const fy = (e.clientY - box.top) / box.height;
    const rects = panelRects(state().layout);
    const hit = rects.findIndex((r) => fx >= r.x && fx < r.x + r.w && fy >= r.y && fy < r.y + r.h);
    if (hit >= 0) patch({ selectedPanel: hit });
  });
}

buildPickers();
wireInputs();
fitPreview();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), async (scene) => {
    const next = cloneState(state());
    next.title = scene.title;
    next.layout = scene.layout;
    next.grade = scene.grade;
    next.sizeId = scene.sizeId;
    history.push(next);
    for (let i = 0; i < SAMPLE_NAMES.length; i++) {
      try { photos[i] = await loadImage(`samples/${SAMPLE_NAMES[i]}.jpg`); } catch { /* keep slot empty */ }
    }
    const shotSize = scene.sizeId === 'portrait'
      ? { w: 1024, h: 1280 }
      : scene.sizeId === 'wide'
        ? { w: 1280, h: 720 }
        : { w: 1080, h: 1080 };
    canvas.width = shotSize.w;
    canvas.height = shotSize.h;
    redraw();
  });
} else {
  redraw();
}
