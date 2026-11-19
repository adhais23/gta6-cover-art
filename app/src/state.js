// The cover's editable state: layout, grade, words, effects, and one crop per panel.
// Photos live outside the snapshots (images are not serialisable); snapshots keep the
// photo ids, and the photos themselves persist across undo and redo.

export const LAYOUTS = ['grid4', 'hero3', 'fullbleed', 'nine'];
export const GRADES = ['sunset', 'neon', 'vice', 'original'];
export const SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  wide: [1920, 1080],
  story: [1080, 1920],
};

/** How many panels a layout shows. */
export function panelCount(layout) {
  return layout === 'fullbleed' ? 1 : layout === 'nine' ? 9 : 4;
}

/** A fresh panel: no photo yet, centred, no zoom. */
export function blankPanel() {
  return { photoId: null, cx: 0, cy: 0, zoom: 1 };
}

/** The default cover: four-panel grid, sunset grade, Vice Coast words. */
export function createState() {
  return {
    layout: 'grid4',
    grade: 'sunset',
    title: 'SUNSET HEIST',
    subtitle: 'Vice Coast nights',
    badge: 'VICE COAST',
    heat: 4,
    grain: true,
    vignette: true,
    size: 'square',
    selectedPanel: 0,
    selectedPhotoId: null,
    panels: Array.from({ length: 9 }, blankPanel),
  };
}

/** A JSON-safe copy of everything undo/redo needs (photos excluded). */
export function snapshot(state) {
  return JSON.parse(JSON.stringify({
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    badge: state.badge,
    heat: state.heat,
    grain: state.grain,
    vignette: state.vignette,
    size: state.size,
    selectedPanel: state.selectedPanel,
    panels: state.panels,
  }));
}

/** Restores a snapshot taken by `snapshot` into `state` in place. */
export function restore(state, snap) {
  state.layout = snap.layout;
  state.grade = snap.grade;
  state.title = snap.title;
  state.subtitle = snap.subtitle;
  state.badge = snap.badge;
  state.heat = snap.heat;
  state.grain = snap.grain;
  state.vignette = snap.vignette;
  state.size = snap.size;
  state.selectedPanel = snap.selectedPanel;
  state.panels = snap.panels.map((p) => ({ ...p }));
}

/** Undo/redo over snapshots: push before a change, undo/redo around it. */
export class History {
  constructor(state) {
    this.state = state;
    this.past = [];
    this.future = [];
  }

  push() {
    this.past.push(snapshot(this.state));
    if (this.past.length > 60) this.past.shift();
    this.future.length = 0;
  }

  undo() {
    if (!this.past.length) return false;
    this.future.push(snapshot(this.state));
    restore(this.state, this.past.pop());
    return true;
  }

  redo() {
    if (!this.future.length) return false;
    this.past.push(snapshot(this.state));
    restore(this.state, this.future.pop());
    return true;
  }

  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
}
