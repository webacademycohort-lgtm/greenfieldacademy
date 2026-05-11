// Greenfield Academy — Supabase client + helpers
// Drop your real Supabase URL + anon key into js/config.js (gitignored in production)
//
// In a Next.js port these helpers map 1:1 to /lib/supabaseClient.ts.

(function (global) {
  // ---- CONFIG (override by defining window.GA_CONFIG in /js/config.js) ----
  const cfg = global.GA_CONFIG || {
    SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
    SUPABASE_ANON_KEY: 'YOUR-ANON-KEY',
    PAYSTACK_PUBLIC_KEY: 'pk_test_xxxxxxxxxxxxxxxxxxxx',
    SCHOOL_NAME: 'Greenfield Academy',
    SCHOOL_MOTTO: 'Knowledge • Discipline • Excellence',
    SCHOOL_ADDRESS: 'Plot 12, Education Avenue, Lagos, Nigeria',
    SCHOOL_PHONE: '+234 800 000 0000',
    SCHOOL_EMAIL: 'info@greenfieldacademy.ng',
    CURRENT_SESSION: '2024/2025',
    CURRENT_TERM: '1st Term',
    TERM_FEE_NGN: 75000
  };

  // ---- Supabase client (uses official CDN UMD build) ----
  let _client = null;
  let _usingMock = false;
  function client() {
    if (_client) return _client;
    if (!global.supabase || !global.supabase.createClient) {
      console.warn('Supabase JS not loaded yet.');
      return null;
    }
    const hasPlaceholderUrl = String(cfg.SUPABASE_URL || '').includes('YOUR-PROJECT');
    const hasPlaceholderKey = String(cfg.SUPABASE_ANON_KEY || '').includes('YOUR-ANON-KEY');
    if (hasPlaceholderUrl || hasPlaceholderKey) {
      // Demo mode — return a mock so the UI still renders without a real backend.
      _client = mockClient();
      _usingMock = true;
      return _client;
    }
    _client = global.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    _usingMock = false;
    return _client;
  }

  // ---- Grading utilities (Nigerian WAEC style) ----
  function gradeOf(total) {
    if (total >= 75) return { grade: 'A1', remark: 'Excellent' };
    if (total >= 70) return { grade: 'B2', remark: 'Very Good' };
    if (total >= 65) return { grade: 'B3', remark: 'Good' };
    if (total >= 60) return { grade: 'C4', remark: 'Credit' };
    if (total >= 55) return { grade: 'C5', remark: 'Credit' };
    if (total >= 50) return { grade: 'C6', remark: 'Credit' };
    if (total >= 45) return { grade: 'D7', remark: 'Pass' };
    if (total >= 40) return { grade: 'E8', remark: 'Pass' };
    return { grade: 'F9', remark: 'Fail' };
  }

  // ---- Toast ----
  function toast(msg, type = 'success', timeout = 3500) {
    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    const t = document.createElement('div');
    t.className = 'toast ' + (type || '');
    t.textContent = msg;
    stack.appendChild(t);
    setTimeout(() => t.remove(), timeout);
  }

  // ---- Auth helpers ----
  async function signIn(email, password) {
    const c = client();
    return c.auth.signInWithPassword({ email, password });
  }
  async function signUp(email, password, metadata) {
    const c = client();
    return c.auth.signUp({ email, password, options: { data: metadata } });
  }
  async function signOut(redirectTo) {
    const c = client();
    await c.auth.signOut();
    if (redirectTo) location.href = redirectTo;
  }
  async function getSession() {
    const c = client();
    const { data } = await c.auth.getSession();
    return data.session;
  }
  async function getProfile() {
    const c = client();
    const session = await getSession();
    if (!session) return null;
    const { data } = await c.from('profiles').select('*').eq('id', session.user.id).single();
    return data;
  }
  async function requireRole(role, redirect = 'login.html') {
    const profile = await getProfile();
    if (!profile) { location.href = redirect; return null; }
    if (Array.isArray(role) ? !role.includes(profile.role) : profile.role !== role) {
      toast('Access denied for your role.', 'error');
      setTimeout(() => location.href = 'index.html', 1500);
      return null;
    }
    return profile;
  }

  function isMockMode() {
    client();
    return _usingMock;
  }

  async function checkConnection() {
    const c = client();
    if (!c) return { ok: false, mode: 'unavailable', error: 'Supabase client failed to initialize' };
    if (_usingMock) return { ok: true, mode: 'mock' };
    try {
      const { error } = await c.from('profiles').select('id').limit(1);
      if (error) return { ok: false, mode: 'supabase', error: error.message };
      return { ok: true, mode: 'supabase' };
    } catch (err) {
      return { ok: false, mode: 'supabase', error: err?.message || 'Unknown connection error' };
    }
  }

  // ---- Paystack ----
  function payWithPaystack({ email, amountNGN, metadata, onSuccess }) {
    if (!global.PaystackPop) { toast('Paystack not loaded', 'error'); return; }
    const handler = global.PaystackPop.setup({
      key: cfg.PAYSTACK_PUBLIC_KEY,
      email,
      amount: amountNGN * 100,
      currency: 'NGN',
      ref: 'GFA-' + Date.now() + '-' + Math.floor(Math.random() * 1e6),
      metadata,
      callback: function (response) {
        // Persist payment; real Supabase should be verified server-side by webhook.
        client().from('payments').insert({
          student_id: metadata.student_id,
          amount: amountNGN,
          term: metadata.term,
          session: metadata.session,
          paystack_ref: response.reference,
          status: _usingMock ? 'paid' : 'pending'
        }).then(({ error }) => {
          if (error) return toast(error.message || 'Could not record payment', 'error');
          onSuccess && onSuccess(response);
        });
      },
      onClose: function () { toast('Payment cancelled.', 'warn'); }
    });
    handler.openIframe();
  }

  // ---- Mock client (for preview without real Supabase creds) ----
  function mockClient() {
    const STORE_KEY = 'ga_mock_store_v1';
    const seed = {
      profiles: [
        { id: 'u-admin', role: 'admin', full_name: 'Admin Office', email: 'admin@greenfield.ng' },
        { id: 'u-teacher', role: 'teacher', full_name: 'Mr. Adewale Johnson', email: 'teacher@greenfield.ng' },
        { id: 'u-student', role: 'student', full_name: 'Chinedu Okoro', email: 'student@greenfield.ng' }
      ],
      students: [
        { id: 's1', profile_id: 'u-student', admission_no: 'GFA/2024/0123', class_id: 'c-jss2a', prefect_title: 'Time Keeper', date_of_birth: '2011-04-12', gender: 'M', guardian_name: 'Mr. Okoro', guardian_phone: '+2348011111111', status: 'active' },
        { id: 's2', profile_id: 'u-s2', admission_no: 'GFA/2024/0124', class_id: 'c-jss2a', prefect_title: null, date_of_birth: '2011-08-21', gender: 'F', guardian_name: 'Mrs. Bello', guardian_phone: '+2348022222222', status: 'active' },
        { id: 's3', profile_id: 'u-s3', admission_no: 'GFA/2024/0125', class_id: 'c-ss1b', prefect_title: 'Head Girl', date_of_birth: '2009-02-03', gender: 'F', guardian_name: 'Dr. Adamu', guardian_phone: '+2348033333333', status: 'active' },
        { id: 's4', profile_id: 'u-s4', admission_no: 'GFA/2024/0126', class_id: 'c-ss1b', prefect_title: 'Head Boy', date_of_birth: '2009-05-19', gender: 'M', guardian_name: 'Mr. Eze', guardian_phone: '+2348044444444', status: 'active' }
      ],
      pending_admissions: [
        { id: 'a1', full_name: 'Aisha Mohammed', email: 'aisha@example.com', class_applying: 'JSS1', guardian_name: 'Alhaji Mohammed', guardian_phone: '+2348055555555', date_of_birth: '2013-01-10', gender: 'F', status: 'pending', created_at: Date.now() - 86400000 },
        { id: 'a2', full_name: 'Tunde Bakare', email: 'tunde@example.com', class_applying: 'SS1', guardian_name: 'Mrs. Bakare', guardian_phone: '+2348066666666', date_of_birth: '2009-07-22', gender: 'M', status: 'pending', created_at: Date.now() - 172800000 }
      ],
      classes: [
        { id: 'c-jss1a', name: 'JSS1A', level: 'JSS', teacher_id: 't1' },
        { id: 'c-jss1b', name: 'JSS1B', level: 'JSS', teacher_id: 't1' },
        { id: 'c-jss2a', name: 'JSS2A', level: 'JSS', teacher_id: 't1' },
        { id: 'c-jss3a', name: 'JSS3A', level: 'JSS', teacher_id: 't2' },
        { id: 'c-ss1a', name: 'SS1A', level: 'SSS', teacher_id: 't2' },
        { id: 'c-ss1b', name: 'SS1B', level: 'SSS', teacher_id: 't1' },
        { id: 'c-ss2a', name: 'SS2A', level: 'SSS', teacher_id: 't2' },
        { id: 'c-ss3a', name: 'SS3A', level: 'SSS', teacher_id: 't2' }
      ],
      subjects: [
        { id: 'sub-eng', name: 'English Language', code: 'ENG' },
        { id: 'sub-mth', name: 'Mathematics', code: 'MTH' },
        { id: 'sub-bio', name: 'Biology', code: 'BIO' },
        { id: 'sub-phy', name: 'Physics', code: 'PHY' },
        { id: 'sub-chm', name: 'Chemistry', code: 'CHM' },
        { id: 'sub-civ', name: 'Civic Education', code: 'CIV' },
        { id: 'sub-eco', name: 'Economics', code: 'ECO' },
        { id: 'sub-lit', name: 'Literature', code: 'LIT' },
        { id: 'sub-his', name: 'History', code: 'HIS' },
        { id: 'sub-yor', name: 'Yoruba', code: 'YOR' }
      ],
      staff: [
        { id: 't1', profile_id: 'u-teacher', full_name: 'Mr. Adewale Johnson', email: 'teacher@greenfield.ng', subject_ids: ['sub-mth', 'sub-phy'], phone: '+2348077777777' },
        { id: 't2', profile_id: 'u-t2', full_name: 'Mrs. Ngozi Okafor', email: 'okafor@greenfield.ng', subject_ids: ['sub-eng', 'sub-lit'], phone: '+2348088888888' }
      ],
      results: [
        { id: 'r1', student_id: 's1', subject_id: 'sub-eng', term: '1st Term', session: '2024/2025', ca_score: 32, exam_score: 48, total: 80, grade: 'A1', remark: 'Excellent' },
        { id: 'r2', student_id: 's1', subject_id: 'sub-mth', term: '1st Term', session: '2024/2025', ca_score: 28, exam_score: 42, total: 70, grade: 'B2', remark: 'Very Good' },
        { id: 'r3', student_id: 's1', subject_id: 'sub-bio', term: '1st Term', session: '2024/2025', ca_score: 30, exam_score: 38, total: 68, grade: 'B3', remark: 'Good' },
        { id: 'r4', student_id: 's1', subject_id: 'sub-civ', term: '1st Term', session: '2024/2025', ca_score: 25, exam_score: 40, total: 65, grade: 'B3', remark: 'Good' },
        { id: 'r5', student_id: 's1', subject_id: 'sub-yor', term: '1st Term', session: '2024/2025', ca_score: 22, exam_score: 35, total: 57, grade: 'C5', remark: 'Credit' }
      ],
      assignments: [
        { id: 'as1', subject_id: 'sub-mth', class_id: 'c-jss2a', title: 'Algebra Worksheet — Linear Equations', file_url: '#', term: '1st Term', session: '2024/2025', due_date: '2025-02-10', uploaded_by: 't1', created_at: Date.now() - 86400000 },
        { id: 'as2', subject_id: 'sub-eng', class_id: 'c-jss2a', title: 'Essay: My Favourite Festival', file_url: '#', term: '1st Term', session: '2024/2025', due_date: '2025-02-18', uploaded_by: 't2', created_at: Date.now() - 43200000 }
      ],
      payments: [
        { id: 'p1', student_id: 's1', amount: 75000, term: '1st Term', session: '2024/2025', paystack_ref: 'GFA-DEMO-1', status: 'paid', created_at: Date.now() - 1000000 },
        { id: 'p2', student_id: 's2', amount: 75000, term: '1st Term', session: '2024/2025', status: 'unpaid', created_at: Date.now() - 2000000 },
        { id: 'p3', student_id: 's3', amount: 75000, term: '1st Term', session: '2024/2025', status: 'paid', paystack_ref: 'GFA-DEMO-3', created_at: Date.now() - 500000 },
        { id: 'p4', student_id: 's4', amount: 75000, term: '1st Term', session: '2024/2025', status: 'unpaid', created_at: Date.now() - 300000 }
      ],
      blog_posts: [
        { id: 'b1', title: 'Greenfield Wins Lagos Inter-School Debate 2025', slug: 'debate-2025', cover: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=900', excerpt: 'Our seniors lifted the trophy after a fierce final against 12 schools.', body: 'Full story...', published_at: Date.now() - 200000000, author: 'Admin' },
        { id: 'b2', title: 'New Science Laboratory Commissioned', slug: 'new-lab', cover: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=900', excerpt: 'A modern fully-equipped lab is now open for SSS students.', body: 'Full story...', published_at: Date.now() - 400000000, author: 'Principal' },
        { id: 'b3', title: '2024/2025 Resumption Date Announced', slug: 'resumption', cover: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=900', excerpt: 'Students should resume on Monday 9th September 2024 by 7:30 a.m.', body: 'Full story...', published_at: Date.now() - 600000000, author: 'Admin' }
      ]
    };
    let store = JSON.parse(localStorage.getItem(STORE_KEY) || 'null') || seed;
    function persist() { localStorage.setItem(STORE_KEY, JSON.stringify(store)); }

    let currentUser = JSON.parse(localStorage.getItem('ga_mock_user') || 'null');

    function table(name) {
      let rows = store[name] || [];
      let filters = [];
      let orderField = null, orderAsc = true;
      const api = {
        select() { return api; },
        eq(col, val) { filters.push(r => r[col] === val); return api; },
        not(col, op, val) {
          if (op === 'is') filters.push(r => r[col] !== val);
          return api;
        },
        in(col, vals) { filters.push(r => vals.includes(r[col])); return api; },
        order(col, opts = {}) { orderField = col; orderAsc = opts.ascending !== false; return api; },
        limit(n) { api._limit = n; return api; },
        single() { api._single = true; return api._exec(); },
        maybeSingle() { api._single = true; return api._exec(); },
        then(resolve) { return api._exec().then(resolve); },
        _exec() {
          let result = (store[name] || []).filter(r => filters.every(f => f(r)));
          if (orderField) result.sort((a,b) => orderAsc ? (a[orderField] > b[orderField] ? 1 : -1) : (a[orderField] < b[orderField] ? 1 : -1));
          if (api._limit) result = result.slice(0, api._limit);
          if (api._single) return Promise.resolve({ data: result[0] || null, error: null });
          return Promise.resolve({ data: result, error: null });
        },
        insert(payload) {
          const arr = Array.isArray(payload) ? payload : [payload];
          arr.forEach(p => { if (!p.id) p.id = name[0] + '-' + Date.now() + '-' + Math.floor(Math.random()*1e4); if (!p.created_at) p.created_at = Date.now(); });
          store[name] = (store[name] || []).concat(arr);
          persist();
          return Promise.resolve({ data: arr, error: null });
        },
        update(payload) {
          return {
            eq(col, val) {
              store[name] = store[name].map(r => r[col] === val ? { ...r, ...payload, updated_at: Date.now() } : r);
              persist();
              return Promise.resolve({ data: store[name].filter(r => r[col] === val), error: null });
            }
          };
        },
        upsert(payload) {
          const arr = Array.isArray(payload) ? payload : [payload];
          arr.forEach(item => {
            const idx = store[name].findIndex(r => r.id === item.id);
            if (idx >= 0) store[name][idx] = { ...store[name][idx], ...item };
            else store[name].push({ ...item, id: item.id || name[0] + '-' + Date.now() + Math.random() });
          });
          persist();
          return Promise.resolve({ data: arr, error: null });
        },
        delete() {
          return {
            eq(col, val) {
              store[name] = store[name].filter(r => r[col] !== val);
              persist();
              return Promise.resolve({ data: null, error: null });
            }
          };
        }
      };
      return api;
    }

    return {
      from: (name) => table(name),
      auth: {
        signInWithPassword: ({ email }) => {
          const profile = store.profiles.find(p => p.email === email);
          if (!profile) return Promise.resolve({ data: null, error: { message: 'No demo account with that email. Try admin@greenfield.ng / teacher@greenfield.ng / student@greenfield.ng' } });
          currentUser = { id: profile.id, email: profile.email };
          localStorage.setItem('ga_mock_user', JSON.stringify(currentUser));
          return Promise.resolve({ data: { user: currentUser, session: { user: currentUser } }, error: null });
        },
        signUp: ({ email, options }) => {
          const id = 'u-' + Date.now();
          const profile = { id, email, role: (options && options.data && options.data.role) || 'student', full_name: (options && options.data && options.data.full_name) || email };
          store.profiles.push(profile);
          persist();
          currentUser = { id, email };
          localStorage.setItem('ga_mock_user', JSON.stringify(currentUser));
          return Promise.resolve({ data: { user: currentUser }, error: null });
        },
        signOut: () => { currentUser = null; localStorage.removeItem('ga_mock_user'); return Promise.resolve({ error: null }); },
        getSession: () => Promise.resolve({ data: { session: currentUser ? { user: currentUser } : null } }),
        getUser: () => Promise.resolve({ data: { user: currentUser }, error: null })
      },
      storage: {
        from: (bucket) => ({
          upload: (path, file) => {
            // Simulate by reading dataURL and stashing — not a real upload
            return new Promise(res => {
              const reader = new FileReader();
              reader.onload = () => res({ data: { path, fullPath: `${bucket}/${path}`, dataUrl: reader.result }, error: null });
              reader.readAsDataURL(file);
            });
          },
          getPublicUrl: (path) => ({ data: { publicUrl: '#mock-storage/' + bucket + '/' + path } })
        })
      }
    };
  }

  // ---- Expose ----
  global.GA = {
    cfg, client, gradeOf, toast,
    signIn, signUp, signOut, getSession, getProfile, requireRole,
    payWithPaystack, isMockMode, checkConnection
  };
})(window);
