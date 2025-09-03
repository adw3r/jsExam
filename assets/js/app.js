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
  window.scrollTo({top: targetTop, behavior: 'smooth'});
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
  window.addEventListener('scroll', update, {passive: true});
  window.addEventListener('resize', function () {
    threshold = hero.offsetHeight - (getHeaderOffset() || 0);
    update();
  });
}

function setupLightGallery() {
  const gallery = document.querySelector('.gallery__list');
  if (!gallery || typeof lightGallery === 'undefined') return;
  lightGallery(gallery, {
    selector: '.gallery__link',
    plugins: [lgZoom, lgThumbnail],
    speed: 300,
    download: false,
  });
}

function setupGalleryLoopClick() {
  const container = document.querySelector('.gallery__list');
  if (!container) return;
  container.addEventListener('click', function (event) {
    const loop = event.target.closest('.loop');
    if (!loop) return;
    const item = loop.closest('.gallery__item');
    if (!item) return;
    const link = item.querySelector('.gallery__link');
    if (!link) return;
    event.preventDefault();
    event.stopPropagation();
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  });
}

function renderNewsFromJson() {
  const list = document.querySelector('.news .news__list');
  if (!list) return;
  return fetch('assets/js/news.json', {cache: 'no-cache'})
    .then(function (res) {
      return res.ok ? res.json() : Promise.reject(res.status);
    })
    .then(function (data) {
      if (!data || !Array.isArray(data.items)) return;
      const fragment = document.createDocumentFragment();
      data.items.forEach(function (item) {
        const article = document.createElement('article');
        article.className = 'news__item';

        const imageWrap = document.createElement('div');
        imageWrap.className = 'news__image';
        const img = document.createElement('img');
        img.className = 'news__img';
        img.src = item.image;
        img.alt = item.title || '';
        imageWrap.appendChild(img);
        article.appendChild(imageWrap);

        const content = document.createElement('div');
        content.className = 'content';

        const h3 = document.createElement('h3');
        h3.className = 'news__title';
        h3.textContent = item.title || '';
        content.appendChild(h3);

        const p = document.createElement('p');
        p.className = 'news__excerpt';
        p.textContent = item.excerpt || '';
        content.appendChild(p);

        const author = document.createElement('div');
        author.className = 'news__author';

        const avatar = document.createElement('img');
        avatar.className = 'news__author-avatar';
        avatar.src = item.author && item.author.avatar ? item.author.avatar : '';
        avatar.alt = '';
        author.appendChild(avatar);

        const meta = document.createElement('div');
        meta.className = 'news__author-meta';
        const name = document.createElement('span');
        name.className = 'news__author-name';
        name.textContent = item.author && item.author.name ? item.author.name : '';
        const date = document.createElement('span');
        date.className = 'news__date';
        date.textContent = formatDate(item.date);
        meta.appendChild(name);
        meta.appendChild(date);
        author.appendChild(meta);

        content.appendChild(author);
        article.appendChild(content);

        fragment.appendChild(article);
      });

      list.innerHTML = '';
      list.appendChild(fragment);
    })
    .catch(function () { /* ignore */
    });
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const options = {day: '2-digit', month: 'short', year: 'numeric'};
    return d.toLocaleDateString('en-GB', options).replace(/\./g, '');
  } catch (_) {
    return '';
  }
}

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
  const speed = 0.04; // px per ms

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
  list.addEventListener('mouseenter', function () {
    isPaused = true;
  });
  list.addEventListener('mouseleave', function () {
    isPaused = false;
  });

  requestAnimationFrame(tick);
}

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
    return {id: href, section, item};
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

  window.addEventListener('scroll', onScroll, {passive: true});
  window.addEventListener('resize', onScroll);
  updateActive();
}

window.addEventListener('load', function () {
  if (window.location.hash) {
    // Delay to allow layout to settle
    setTimeout(function () {
      scrollToId(window.location.hash);
    }, 0);
  }
  setupHeaderScrollState();
  setupScrollSpy();
  renderNewsFromJson().then(function () {
    setupNewsSlider();
  });
  setupLightGallery();
  setupGalleryLoopClick();
});
