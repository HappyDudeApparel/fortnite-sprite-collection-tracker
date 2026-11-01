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
})();
