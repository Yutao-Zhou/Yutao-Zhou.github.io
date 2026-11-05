# Yutao Zhou's portfolio

Personal website at [yutaozhou.com](https://yutaozhou.com/), published from the `main` branch with GitHub Pages.

The homepage is a buildless static page. Edit `index.html`, `css/portfolio.css`, and `js/portfolio.js` directly. Existing project assets and downloadable reports remain in `images/`, `gif/`, and `files/`.

When changing the stylesheet, update its `?v=` cache key in `index.html` to the first 12 characters of the stylesheet's SHA-256 hash. This keeps cached CSS aligned with the current page markup.

## Appearance and content

- Light mode uses a blue and white palette. Dark mode uses charcoal and lime.
- The initial theme follows the visitor's system preference. The header switch stores an explicit choice under `portfolio-theme` in browser local storage.
- All 13 project descriptions and 9 experience entries remain available in expandable sections. Direct links to project details automatically expand the relevant sections.
- The contact form continues to use the existing Formspree endpoint.
- The footer links to `legacy.html`, a complete snapshot of the previous homepage. Its original CSS, scripts, images, and downloads are retained.

## Validation

Run `npm test -- --runInBand`. Theme and navigation tests in `tests/portfolio.test.js` use the real homepage markup. The original template's JavaScript and regression tests are retained, but the new homepage loads only `js/portfolio.js`.

No build step is required to publish the homepage. The legacy Gulp workflow applies to the original template's SCSS and JavaScript, not the redesigned homepage.

All original content, images, files, and GIFs are the intellectual property of Yutao Zhou. Please contact the owner before reusing them.
