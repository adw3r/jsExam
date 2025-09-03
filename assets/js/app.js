import * as glide from '../../node_modules/@glidejs/glide/dist/glide.min.js'

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
    link.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, view: window}));
  });
}

function setupFooterMap() {
  const el = document.querySelector('.footer__map');
  if (!el || typeof window === 'undefined' || !window.L) return;

  const center = [40.7128, -74.0060]; // New York City
  const map = window.L.map(el, {
    center: center,
    zoom: 12,
    scrollWheelZoom: false,
  });

  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  const marker = window.L.marker(center).addTo(map);
  marker.bindPopup('Monticello, NYC').openPopup();
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

function renderNewsFromJson() {
  const list = document.querySelector('.news .glide__slides');
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
        article.className = 'news__item glide__slide';

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
    });
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
  const newsSlider = new Glide('.news .glide', {
    type: 'carousel',
    perView: 3,
    animationTimingFunc: 'ease',
    autoplay: 1200,
    animationDuration: 1500,
    hoverpause: true,
    breakpoints: {
      1024: {
        perView: 2,
      },
      768: {
        perView: 1,
      },
    }
  });
  const heroSlider = new Glide('.hero .glide', {
    type: 'carousel',
    perView: 1,
    animationTimingFunc: 'ease',
    autoplay: 2400,
    pauseOnHover: false,
    animationDuration: 1200,
    // hoverpause: true,
  });

  // Change hero background colors by slide index
  function updateHeroGradientByIndex(idx) {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    // Define a small palette
    const palettes = [
      ['#7E5AFF', '#55B7FF'],
      ['#FF6B6B', '#FFD166'],
      ['#06D6A0', '#118AB2'],
      ['#F72585', '#4361EE']
    ];
    const colors = palettes[idx % palettes.length];
    hero.style.setProperty('--hero-color-1', colors[0]);
    hero.style.setProperty('--hero-color-2', colors[1]);
  }

  heroSlider.on('run.after', function () {
    try {
      const idx = heroSlider.index || 0;
      updateHeroGradientByIndex(idx);
    } catch (_) {
    }
  });

  heroSlider.mount()
  renderNewsFromJson().then(function () {
    newsSlider.mount()
    // setupNewsSlider();
  });
  setupLightGallery();
  setupGalleryLoopClick();
  setupFooterMap();
});
