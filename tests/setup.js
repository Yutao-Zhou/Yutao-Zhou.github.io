import $ from 'jquery';
import 'jest-canvas-mock';

// Make jQuery available globally
global.$ = $;
global.jQuery = $;

// Import @testing-library/jest-dom matchers
import '@testing-library/jest-dom';

// Set up DOM before each test
beforeEach(() => {
  // Set up basic HTML structure similar to index.html
  document.body.innerHTML = `
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <button id="mobile-menu-open" type="button" aria-label="Open navigation menu">
      <i class="fa fa-bars" aria-hidden="true"></i>
    </button>
    <header>
      <nav aria-label="Primary navigation">
        <button id="mobile-menu-close" type="button" aria-label="Close navigation menu">
          <span>Close</span> <i class="fa fa-times" aria-hidden="true"></i>
        </button>
        <ul id="menu" class="shadow">
          <li><a href="#skills"><b style="font-size: 15px">Skills</b></a></li>
          <li><a href="#about"><b style="font-size: 15px">About</b></a></li>
          <li><a href="#experience"><b style="font-size: 15px">Experience</b></a></li>
          <li><a href="#education"><b style="font-size: 15px">Education</b></a></li>
          <li><a href="#projects"><b style="font-size: 15px">Projects</b></a></li>
          <li><a href="#contact"><b style="font-size: 15px">Contact</b></a></li>
        </ul>
      </nav>
    </header>
    <main id="main-content">
      <div id="lead">
        <div id="lead-content"></div>
        <div id="lead-overlay" aria-hidden="true"></div>
        <div id="lead-down">
          <span>
            <a href="#skills" aria-label="Scroll to skills section">
              <i class="fa fa-chevron-down" aria-hidden="true"></i>
            </a>
          </span>
        </div>
      </div>
      <div id="skills"></div>
      <div id="about"></div>
      <div id="experience" class="background-alt">
        <div id="experience-timeline">
          <div data-date="October 2025 - Present">
            <h3><b>Amazon Web Services</b></h3>
            <h4>SDE II - Santa Clara, CA</h4>
            <ul><li>Test content</li></ul>
          </div>
        </div>
      </div>
      <div id="education"></div>
      <div id="projects" class="background-alt">
        <button id="view-more-projects">View More</button>
        <div id="more-projects" style="display: none;">Additional projects</div>
      </div>
      <div id="contact">
        <form id="contact-form" method="POST" action="https://formspree.io/f/xoqyrzne">
          <input type="hidden" name="_subject" value="Contact request from personal website" />
          <label class="sr-only" for="contact-email">Your email</label>
          <input id="contact-email" type="email" name="_replyto" placeholder="Your email" autocomplete="email" required />
          <label class="sr-only" for="contact-message">Your message</label>
          <textarea id="contact-message" name="message" placeholder="Your message" required></textarea>
          <button type="submit"><b>Send</b></button>
        </form>
      </div>
    </main>
    <footer>
      <div id="to-top">
        <a href="#main-content" aria-label="Back to top">
          <i class="fa fa-chevron-up" aria-hidden="true"></i>
        </a>
      </div>
    </footer>
  `;
});

// Clean up after each test
afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.classList.remove('active');
  $('html, body').stop(true, true);
});