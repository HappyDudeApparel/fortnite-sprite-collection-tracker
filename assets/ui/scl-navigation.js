/* Semantic navigation state only. Collection handlers and storage stay native. */
(() => {
  'use strict';
  const header = document.getElementById('sclHeader');
  if (!header) return;
  const nav = header.querySelector('.sclNavigation');
  const actions = header.querySelector('.top-actions');
  // Restore visual and keyboard order after the historical header-order helper.
  if (actions) {
    ['#installBtn', '#editGamertag', '.playGamesBtn'].forEach(selector => {
      const element = actions.querySelector(selector);
      if (element) actions.appendChild(element);
    });
  }
  if (!nav) return;
  const buttons = Array.from(nav.querySelectorAll('.tab'));
  const detail = document.getElementById('detailView');
  const sync = () => buttons.forEach(button => {
    const seasonDetail = detail && detail.classList.contains('active') && button.dataset.season &&
      document.body.classList.contains('season-' + button.dataset.season.toLowerCase());
    button.toggleAttribute('data-context-active', !!seasonDetail);
    if (button.classList.contains('active') || seasonDetail) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  new MutationObserver(sync).observe(nav, {subtree: true, attributes: true, attributeFilter: ['class']});
  if (detail) new MutationObserver(sync).observe(detail, {attributes: true, attributeFilter: ['class']});
  sync();
})();
