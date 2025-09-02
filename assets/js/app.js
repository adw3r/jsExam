// Smooth scrolling for in-page anchor links with optional fixed header offset
(function () {
  'use strict';

  function getHeaderOffset() {
    var header = document.querySelector('header');
    if (!header) return 0;
    var styles = window.getComputedStyle(header);
    var isFixed = styles.position === 'fixed';
    if (!isFixed) return 0;
    var topVal = parseInt(styles.top || '0', 10) || 0;
    // Only subtract header height if it sits at the very top (covers content)
    return topVal <= 0 ? header.offsetHeight : 0;
  }

  function scrollToId(hash) {
    if (!hash || hash === '#') return;
    var target = document.querySelector(hash);
    if (!target) return;
    var offset = getHeaderOffset();
    var targetTop = target.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: targetTop, behavior: 'smooth' });
    try {
      history.pushState(null, '', hash);
    } catch (e) {
      // no-op
    }
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href^="#"]');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || href.length < 2) return; // ignore '#' only
    var url = new URL(href, window.location.href);
    if (url.pathname.replace(/\/$/, '') !== window.location.pathname.replace(/\/$/, '')) return;
    event.preventDefault();
    scrollToId(url.hash);
  });

  // If page loads with a hash, smooth-scroll to position (useful for direct links)
  window.addEventListener('load', function () {
    if (window.location.hash) {
      // Delay to allow layout to settle
      setTimeout(function () { scrollToId(window.location.hash); }, 0);
    }
  });
})();


