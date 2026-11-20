// Fixed scenes for screenshots: ?shot=editor shows the studio with photos
// loaded; ?shot=cover shows only the exported cover, edge to edge.
// `photo` picks the sample (samples/<photo>.jpg), `layout`, `grade`, `size`,
// `title` and `subtitle` set the scene. window.__shotReady is set once the
// fonts are in and the cover has painted.
export async function runShot(shot, query, state, tools) {
  const layout = query.get('layout') || 'hero';
  const grade = query.get('grade') || 'sunset';
  const size = query.get('size') || '1080x1080';
  const title = query.get('title') || 'NEON COAST';
  const subtitle = query.get('subtitle') || 'sunset heist on the palm boulevard';
  const photoName = query.get('photo') || 'boulevard';
  const secondPhoto = query.get('photo2');

  state.layout = layout;
  state.grade = grade;
  state.size = size;
  state.title = title;
  state.subtitle = subtitle;
  document.getElementById('title').value = title;
  document.getElementById('subtitle').value = subtitle;
  document.querySelectorAll('#layoutRow button').forEach((b) => b.classList.toggle('picked', b.dataset.layout === layout));
  document.querySelectorAll('#gradeRow button').forEach((b) => b.classList.toggle('picked', b.dataset.grade === grade));
  document.querySelectorAll('#sizeRow button').forEach((b) => b.classList.toggle('picked', b.dataset.size === size));

  const first = await tools.loadImage(`samples/${photoName}.jpg`);
  const images = [first];
  const names = [photoName];
  if (secondPhoto) {
    images.push(await tools.loadImage(`samples/${secondPhoto}.jpg`));
    names.push(secondPhoto);
  }
  tools.addPhotos(images, names);
  // Spread the photos across the panels: hero panel gets the first photo,
  // the small panels alternate, so every panel is filled.
  for (let i = 0; i < state.panelPhotos.length; i++) {
    state.panelPhotos[i] = i % images.length;
  }
  tools.applySize();
  tools.renderTray();
  if (shot === 'cover') document.body.classList.add('shot-cover');
  try {
    await Promise.all([
      document.fonts.load('100px "Archivo Black"'),
      document.fonts.load('40px "Pacifico"'),
    ]);
    await document.fonts.ready;
  } catch {
    // Fall back to system fonts if the vendored ones fail to load.
  }
  tools.applySize();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
