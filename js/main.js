// Greenfield Academy - Public site interactions
(function () {
  if (window.GA && window.GA.checkConnection) {
    window.GA.checkConnection().then((res) => {
      if (!res.ok) window.GA.toast('Supabase connection issue: ' + (res.error || 'unknown error'), 'error', 5000);
      else if (res.mode === 'mock') console.info('Greenfield Academy running in mock mode.');
    });
  }

  // Mobile nav
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      // Don't close menu if it's a dropdown toggle
      if (!a.classList.contains('dropdown-toggle')) {
        links.classList.remove('open');
      }
    }));
    
    // Handle dropdown toggle on mobile
    const dropdownToggles = links.querySelectorAll('.dropdown-toggle');
    dropdownToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        const dropdownMenu = toggle.nextElementSibling;
        if (dropdownMenu && dropdownMenu.classList.contains('dropdown-menu')) {
          const willOpen = !dropdownMenu.classList.contains('show');
          dropdownMenu.classList.toggle('show', willOpen);
          toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        }
      });
    });
  }

  // Hero slider
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');
  let idx = 0;
  function go(i) {
    slides.forEach((s, n) => s.classList.toggle('active', n === i));
    dots.forEach((d, n) => d.classList.toggle('active', n === i));
    idx = i;
  }
  if (slides.length) {
    dots.forEach((d, n) => d.addEventListener('click', () => go(n)));
    setInterval(() => go((idx + 1) % slides.length), 6000);
  }

  // Contact form
  const cf = document.getElementById('contact-form');
  if (cf) {
    cf.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(cf);
      const payload = Object.fromEntries(fd.entries());
      try {
        const c = window.GA.client();
        if (c) {
          const { error } = await c.from('contact_messages').insert(payload);
          if (error) throw error;
        }
      } catch (err) {
        return window.GA.toast('Could not send message: ' + (err.message || 'unknown error'), 'error');
      }
      window.GA.toast('Message sent. We will reply shortly.');
      cf.reset();
    });
  }

  // Apply form
  const af = document.getElementById('apply-form');
  if (af) {
    af.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(af);
      const payload = Object.fromEntries(fd.entries());
      payload.status = 'pending';
      try {
        const c = window.GA.client();
        const { error } = await c.from('pending_admissions').insert(payload);
        if (error) throw error;
        window.GA.toast('Application received. The admissions office will contact you.');
        af.reset();
      } catch (err) {
        window.GA.toast('Could not submit application: ' + (err.message || 'unknown error'), 'error');
      }
    });
  }

  // Dynamic news from Supabase if available
  const newsGrid = document.getElementById('news-grid');
  if (newsGrid) {
    (async () => {
      try {
        const c = window.GA.client();
        const { data, error } = await c.from('blog_posts').select('*').not('published_at', 'is', null).order('published_at', { ascending: false }).limit(6);
        if (error) throw error;
        if (data && data.length) {
          newsGrid.innerHTML = data.map((p) => `
            <a class="news-card news-link-card" href="blog-post.html?slug=${encodeURIComponent(p.slug || '')}">
              <div class="thumb" style="background-image:url('${p.cover || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=900'}')"></div>
              <div class="body">
                <div class="meta">${new Date(p.published_at || p.created_at || Date.now()).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric'})} - ${p.author || 'Admin'}</div>
                <h3>${p.title}</h3>
                <p>${p.excerpt || ''}</p>
              </div>
            </a>
          `).join('');
        }
      } catch (err) {
        console.warn('Could not load dynamic news:', err?.message || err);
      }
    })();
  }
})();
