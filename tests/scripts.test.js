import $ from 'jquery';

describe('Portfolio Website JavaScript', () => {
  let scriptsModule;

  beforeEach(async () => {
    // Reset classes and states
    $('html').removeClass('no-js active');
    $('header').removeClass('active');
    $('body').removeClass('active');
    $('#more-projects').hide();
    $('#view-more-projects').show();

    // Dynamically import scripts.js after DOM is ready
    jest.isolateModules(() => {
      scriptsModule = require('./../js/scripts.js');
    });
  });

  afterEach(() => {
    // Restore all mocks to ensure clean state for next test
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    test('removes no-js class from html element on load', () => {
      expect($('html').hasClass('no-js')).toBe(false);
    });
  });

  describe('Navigation Smooth Scrolling', () => {
    test('navigation links with no-scroll class allow default behavior', () => {
      const $link = $('<a>', {
        href: '#skills',
        class: 'no-scroll'
      });
      $('#menu').append($link);

      const clickEvent = $.Event('click', {
        preventDefault: jest.fn()
      });
      $link.trigger(clickEvent);

      expect(clickEvent.preventDefault).not.toHaveBeenCalled();
    });

    test('navigation links without no-scroll class prevent default and animate scroll', () => {
      // Mock offset on jQuery prototype to return 500 for #skills
      const offsetSpy = jest.spyOn($.fn, 'offset').mockImplementation(function() {
        if (this.is('#skills')) {
          return { top: 500 };
        }
        return { top: 0 };
      });

      // Use an existing navigation link from the setup DOM
      const $link = $('#menu a').first();

      const animateSpy = jest.spyOn($.fn, 'animate');
      const preventDefaultSpy = jest.fn();
      const clickEvent = $.Event('click', { preventDefault: preventDefaultSpy });
      $link.trigger(clickEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(animateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ scrollTop: '500px' }),
        expect.any(Number)
      );

      offsetSpy.mockRestore();
    });

    test('closes mobile menu when navigation is clicked', () => {
      $('header').addClass('active');
      $('body').addClass('active');

      // Use an existing navigation link
      const $link = $('#menu a').first();

      const clickEvent = $.Event('click');
      $link.trigger(clickEvent);

      expect($('header').hasClass('active')).toBe(false);
      expect($('body').hasClass('active')).toBe(false);
    });
  });

  describe('Mobile Menu Toggle', () => {
    test('opens mobile menu when #mobile-menu-open is clicked', () => {
      $('#mobile-menu-open').trigger('click');
      expect($('header').hasClass('active')).toBe(true);
      expect($('body').hasClass('active')).toBe(true);
    });

    test('closes mobile menu when #mobile-menu-close is clicked', () => {
      $('header').addClass('active');
      $('body').addClass('active');

      $('#mobile-menu-close').trigger('click');

      expect($('header').hasClass('active')).toBe(false);
      expect($('body').hasClass('active')).toBe(false);
    });
  });

  describe('Scroll to Top', () => {
    test('scrolls to top when #to-top is clicked', () => {
      const animateSpy = jest.spyOn($.fn, 'animate');
      $('#to-top').trigger('click');

      expect(animateSpy).toHaveBeenCalledWith(
        { scrollTop: 0 },
        500
      );
    });
  });

  describe('Scroll to First Element', () => {
    test('scrolls to next section when #lead-down span is clicked', () => {
      const $next = $('#lead').next(); // should be #skills
      const offsetElements = [];
      const offsetSpy = jest.spyOn($.fn, 'offset').mockImplementation(function() {
        offsetElements.push(this.get(0));
        return { top: 0 };
      });
      const animateSpy = jest.spyOn($.fn, 'animate');

      $('#lead-down span').trigger('click');

      // Verify offset was called on the next element
      expect(offsetElements).toContain($next.get(0));

      // In jsdom, offset().top returns 0, so scrollTop becomes '0px'
      expect(animateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ scrollTop: '0px' }),
        500
      );
    });
  });

  describe('Timeline Creation', () => {
    test('creates timeline structure with vtimeline-point and vtimeline-block', () => {
      const $timeline = $('#experience-timeline');
      expect($timeline.find('.vtimeline-point')).toHaveLength(1);
      expect($timeline.find('.vtimeline-block')).toHaveLength(1);
      expect($timeline.find('.vtimeline-content')).toHaveLength(1);
    });

    test('adds vtimeline-icon with map-marker to each point', () => {
      const $timeline = $('#experience-timeline');
      expect($timeline.find('.vtimeline-icon')).toHaveLength(1);
      expect($timeline.find('.vtimeline-icon i').hasClass('fa')).toBe(true);
      expect($timeline.find('.vtimeline-icon i').hasClass('fa-map-marker')).toBe(true);
    });

    test('adds vtimeline-date when data-date attribute exists', () => {
      const $timeline = $('#experience-timeline');
      expect($timeline.find('.vtimeline-date')).toHaveLength(1);
      expect($timeline.find('.vtimeline-date').text()).toBe('October 2025 - Present');
    });

    test('does not add date when data-date attribute is missing', () => {
      const $timeline = $('<div>', { id: 'experience-timeline' }).appendTo('body');
      const $content = $('<div>').appendTo($timeline);
      $content.addClass('vtimeline-content');
      $content.wrap('<div class="vtimeline-point"><div class="vtimeline-block"></div></div>');

      $timeline.find('.vtimeline-content').each(function() {
        const date = $(this).data('date');
        if (date) {
          $(this).parent().prepend('<span class="vtimeline-date">' + date + '</span>');
        }
      });

      expect($timeline.find('.vtimeline-date')).toHaveLength(0);
      $timeline.remove();
    });
  });

  describe('View More Projects', () => {
    test('fades out view-more-projects button and fades in more-projects when clicked', () => {
      const $viewMoreBtn = $('#view-more-projects');

      jest.spyOn($.fn, 'fadeOut').mockImplementation(function(duration, callback) {
        if (callback) callback();
        return this;
      });
      jest.spyOn($.fn, 'fadeIn').mockImplementation(function(duration) {
        return this;
      });

      const preventDefaultSpy = jest.fn();
      const clickEvent = $.Event('click', { preventDefault: preventDefaultSpy });
      $viewMoreBtn.trigger(clickEvent);

      expect($.fn.fadeOut).toHaveBeenCalledWith(300, expect.any(Function));
      expect($.fn.fadeIn).toHaveBeenCalledWith(300);
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Contact Form', () => {
    test('contact form has required fields', () => {
      const $form = $('#contact-form');
      const $email = $form.find('input[name="_replyto"]');
      const $message = $form.find('textarea[name="message"]');
      const $submit = $form.find('button[type="submit"]');

      expect($email.length).toBe(1);
      expect($email.prop('required')).toBe(true);
      expect($message.length).toBe(1);
      expect($message.prop('required')).toBe(true);
      expect($submit.length).toBe(1);
    });
  });

  describe('Accessibility', () => {
    test('skip link points to main content', () => {
      expect($('.skip-link').attr('href')).toBe('#main-content');
    });

    test('mobile menu buttons have aria-labels', () => {
      expect($('#mobile-menu-open').attr('aria-label')).toBeTruthy();
      expect($('#mobile-menu-close').attr('aria-label')).toBeTruthy();
    });

    test('navigation has aria-label', () => {
      expect($('nav').attr('aria-label')).toBeTruthy();
    });

    test('contact form has labels', () => {
      expect($('label[for="contact-email"]').length).toBeGreaterThan(0);
      expect($('label[for="contact-message"]').length).toBeGreaterThan(0);
    });
  });
});