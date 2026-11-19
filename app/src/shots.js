// Fixed scenes for screenshots: ?shot=cover shows the cover alone, ?shot=editor the
// editor with a photo loaded, ?shot=portrait a 1080 x 1350 cover, ?shot=sizes one cover
// in all four export sizes. `photo` picks the sample (samples/<photo>.jpg) and `caption`
// the title. window.__shotReady is set once painted.
import { drawCover } from './cover.js';

function fillPanels(state, ids, crops) {
  const n = state.panels.length;
  for (let i = 0; i < n; i++) {
    state.panels[i].photoId = ids[i % ids.length];
    state.panels[i].cx = 0;
    state.panels[i].cy = crops && crops[i] != null ? crops[i] : 0;
    state.panels[i].zoom = 1;
  }
}

async function ready(api) {
  await document.fonts.ready;
  api.render();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}

/** Renders one mini cover of the given size/layout/grade into the sheet context. */
function miniCover(sheet, api, x, y, w, h, layout, grade, title, photoIds) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const mini = {
    ...api.state,
    layout,
    grade,
    title,
    subtitle: 'Vice Coast nights',
    badge: 'VICE COAST',
    heat: 4,
    grain: true,
    vignette: true,
    panels: api.state.panels.map((p, i) => ({ ...p, photoId: photoIds[i % photoIds.length], cx: 0, cy: 0, zoom: 1 })),
  };
  drawCover(off.getContext('2d'), mini, api.photos, w, h);
  sheet.drawImage(off, x, y, w, h);
  sheet.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  sheet.lineWidth = 2;
  sheet.strokeRect(x, y, w, h);
}

export async function runShot(shot, query, api) {
  const caption = query.get('caption') ?? 'Sunset Heist';
  const photoName = query.get('photo') ?? 'pier';
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const hero = await api.loadSample(photoName);
    const other = await api.loadSample(photoName === 'pier' ? 'boulevard' : 'pier');
    api.state.layout = 'hero3';
    api.state.grade = 'sunset';
    api.state.title = caption;
    api.state.subtitle = 'Vice Coast nights';
    api.state.badge = 'VICE COAST';
    api.state.heat = 4;
    api.state.size = 'wide';
    fillPanels(api.state, [hero, other, other, hero], [0, 0.56, 0.56, 0.85]);
    api.syncInputs();
    await ready(api);
    return;
  }
  if (shot === 'portrait') {
    document.body.classList.add('shot-cover');
    const pier = await api.loadSample('pier');
    const boulevard = await api.loadSample('boulevard');
    api.state.layout = 'grid4';
    api.state.grade = 'neon';
    api.state.title = caption;
    api.state.subtitle = 'Vice Coast nights';
    api.state.badge = 'VICE COAST';
    api.state.heat = 5;
    api.state.size = 'portrait';
    fillPanels(api.state, [pier, boulevard, boulevard, pier]);
    api.syncInputs();
    await ready(api);
    return;
  }
  if (shot === 'sizes') {
    document.body.classList.add('shot-cover');
    const boulevard = await api.loadSample('boulevard');
    const pier = await api.loadSample('pier');
    const ids = [boulevard, pier, boulevard, pier];
    await document.fonts.ready;
    api.setSize(1280, 720);
    const sheet = api.canvas.getContext('2d');
    sheet.fillStyle = '#14081f';
    sheet.fillRect(0, 0, 1280, 720);
    sheet.textAlign = 'center';
    sheet.textBaseline = 'middle';
    sheet.fillStyle = '#ffd319';
    sheet.font = '44px Anton, sans-serif';
    sheet.fillText('ONE COVER, EVERY SIZE', 640, 66);
    sheet.fillStyle = '#f6eefc';
    sheet.font = '22px "Bebas Neue", sans-serif';
    sheet.fillText('VICE COAST COVER LAB  ·  SQUARE  ·  PORTRAIT  ·  STORY  ·  WIDE', 640, 118);
    const top = 160;
    const h = 340;
    miniCover(sheet, api, 40, top, 340, 340, 'grid4', 'sunset', 'SUNSET HEIST', ids);
    miniCover(sheet, api, 410, top, 272, 340, 'hero3', 'neon', 'NEON NIGHTS', ids);
    miniCover(sheet, api, 712, top, 191, 340, 'fullbleed', 'vice', 'VICE COAST', ids);
    miniCover(sheet, api, 933, top, 320, 180, 'grid4', 'sunset', 'BOULEVARD QUEEN', ids);
    sheet.fillStyle = '#b9a6c9';
    sheet.font = '20px "Bebas Neue", sans-serif';
    sheet.fillText('1080 × 1080', 210, 530);
    sheet.fillText('1080 × 1350', 546, 530);
    sheet.fillText('1080 × 1920', 808, 530);
    sheet.fillText('1920 × 1080', 1093, 380);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    window.__shotReady = true;
    return;
  }
  // Default: the editor, with a sample photo loaded.
  const id = await api.loadSample(photoName);
  const other = await api.loadSample(photoName === 'pier' ? 'boulevard' : 'pier');
  api.state.layout = 'grid4';
  api.state.grade = 'sunset';
  api.state.title = caption;
  api.state.subtitle = 'Vice Coast nights';
  api.state.badge = 'VICE COAST';
  api.state.heat = 4;
  api.state.size = 'square';
  fillPanels(api.state, [id, other, other, id]);
  api.syncInputs();
  await ready(api);
}
