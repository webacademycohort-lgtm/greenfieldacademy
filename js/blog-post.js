(function () {
  const holder = document.getElementById('blog-post-view');
  if (!holder) return;

  function getSlug() {
    const params = new URLSearchParams(window.location.search);
    return (params.get('slug') || '').trim();
  }

  (async () => {
    const slug = getSlug();
    if (!slug) {
      holder.innerHTML = '<div class="body"><p>Post not found.</p></div>';
      return;
    }

    try {
      const c = window.GA.client();
      const { data, error } = await c
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .not('published_at', 'is', null)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        holder.innerHTML = '<div class="body"><p>Post not found or not published.</p></div>';
        return;
      }

      const date = new Date(data.published_at || data.created_at || Date.now()).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
      const cover = data.cover || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200';
      const bodyHtml = (data.body || '')
        .split(/\n\s*\n/)
        .map((chunk) => `<p>${chunk.replace(/\n/g, '<br>')}</p>`)
        .join('');

      holder.innerHTML = `
        <div class="thumb" style="background-image:url('${cover}'); aspect-ratio:16/8;"></div>
        <div class="body" style="padding:1.5rem 1.7rem;">
          <div class="meta">${date} - ${data.author || 'Admin'}</div>
          <h1 style="font-family:'Playfair Display', serif; color:var(--green-900); margin:.4rem 0 1rem;">${data.title || 'Untitled'}</h1>
          <p style="font-weight:600; margin-bottom:1rem;">${data.excerpt || ''}</p>
          <div class="blog-post-content">${bodyHtml}</div>
        </div>
      `;
    } catch (err) {
      holder.innerHTML = `<div class="body"><p style="color:#991b1b;">Failed to load post: ${err.message || 'unknown error'}</p></div>`;
    }
  })();
})();
