// Smooth scrolling for in-page anchor links with optional fixed header offset
(function () {
  'use strict';

  function getHeaderOffset() {
    const header = document.querySelector('header');
    if (!header) return 0;
    const styles = window.getComputedStyle(header);
    const position = styles.position;
    const isOverlaying = position === 'fixed' || position === 'sticky';
    if (!isOverlaying) return 0;
    const topVal = parseInt(styles.top || '0', 10) || 0;
    // Subtract header height when it sits at top (covers content)
    return topVal <= 0 ? header.offsetHeight : header.offsetHeight;
  }

  function scrollToId(hash) {
    if (!hash || hash === '#') return;
    const target = document.querySelector(hash);
    if (!target) return;
    const offset = getHeaderOffset();
    const targetTop = target.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: targetTop, behavior: 'smooth' });
    try {
      history.pushState(null, '', hash);
    } catch (e) {
      // no-op
    }
  }

  document.addEventListener('click', function (event) {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.length < 2) return; // ignore '#' only
    const url = new URL(href, window.location.href);
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
    setupHeaderScrollState();
    setupScrollSpy();
    setupNewsSlider();
  });

  // Toggle header background when hero is scrolled past
  function setupHeaderScrollState() {
    const header = document.querySelector('header');
    let hero = document.querySelector('.hero');
    if (!header || !hero) return;

    let threshold = hero.offsetHeight - (getHeaderOffset() || 0);

    function update() {
      let y = window.pageYOffset || document.documentElement.scrollTop || 0;
      if (y >= threshold) {
        header.classList.add('header--scrolled');
      } else {
        header.classList.remove('header--scrolled');
      }
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', function () {
      threshold = hero.offsetHeight - (getHeaderOffset() || 0);
      update();
    });
  }

  // Infinite horizontal slider for Latest news
  function setupNewsSlider() {
    const list = document.querySelector('.news .news__list');
    if (!list) return;

    const items = Array.from(list.querySelectorAll('.news__item'));
    if (items.length === 0) return;

    // Wrap items in a track
    let track = list.querySelector('.news__track');
    if (!track) {
      track = document.createElement('div');
      track.className = 'news__track';
      // Move existing items into the track
      items.forEach((it) => track.appendChild(it));
      list.appendChild(track);
    }

    // Clone items to allow seamless loop
    const cloneCount = Math.min(items.length, 5);
    for (let i = 0; i < cloneCount; i++) {
      const clone = items[i].cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    }

    let isPaused = false;
    let lastTs = 0;
    let offset = 0;
    const speed = 0.1; // px per ms

    function tick(ts) {
      if (!lastTs) lastTs = ts;
      const dt = ts - lastTs;
      lastTs = ts;
      if (!isPaused) {
        offset -= dt * speed;
        const first = track.firstElementChild;
        if (first) {
          const firstWidth = first.getBoundingClientRect().width + 30; // include gap
          if (-offset >= firstWidth) {
            offset += firstWidth;
            track.appendChild(first);
          }
        }
        track.style.transform = 'translateX(' + offset + 'px)';
      }
      requestAnimationFrame(tick);
    }

    // Pause on hover
    list.addEventListener('mouseenter', function () { isPaused = true; });
    list.addEventListener('mouseleave', function () { isPaused = false; });

    requestAnimationFrame(tick);
  }

  // Scrollspy: toggle nav active based on section under header bottom
  function setupScrollSpy() {
    const navItems = Array.from(document.querySelectorAll('.header__nav .header__nav-item'));
    if (!navItems.length) return;

    const entries = navItems.map((item) => {
      const link = item.querySelector('a[href^="#"]');
      if (!link) return null;
      const href = link.getAttribute('href');
      if (!href || href === '#') return null;
      const section = document.querySelector(href);
      if (!section) return null;
      return { id: href, section, item };
    }).filter(Boolean);

    if (!entries.length) return;

    const header = document.querySelector('header');

    function getAnchorY() {
      if (header) {
        const rect = header.getBoundingClientRect();
        return Math.max(0, rect.bottom + 1);
      }
      return 1;
    }

    function updateActive() {
      const anchorY = getAnchorY();
      let currentId = entries[0].id;
      let bestDistance = Infinity;

      for (const entry of entries) {
        const rect = entry.section.getBoundingClientRect();
        const within = rect.top <= anchorY && rect.bottom > anchorY;
        if (within) {
          currentId = entry.id;
          bestDistance = 0;
          break;
        }
        const distance = anchorY < rect.top ? rect.top - anchorY : anchorY - rect.bottom;
        if (distance < bestDistance) {
          bestDistance = distance;
          currentId = entry.id;
        }
      }

      for (const entry of entries) {
        if (entry.id === currentId) entry.item.classList.add('active');
        else entry.item.classList.remove('active');
      }
    }

    let ticking = false;
    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(function () {
          updateActive();
          ticking = false;
        });
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    updateActive();
  }
})();


