/* Cosmetic atmosphere only. Never read or write collection state. */
(() => {
  'use strict';
  const banner = document.querySelector('.c7s5Banner');
  const button = document.getElementById('c7s5MotionToggle');
  if (!banner || !button) return;
  const key = 'scl_c7s5_motion_paused_v1';
  let paused = false;
  try { paused = localStorage.getItem(key) === 'true'; } catch (_) { /* Private browsing. */ }
  function apply() {
    document.body.classList.toggle('s5-motion-paused', paused);
    button.setAttribute('aria-pressed', String(paused));
    button.setAttribute('aria-label', `${paused ? 'Play' : 'Pause'} decorative atmosphere`);
    button.innerHTML = `${paused ? '▷' : 'Ⅱ'} <span>Motion</span>`;
  }
  button.addEventListener('click', () => {
    paused = !paused;
    apply();
    try { localStorage.setItem(key, String(paused)); } catch (_) { /* Optional preference. */ }
  });
  apply();
  // No animation work while scrolled away, in a detail view or in a hidden tab.
  let visible = true;
  const sync = () => document.body.classList.toggle('s5-atmosphere-offscreen', !visible || document.hidden);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(banner);
  }
  document.addEventListener('visibilitychange', sync);

  // Keep lighting attached to the illustrated objects as object-fit crops change.
  // Coordinates are normalized against the current production tavern artwork.
  const tavern = banner.querySelector('[data-art-theme="tavern"] img');
  const map = banner.querySelector('[data-art-theme="map"] img');
  const atmosphere = banner.querySelector('.c7s5Atmosphere');
  if (tavern && atmosphere) {
    let frame = 0;
    function fittedImage(image, surface) {
      if (!image || !image.naturalWidth || !image.naturalHeight) return null;
      const box = image.getBoundingClientRect();
      if (!box.width || !box.height) return null;
      const scale = Math.max(box.width / image.naturalWidth, box.height / image.naturalHeight);
      const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
      const position = getComputedStyle(image).objectPosition.split(' ').map(value => parseFloat(value) / 100);
      return {box, width, height,
        left: box.left - surface.left + (box.width - width) * position[0],
        top: box.top - surface.top + (box.height - height) * position[1]};
    }
    function positionLighting() {
      frame = 0;
      const surface = atmosphere.getBoundingClientRect();
      const mapFit = fittedImage(map, surface), route = banner.querySelector('.c7s5Route');
      if (mapFit && route) {
        route.style.left = `${mapFit.left}px`;
        route.style.top = `${mapFit.top}px`;
        route.style.width = `${mapFit.width}px`;
        route.style.height = `${mapFit.height}px`;
      }
      const fit = fittedImage(tavern, surface);
      if (!fit) return;
      const {box, width, height, left, top} = fit;
      for (const [name, x, y, radius] of [['lantern', .15, .29, .29], ['chest', .88, .64, .30]]) {
        atmosphere.style.setProperty(`--s5-${name}-x`, `${left + width * x}px`);
        atmosphere.style.setProperty(`--s5-${name}-y`, `${top + height * y}px`);
        atmosphere.style.setProperty(`--s5-${name}-size`, `${Math.min(width * radius, box.width * .55)}px`);
      }
    }
    const scheduleLighting = () => {
      if (!frame) frame = requestAnimationFrame(positionLighting);
    };
    tavern.addEventListener('load', scheduleLighting);
    if (map) map.addEventListener('load', scheduleLighting);
    if ('ResizeObserver' in window) new ResizeObserver(scheduleLighting).observe(banner);
    window.addEventListener('resize', scheduleLighting, {passive: true});
    scheduleLighting();
  }
})();
