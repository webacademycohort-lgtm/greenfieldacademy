(function () {
  const holder = document.getElementById('blog-list');
  if (!holder) return;

  (async () => {
    try {
      const c = window.GA.client();
      const { data, error } = await c
        .from('blog_posts')
        .select('*')
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false });
      if (error) throw error;

      if (!data || !data.length) {
        holder.innerHTML = '<article class="news-card blog-card"><div class="body"><p>No published posts yet.</p></div></article>';
        return;
      }

      holder.innerHTML = data.map((p) => {
        const date = new Date(p.published_at || p.created_at || Date.now()).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
        const slug = encodeURIComponent(p.slug || '');
        const cover = p.cover || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=900';
        return `
          <a class="news-card news-link-card blog-card" href="blog-post.html?slug=${slug}">
            <div class="thumb" style="background-image:url('${cover}')"></div>
            <div class="body">
              <div class="meta">${date} - ${p.author || 'Admin'}</div>
              <h3>${p.title || 'Untitled'}</h3>
              <p class="blog-excerpt">${(p.excerpt || 'Read the full post for details.').slice(0, 180)}</p>
              <span class="blog-read-more">Read more <i class="fa-solid fa-arrow-right"></i></span>
            </div>
          </a>
        `;
      }).join('');
    } catch (err) {
      holder.innerHTML = `<article class="news-card blog-card"><div class="body"><p style="color:#991b1b;">Failed to load posts: ${err.message || 'unknown error'}</p></div></article>`;
    }
  })();
})();
