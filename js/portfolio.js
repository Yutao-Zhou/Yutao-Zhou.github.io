(function (global) {
  'use strict';

  function initPortfolio(doc = global.document, win = global) {
    const root = doc.documentElement;
    const themeKey = 'portfolio-theme';
    const themeToggle = doc.querySelector('[data-theme-toggle]');
    const themeLabel = doc.querySelector('[data-theme-label]');
    const navigation = doc.getElementById('navigation');
    const menuToggle = doc.querySelector('[data-menu-toggle]');
    const cleanup = [];
    let preference = null;
    let systemTheme;

    function listen(target, event, handler) {
      if (!target?.addEventListener) return;
      target.addEventListener(event, handler);
      cleanup.push(() => target.removeEventListener(event, handler));
    }

    try {
      const saved = win.localStorage.getItem(themeKey);
      if (saved === 'light' || saved === 'dark') preference = saved;
    } catch {
      // The switch still works when browser storage is unavailable.
    }

    if (win.matchMedia)
      systemTheme = win.matchMedia('(prefers-color-scheme: dark)');

    function applyTheme(theme) {
      root.dataset.theme = theme;
      const dark = theme === 'dark';
      if (themeToggle) {
        themeToggle.hidden = false;
        themeToggle.setAttribute('aria-pressed', String(dark));
        themeToggle.setAttribute(
          'aria-label',
          `Switch to ${dark ? 'light' : 'dark'} mode`
        );
      }
      if (themeLabel) themeLabel.textContent = dark ? 'Light' : 'Dark';
      const browserColor = doc.querySelector('meta[name="theme-color"]');
      browserColor?.setAttribute('content', dark ? '#0d1011' : '#f8f9fc');
    }

    function automaticTheme() {
      return systemTheme?.matches ? 'dark' : 'light';
    }

    applyTheme(preference || automaticTheme());

    listen(themeToggle, 'click', () => {
      preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(preference);
      try {
        win.localStorage.setItem(themeKey, preference);
      } catch {
        // A session-only choice is useful even without persistent storage.
      }
    });

    listen(systemTheme, 'change', () => {
      if (!preference) applyTheme(automaticTheme());
    });

    listen(win, 'storage', (event) => {
      if (event.key !== themeKey && event.key !== null) return;
      preference =
        event.newValue === 'light' || event.newValue === 'dark'
          ? event.newValue
          : null;
      applyTheme(preference || automaticTheme());
    });

    function closeMenu(restoreFocus = false) {
      if (!menuToggle || !navigation) return;
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Open navigation menu');
      navigation.dataset.open = 'false';
      if (restoreFocus) menuToggle.focus();
    }

    if (menuToggle && navigation) {
      menuToggle.hidden = false;
      listen(menuToggle, 'click', () => {
        const open = menuToggle.getAttribute('aria-expanded') !== 'true';
        menuToggle.setAttribute('aria-expanded', String(open));
        menuToggle.setAttribute(
          'aria-label',
          `${open ? 'Close' : 'Open'} navigation menu`
        );
        navigation.dataset.open = String(open);
      });
      listen(navigation, 'click', (event) => {
        if (event.target.closest('a')) closeMenu();
      });
      listen(doc, 'keydown', (event) => {
        if (
          event.key === 'Escape' &&
          menuToggle.getAttribute('aria-expanded') === 'true'
        ) {
          closeMenu(true);
        }
      });
      const desktop = win.matchMedia?.('(min-width: 760px)');
      listen(desktop, 'change', (event) => {
        if (event.matches) closeMenu();
      });
    }

    function revealHashTarget() {
      if (!win.location.hash) return;
      let id;
      try {
        id = decodeURIComponent(win.location.hash.slice(1));
      } catch {
        return;
      }
      const target = doc.getElementById(id);
      if (!target) return;
      let parent = target;
      let opened = false;
      while (parent) {
        if (parent.tagName === 'DETAILS' && !parent.open) {
          parent.open = true;
          opened = true;
        }
        parent = parent.parentElement;
      }
      if (opened) target.scrollIntoView?.({ block: 'start' });
    }

    listen(win, 'hashchange', revealHashTarget);
    revealHashTarget();
    const year = doc.querySelector('[data-year]');
    if (year) year.textContent = String(new Date().getFullYear());

    return () => cleanup.forEach((remove) => remove());
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = { initPortfolio };
  } else {
    initPortfolio();
  }
})(typeof window !== 'undefined' ? window : globalThis);
