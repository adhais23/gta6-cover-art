// Fixed scenes for screenshots: ?shot=cover shows the cover alone at the scene's size,
// ?shot=editor shows the editor with a sample photo loaded. Both sample photos always
// load; `caption` sets the title, `layout`/`grade`/`size` the cover setup.
// window.__shotReady is set once the scene has painted, so the screenshot script
// knows when to capture.

export async function runShot(shot, query, apply) {
  const scene = {
    title: query.get('caption') ?? 'Sunset Heist',
    layout: query.get('layout') ?? 'hero3',
    grade: query.get('grade') ?? 'sunset',
    sizeId: query.get('size') ?? 'square',
  };
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await apply(scene);
  await document.fonts.ready;
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
