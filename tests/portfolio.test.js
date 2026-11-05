const fs = require('node:fs');
const path = require('node:path');
const { initPortfolio } = require('../js/portfolio');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

describe('Portfolio themes and navigation', () => {
  let destroy;
  let systemTheme;
  let originalMatchMedia;

  beforeEach(() => {
    document.documentElement.innerHTML = html.slice(html.indexOf('<head>'));
    document.documentElement.className = 'js';
    delete document.documentElement.dataset.theme;
    localStorage.clear();
    history.replaceState(null, '', '/');
    originalMatchMedia = window.matchMedia;
    systemTheme = new EventTarget();
    systemTheme.matches = false;
    window.matchMedia = jest.fn((query) => {
      if (query === '(prefers-color-scheme: dark)') return systemTheme;
      const desktop = new EventTarget();
      desktop.matches = true;
      return desktop;
    });
  });

  afterEach(() => {
    destroy?.();
    destroy = undefined;
    window.matchMedia = originalMatchMedia;
    jest.restoreAllMocks();
    history.replaceState(null, '', '/');
  });

  const start = () => {
    destroy = initPortfolio(document, window);
  };
  const toggle = () => document.querySelector('[data-theme-toggle]');
  const theme = () => document.documentElement.dataset.theme;
  const changeSystem = (dark) => {
    systemTheme.matches = dark;
    systemTheme.dispatchEvent(new Event('change'));
  };

  test('follows system appearance until a visitor chooses a theme', () => {
    start();
    expect(theme()).toBe('light');
    changeSystem(true);
    expect(theme()).toBe('dark');
    toggle().click();
    expect(theme()).toBe('light');
    changeSystem(false);
    changeSystem(true);
    expect(theme()).toBe('light');
  });

  test('restores an explicit dark choice even with a light system theme', () => {
    localStorage.setItem('portfolio-theme', 'dark');
    start();
    expect(theme()).toBe('dark');
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    expect(toggle()).toHaveAccessibleName('Switch to light mode');
    expect(document.querySelector('[data-theme-label]')).toHaveTextContent(
      'Light'
    );
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      '#0d1011'
    );
  });

  test('stores a manual choice and restores it on the next visit', () => {
    start();
    toggle().click();
    expect(localStorage.getItem('portfolio-theme')).toBe('dark');
    destroy();
    start();
    expect(theme()).toBe('dark');
    toggle().click();
    expect(theme()).toBe('light');
    expect(toggle()).toHaveAccessibleName('Switch to dark mode');
    expect(localStorage.getItem('portfolio-theme')).toBe('light');
  });

  test('ignores invalid saved values and respects the dark system theme', () => {
    localStorage.setItem('portfolio-theme', 'invalid');
    systemTheme.matches = true;
    start();
    expect(theme()).toBe('dark');
  });

  test('remains usable when browser storage is blocked', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    start();
    expect(() => toggle().click()).not.toThrow();
    expect(theme()).toBe('dark');
  });

  test('synchronizes an explicit choice and its removal across tabs', () => {
    start();
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'portfolio-theme', newValue: 'dark' })
    );
    expect(theme()).toBe('dark');
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'portfolio-theme', newValue: null })
    );
    expect(theme()).toBe('light');
  });

  test('still switches themes when system preference APIs are unavailable', () => {
    window.matchMedia = undefined;
    start();
    expect(theme()).toBe('light');
    toggle().click();
    expect(theme()).toBe('dark');
  });

  test('opens the mobile menu and lets Escape close it and restore focus', () => {
    start();
    const button = document.querySelector('[data-menu-toggle]');
    button.click();
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('navigation')).toHaveAttribute(
      'data-open',
      'true'
    );
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  test('closes the mobile menu after selecting a navigation destination', () => {
    start();
    const button = document.querySelector('[data-menu-toggle]');
    button.click();
    document.querySelector('#navigation a[href="#projects"]').click();
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  test('opens the project library and nested details for a direct project link', () => {
    history.replaceState(null, '', '/#project-nyc-subway-traffic-analysis');
    start();
    expect(document.getElementById('project-library')).toHaveAttribute('open');
    expect(
      document.getElementById('project-nyc-subway-traffic-analysis')
    ).toHaveAttribute('open');
  });

  test('opens a disclosure when its own ID is the navigation target', () => {
    start();
    history.replaceState(null, '', '/#project-library');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(document.getElementById('project-library')).toHaveAttribute('open');
  });

  test('ignores malformed or missing hash targets without breaking theme controls', () => {
    history.replaceState(null, '', '/#%E0%A4%A');
    expect(start).not.toThrow();
    history.replaceState(null, '', '/#missing-target');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    toggle().click();
    expect(theme()).toBe('dark');
  });
});
