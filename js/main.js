// Mobile nav
const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.site-nav');
if (navToggle) {
  navToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  }));
}

// Theme toggle with persistence
(function(){
  const root = document.documentElement;
  const btn = document.querySelector('.theme-toggle');
  const key = 'theme';
  const saved = localStorage.getItem(key);
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  if (saved) root.setAttribute('data-theme', saved);
  else if (prefersLight) root.setAttribute('data-theme','light');

  btn?.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    localStorage.setItem(key, next);
  });
})();

// Year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// Lightbox with keyboard + next/prev
(function(){
  const imgs = Array.from(document.querySelectorAll('.grid-item img'));
  const box = document.getElementById('lightbox');
  const boxImg = document.getElementById('lightbox-img');
  const prev = box?.querySelector('.lightbox-prev');
  const next = box?.querySelector('.lightbox-next');
  const closeBtn = box?.querySelector('.lightbox-close');
  if (!box || !boxImg || imgs.length === 0) return;
  let idx = 0;

  function open(i){
    idx = i;
    const el = imgs[idx];
    boxImg.src = el.src; boxImg.alt = el.alt || '';
    box.classList.add('open'); box.setAttribute('aria-hidden','false');
  }
  function close(){
    box.classList.remove('open'); box.setAttribute('aria-hidden','true');
  }
  function step(d){
    idx = (idx + d + imgs.length) % imgs.length;
    const el = imgs[idx];
    boxImg.src = el.src; boxImg.alt = el.alt || '';
  }

  imgs.forEach((img,i) => img.addEventListener('click', () => open(i)));
  closeBtn?.addEventListener('click', close);
  box.addEventListener('click', (e) => { if (e.target === box) close(); });
  prev?.addEventListener('click', () => step(-1));
  next?.addEventListener('click', () => step(1));
  window.addEventListener('keydown', (e) => {
    if (!box.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
})();

// Countdown to release
(function(){
  const el = document.querySelector('.countdown');
  if (!el) return;
  const dateStr = el.getAttribute('data-release');
  const release = dateStr ? new Date(dateStr) : null;
  if (!release || isNaN(release)) return;

  const rd = document.getElementById('release-date');
  if (rd) rd.textContent = release.toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'});

  function pad(n){return n.toString().padStart(2,'0');}
  function tick(){
    const now = new Date();
    let diff = Math.max(0, release - now);
    const d = Math.floor(diff / (1000*60*60*24)); diff -= d*24*60*60*1000;
    const h = Math.floor(diff / (1000*60*60)); diff -= h*60*60*1000;
    const m = Math.floor(diff / (1000*60)); diff -= m*60*1000;
    const s = Math.floor(diff / 1000);
    document.getElementById('cd-days').textContent = pad(d);
    document.getElementById('cd-hours').textContent = pad(h);
    document.getElementById('cd-mins').textContent = pad(m);
    document.getElementById('cd-secs').textContent = pad(s);
  }
  tick();
  setInterval(tick, 1000);
})();

// Netlify form success message
(function(){
  const status = document.getElementById('form-status');
  if (!status) return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('success') === 'true') {
    status.textContent = 'Thanks! Your message has been sent.';
  }
})();

// Reveal elements when they enter the viewport
(function(){
  const els = [
    '.hero-content', '.music-card', '.grid-item', '.about', '.about-text', '.about-photo', '.form', '.section-head'
  ].flatMap(sel => Array.from(document.querySelectorAll(sel)));
  els.forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in-view');
        io.unobserve(e.target);
      }
    });
  }, {threshold: .12});
  els.forEach(el => io.observe(el));
})();

// Hero parallax (respects reduced motion)
(function(){
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const bg = document.querySelector('.hero-bg');
  if (!bg) return;
  let ticking = false;
  function onScroll(){
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const rect = bg.getBoundingClientRect();
      const t = Math.max(-40, Math.min(0, rect.top * 0.08));
      bg.style.transform = `translateY(${t}px) scale(1.05)`;
      ticking = false;
    });
  }
  onScroll();
  window.addEventListener('scroll', onScroll, {passive:true});
})();

// Button sheen follows cursor
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('pointermove', (e) => {
    const r = btn.getBoundingClientRect();
    btn.style.setProperty('--mx', `${e.clientX - r.left}px`);
  });
});
