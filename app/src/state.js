// Cover state for Vice Coast Cover Lab: one plain object, plus undo/redo history.
// A panel points at a photo by index and carries its own crop (zoom + pan offsets).
// The title block, grade and layout are all part of the state so every change is undoable.

export const LAYOUTS = ['grid4', 'hero3', 'fullbleed', 'nine'];
export const LAYOUT_LABELS = {
  grid4: 'Four-panel grid',
  hero3: 'Hero + three',
  fullbleed: 'Full bleed',
  nine: 'Nine-panel grid',
};

export const GRADES = ['sunset', 'neon', 'vice', 'midnight'];
export const GRADE_LABELS = {
  sunset: 'Sunset',
  neon: 'Neon nights',
  vice: 'Vice City',
  midnight: 'Midnight',
};

export const EXPORT_SIZES = [
  { id: 'square', label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
  { id: 'story', label: 'Story 1080 × 1920', w: 1080, h: 1920 },
];

/** A fresh cover: hero layout, sunset grade, two sample panels, five-star hype. */
export function freshState() {
  return {
    layout: 'hero3',
    grade: 'sunset',
    title: 'Sunset Heist',
    subtitle: 'one last ride down the coast',
    badge: 'VICE COAST',
    hype: 5,
    sizeId: 'square',
    selectedPanel: 0,
    panels: [
      { photo: 0, zoom: 1.15, ox: 0, oy: -0.04 },
      { photo: 1, zoom: 1.15, ox: 0, oy: 0.28 },
      { photo: 0, zoom: 1.3, ox: 0.08, oy: -0.05 },
      { photo: 1, zoom: 1.3, ox: -0.06, oy: 0.3 },
      { photo: 0, zoom: 1.5, ox: -0.1, oy: -0.12 },
      { photo: 1, zoom: 1.5, ox: 0.1, oy: 0.05 },
      { photo: 0, zoom: 1.6, ox: 0.12, oy: -0.02 },
      { photo: 1, zoom: 1.4, ox: -0.12, oy: -0.08 },
      { photo: 0, zoom: 1.45, ox: 0, oy: 0.08 },
    ],
  };
}

/** Deep copy of a state object, for history snapshots. */
export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

/** Undo/redo history over state snapshots. */
export function makeHistory(initial) {
  let past = [];
  let future = [];
  let current = cloneState(initial);
  return {
    get current() { return current; },
    push(next) {
      past.push(current);
      if (past.length > 60) past.shift();
      future = [];
      current = cloneState(next);
    },
    /** Replaces the current state without adding a history entry (live slider drags). */
    replace(next) {
      current = cloneState(next);
    },
    /** Commits an edit whose starting point was captured before live changes began. */
    commitFrom(before, after) {
      past.push(cloneState(before));
      if (past.length > 60) past.shift();
      future = [];
      current = cloneState(after);
    },
    undo() {
      if (!past.length) return null;
      future.push(current);
      current = past.pop();
      return cloneState(current);
    },
    redo() {
      if (!future.length) return null;
      past.push(current);
      current = future.pop();
      return cloneState(current);
    },
    canUndo() { return past.length > 0; },
    canRedo() { return future.length > 0; },
  };
}

/** Panel rectangles for a layout, as fractions of the cover (x, y, w, h). */
export function panelRects(layout) {
  if (layout === 'fullbleed') return [{ x: 0, y: 0, w: 1, h: 1 }];
  if (layout === 'grid4') {
    return [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ];
  }
  if (layout === 'nine') {
    const cells = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        cells.push({ x: col / 3, y: row / 3, w: 1 / 3, h: 1 / 3 });
      }
    }
    return cells;
  }
  // hero3: one tall hero on the left, three stacked on the right.
  return [
    { x: 0, y: 0, w: 0.62, h: 1 },
    { x: 0.62, y: 0, w: 0.38, h: 1 / 3 },
    { x: 0.62, y: 1 / 3, w: 0.38, h: 1 / 3 },
    { x: 0.62, y: 2 / 3, w: 0.38, h: 1 / 3 },
  ];
}

/** How many panels a layout shows. */
export function panelCount(layout) {
  return panelRects(layout).length;
}
