// Greenfield Academy — Student Portal logic
(async function () {
  const c = GA.client();
  if (!c) return;
  const conn = await GA.checkConnection();
  if (!conn.ok) GA.toast('Supabase connection issue: ' + (conn.error || 'unknown error'), 'error');

  // Always bind logout early, even if later flows return early.
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await GA.signOut('../login.html');
    });
  }

  // Require student role
  const profile = await GA.requireRole('student', '../login.html');
  if (!profile) return;

  // Get student record (with self-heal auto-link if missing)
  let { data: student } = await c.from('students').select('*').eq('profile_id', profile.id).maybeSingle();
  if (!student) {
    try {
      // Attempt to recover from approved admission via SECURITY DEFINER RPC.
      const rpcRes = await c.rpc('verify_approved_admission_by_email', {
        p_email: (profile.email || '').toLowerCase()
      });
      const pendingAdmission = Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data;

      if (pendingAdmission) {
        const admissionNo = pendingAdmission.admission_no || pendingAdmission.id || null;
        const { data: existingByAdmission } = admissionNo
          ? await c.from('students').select('*').eq('admission_no', admissionNo).maybeSingle()
          : { data: null };

        if (existingByAdmission && !existingByAdmission.profile_id) {
          await c.from('students').update({ profile_id: profile.id }).eq('id', existingByAdmission.id);
        } else if (!existingByAdmission) {
          await c.from('students').insert({
            profile_id: profile.id,
            admission_no: admissionNo,
            class_id: pendingAdmission.assigned_class_id || null,
            date_of_birth: pendingAdmission.date_of_birth || null,
            gender: pendingAdmission.gender || null,
            guardian_name: pendingAdmission.guardian_name || null,
            guardian_phone: pendingAdmission.guardian_phone || null,
            portal_student_id: pendingAdmission.portal_student_id || null,
            admitted_at: pendingAdmission.approved_at || new Date().toISOString(),
            school_name: GA.cfg.SCHOOL_NAME,
            current_term: GA.cfg.CURRENT_TERM,
            current_session: GA.cfg.CURRENT_SESSION,
            class_fee: GA.cfg.TERM_FEE_NGN,
            status: 'active'
          });
        }

        const reloadStudent = await c.from('students').select('*').eq('profile_id', profile.id).maybeSingle();
        student = reloadStudent.data || null;
      }
    } catch (e) {
      console.warn('Auto-link student recovery failed:', e?.message || e);
    }
  }

  if (!student) {
    document.querySelector('.dash-main').innerHTML = `
      <div class="panel" style="text-align:center; padding:3rem;">
        <h2 style="color:var(--green-900);">Awaiting Admission Approval</h2>
        <p style="color:var(--gray-500); margin-top:1rem;">Your account has been created, but your admission record has not yet been finalized by the admin office.</p>
      </div>`;
    return;
  }

  const { data: classRow } = await c.from('classes').select('*').eq('id', student.class_id).maybeSingle();
  const { data: subjectsData } = await c.from('subjects').select('*').order('name');
  const subjects = subjectsData || [];
  const subjectMap = Object.fromEntries((subjects || []).map(s => [s.id, s]));

  // Header user
  document.getElementById('user-name').textContent = profile.full_name;
  document.getElementById('user-avatar').textContent = (profile.full_name || 'S')[0];
  document.getElementById('user-meta').textContent = (classRow?.name || 'Student') + ' · ' + (student.admission_no || '');

  // KPI
  document.getElementById('kpi-class').textContent = classRow?.name || '—';
  document.getElementById('kpi-prefect').textContent = student.prefect_title || 'Student';
  document.getElementById('dash-term-label').textContent = `${GA.cfg.CURRENT_TERM} · ${GA.cfg.CURRENT_SESSION}`;

  // Fee status (current term)
  async function feeStatus(term, session) {
    const { data: pays, error } = await c.from('payments').select('*').eq('student_id', student.id);
    if (error) {
      GA.toast(error.message, 'error');
      return { paid: false, payment: null, all: [] };
    }
    const match = (pays || []).find(p => p.term === term && p.session === session);
    return { paid: match && match.status === 'paid', payment: match, all: pays || [] };
  }
  const fs = await feeStatus(GA.cfg.CURRENT_TERM, GA.cfg.CURRENT_SESSION);
  const feeKpi = document.getElementById('kpi-fee');
  feeKpi.innerHTML = fs.paid
    ? '<span class="badge badge-paid">Paid</span>'
    : '<span class="badge badge-unpaid">Unpaid</span>';

  // Results loader
  async function loadResults(term, session) {
    const { data: results } = await c.from('results').select('*').eq('student_id', student.id).eq('term', term).eq('session', session);
    return results || [];
  }
  const dashResults = await loadResults(GA.cfg.CURRENT_TERM, GA.cfg.CURRENT_SESSION);
  const tBody = document.querySelector('#recent-results tbody');
  if (!dashResults.length) {
    tBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--gray-500);">No results published yet.</td></tr>';
    document.getElementById('kpi-avg').textContent = '—';
  } else {
    tBody.innerHTML = dashResults.map(r => `
      <tr>
        <td>${subjectMap[r.subject_id]?.name || '—'}</td>
        <td>${r.ca_score ?? ''}</td>
        <td>${r.exam_score ?? ''}</td>
        <td><b>${r.total ?? ''}</b></td>
        <td><span class="badge badge-info">${r.grade || ''}</span></td>
        <td>${r.remark || ''}</td>
      </tr>`).join('');
    const avg = (dashResults.reduce((s, r) => s + (r.total || 0), 0) / dashResults.length).toFixed(1);
    document.getElementById('kpi-avg').textContent = avg + '%';
  }

  // Assignments
  const { data: asgRaw } = await c.from('assignments').select('*').eq('class_id', student.class_id).order('created_at', { ascending: false });
  const assignments = asgRaw || [];
  const recBody = document.querySelector('#recent-assignments tbody');
  recBody.innerHTML = assignments.slice(0, 5).map(a => `
    <tr>
      <td>${a.title}</td>
      <td>${subjectMap[a.subject_id]?.name || '—'}</td>
      <td>${a.due_date || ''}</td>
      <td><a class="btn btn-ghost btn-sm" href="${a.file_url || '#'}" target="_blank"><i class="fa-solid fa-download"></i> Download</a></td>
    </tr>`).join('') || '<tr><td colspan="4" style="text-align:center; color:var(--gray-500);">No assignments yet.</td></tr>';

  async function renderDashboardBroadcasts() {
    const holder = document.getElementById('student-broadcasts');
    if (!holder) return;
    const { data, error } = await c
      .from('broadcast_messages')
      .select('*')
      .in('audience', ['all', 'students'])
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) {
      holder.innerHTML = `<div style="color:var(--red-500); font-size:.9rem;">${error.message}</div>`;
      return;
    }
    holder.innerHTML = (data || []).length ? data.map(item => `
      <article style="border:1px solid var(--gray-200); border-radius:10px; padding:.85rem 1rem; background:#fff;">
        <div style="display:flex; justify-content:space-between; gap:.5rem; align-items:center; margin-bottom:.35rem;">
          <strong style="color:var(--green-900);">${item.title}</strong>
          <span class="badge badge-info">${item.audience}</span>
        </div>
        <p style="margin:0; color:var(--gray-700); font-size:.92rem;">${item.message}</p>
        <div style="margin-top:.4rem; color:var(--gray-500); font-size:.78rem;">${item.created_at ? new Date(item.created_at).toLocaleString() : ''}</div>
      </article>
    `).join('') : '<div style="color:var(--gray-500);">No broadcast messages yet.</div>';
  }
  renderDashboardBroadcasts();
  if (typeof c.channel === 'function') {
    c.channel('student-broadcasts-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'broadcast_messages' }, () => {
        renderDashboardBroadcasts();
      })
      .subscribe();
  }

  // ---- View routing (single-page tabs) ----
  const validViews = ['dashboard', 'profile', 'fees', 'results', 'assignments', 'documents', 'admission', 'slip'];

  function setView(v, syncHash = true) {
    const view = validViews.includes(v) ? v : 'dashboard';
    const activeNav = document.querySelector(`.dash-nav a[data-view="${view}"]`);

    document.querySelectorAll('.dash-nav a').forEach(a => a.classList.toggle('active', a.dataset.view === view));
    document.querySelectorAll('[data-view-panel]').forEach(p => p.hidden = p.dataset.viewPanel !== view);
    document.getElementById('view-title').textContent = activeNav ? activeNav.textContent.trim() : 'Dashboard';
    document.getElementById('sidebar').classList.remove('open');

    if (syncHash && location.hash !== `#${view}`) {
      history.replaceState(null, '', `#${view}`);
    }

    if (view === 'profile') renderProfile();
    if (view === 'fees') renderFees();
    if (view === 'results') renderResults();
    if (view === 'assignments') renderAssignments();
    if (view === 'documents') renderDocuments();
    if (view === 'admission') renderAdmissionLetter();
    if (view === 'slip') renderSlip();
  }

  document.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      setView(el.dataset.view);
    });
  });

  window.addEventListener('hashchange', () => {
    const next = (location.hash || '').replace('#', '');
    if (next) setView(next, false);
  });

  // ---- Profile ----
  function renderProfile() {
    const body = document.getElementById('profile-body');
    const fields = [
      ['Full Name', profile.full_name],
      ['Admission No.', student.admission_no],
      ['Portal Student ID', student.portal_student_id || '-'],
      ['Email', profile.email],
      ['Class', classRow?.name],
      ['School', student.school_name || GA.cfg.SCHOOL_NAME],
      ['Current Term', student.current_term || GA.cfg.CURRENT_TERM],
      ['Current Session', student.current_session || GA.cfg.CURRENT_SESSION],
      ['Class Fee', 'NGN ' + Number(student.class_fee ?? GA.cfg.TERM_FEE_NGN).toLocaleString()],
      ['Prefect Title', student.prefect_title || '-'],
      ['Date of Birth', student.date_of_birth || '-'],
      ['Gender', student.gender === 'M' ? 'Male' : student.gender === 'F' ? 'Female' : '-'],
      ['Guardian', student.guardian_name || '-'],
      ['Guardian Phone', student.guardian_phone || '-'],
      ['Status', `<span class="badge badge-paid">${student.status || 'active'}</span>`]
    ];
    const cards = fields.map(([k, v]) => `
      <div style="background:var(--cream-50); padding:1rem 1.25rem; border-radius:10px;">
        <div style="font-size:.8rem; color:var(--gray-500); text-transform:uppercase; letter-spacing:.05em;">${k}</div>
        <div style="font-weight:600; color:var(--green-900); margin-top:.25rem;">${v ?? '-'}</div>
      </div>`).join('');

    body.innerHTML = `
      ${cards}
      <div style="grid-column:1/-1; background:#fff; border:1px solid var(--gray-200); border-radius:12px; padding:1rem;">
        <h3 style="color:var(--green-900); margin-bottom:.8rem;">Update Profile</h3>
        <form id="student-profile-form" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:.8rem;">
          <div class="form-group" style="margin:0;">
            <label>Full Name</label>
            <input id="sp-full-name" value="${profile.full_name || ''}" required />
          </div>
          <div class="form-group" style="margin:0;">
            <label>Guardian Name</label>
            <input id="sp-guardian-name" value="${student.guardian_name || ''}" />
          </div>
          <div class="form-group" style="margin:0;">
            <label>Guardian Phone</label>
            <input id="sp-guardian-phone" value="${student.guardian_phone || ''}" />
          </div>
          <div class="form-group" style="margin:0;">
            <label>Date of Birth</label>
            <input id="sp-dob" type="date" value="${student.date_of_birth || ''}" />
          </div>
          <div style="grid-column:1/-1;">
            <button class="btn btn-primary" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save Profile</button>
          </div>
        </form>
      </div>
    `;

    const form = document.getElementById('student-profile-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('sp-full-name').value.trim();
        const guardianName = document.getElementById('sp-guardian-name').value.trim();
        const guardianPhone = document.getElementById('sp-guardian-phone').value.trim();
        const dob = document.getElementById('sp-dob').value || null;
        if (!newName) return GA.toast('Full name is required.', 'warn');

        const { error: profileErr } = await c.from('profiles').update({ full_name: newName }).eq('id', profile.id);
        if (profileErr) return GA.toast(profileErr.message, 'error');

        const { error: studentErr } = await c.from('students').update({
          guardian_name: guardianName || null,
          guardian_phone: guardianPhone || null,
          date_of_birth: dob
        }).eq('id', student.id);
        if (studentErr) return GA.toast(studentErr.message, 'error');

        document.getElementById('user-name').textContent = newName;
        document.getElementById('user-avatar').textContent = (newName || 'S')[0];
        student.guardian_name = guardianName || null;
        student.guardian_phone = guardianPhone || null;
        student.date_of_birth = dob;
        GA.toast('Profile updated successfully.');
      });
    }
  }
// ---- Fees ----
  async function renderFees() {
    const fs2 = await feeStatus(GA.cfg.CURRENT_TERM, GA.cfg.CURRENT_SESSION);
    const summary = document.getElementById('fee-summary');
    
    // Get all fees for this session including admission
    const c = GA.client();
    const { data: allPayments } = await c.from('payments').select('*').eq('student_id', student.id).eq('session', GA.cfg.CURRENT_SESSION);
    const payments = allPayments || [];
    
    // Check for admission fee
    const admissionFee = payments.find(p => p.fee_type === 'admission');
    const admissionPaid = admissionFee && admissionFee.status === 'paid';
    
    summary.innerHTML = `
      <div style="display:grid; gap:1rem; margin-bottom:1.5rem;">
        <!-- Admission Fee Card -->
        <div style="display:flex; flex-wrap:wrap; gap:1.5rem; align-items:center; padding:1.25rem; border-radius:12px; background:${admissionPaid ? '#ecfdf5' : '#fef2f2'}; border-left:4px solid ${admissionPaid ? '#16a34a' : '#ef4444'};">
          <div style="font-size:1rem;">
            <b>Admission Fee</b><br>
            <span style="color:var(--gray-500);">One-time payment</span>
          </div>
          <div style="margin-left:auto;">
            <span style="display:block; text-align:right; font-size:1.25rem; font-weight:700; color:${admissionPaid ? '#16a34a' : '#ef4444'};">₦5,000</span>
            ${admissionPaid
              ? '<span class="badge badge-paid"><i class="fa-solid fa-check"></i> Paid</span>'
              : `<button class="btn btn-primary" id="pay-admission-now" style="font-size:.9rem; margin-top:.5rem;"><i class="fa-solid fa-credit-card"></i> Pay Now</button>`}
          </div>
        </div>

        <!-- Current Term Fee Card -->
        <div style="display:flex; flex-wrap:wrap; gap:1.5rem; align-items:center; padding:1.25rem; border-radius:12px; background:${fs2.paid ? '#ecfdf5' : '#fef2f2'}; border-left:4px solid ${fs2.paid ? '#16a34a' : '#ef4444'};">
          <div style="font-size:1rem;">
            <b>${GA.cfg.CURRENT_TERM} · ${GA.cfg.CURRENT_SESSION}</b><br>
            <span style="color:var(--gray-500);">Tuition fee</span>
          </div>
          <div style="margin-left:auto;">
            <span style="display:block; text-align:right; font-size:1.25rem; font-weight:700; color:${fs2.paid ? '#16a34a' : '#ef4444'};">₦${GA.cfg.TERM_FEE_NGN.toLocaleString()}</span>
            ${fs2.paid
              ? '<span class="badge badge-paid"><i class="fa-solid fa-check"></i> Paid</span>'
              : `<button class="btn btn-primary" id="pay-now" style="font-size:.9rem; margin-top:.5rem;"><i class="fa-solid fa-credit-card"></i> Pay Now</button>`}
          </div>
        </div>
      </div>

      <div class="panel-head" style="margin-top:1.5rem; padding:0;"><h3>Fee History for ${GA.cfg.CURRENT_SESSION}</h3></div>`;

    if (!fs2.paid && document.getElementById('pay-now')) {
      document.getElementById('pay-now').addEventListener('click', () => {
        GA.payWithPaystack({
          email: profile.email,
          amountNGN: GA.cfg.TERM_FEE_NGN,
          metadata: {
            student_id: student.id,
            admission_no: student.admission_no,
            term: GA.cfg.CURRENT_TERM,
            session: GA.cfg.CURRENT_SESSION,
            fee_type: 'tuition'
          },
          onSuccess: () => { const msg = GA.isMockMode() ? 'Payment successful! Reloading...' : 'Payment initiated. Awaiting verification from webhook.'; GA.toast(msg); setTimeout(() => location.reload(), 1000); }
        });
      });
    }

    const admissionPayBtn = document.getElementById('pay-admission-now');
    if (admissionPayBtn) {
      admissionPayBtn.addEventListener('click', payAdmissionFee);
    }

    const body = document.querySelector('#fee-table tbody');
    
    // Prepare display data - show all payments
    const displayPayments = payments.sort((a, b) => {
      const termOrder = { 'Admission': 0, '1st Term': 1, '2nd Term': 2, '3rd Term': 3 };
      return (termOrder[a.term] || 999) - (termOrder[b.term] || 999);
    });

    body.innerHTML = displayPayments.length ? displayPayments.map(p => `
      <tr>
        <td>${p.fee_type === 'admission' ? 'Admission' : p.term}</td>
        <td>${p.session}</td>
        <td>₦${(p.amount || 0).toLocaleString()}</td>
        <td><span class="badge ${p.status === 'paid' ? 'badge-paid' : 'badge-unpaid'}">${p.status}</span></td>
        <td><code style="font-size:.8rem;">${p.paystack_ref ? p.paystack_ref.substring(0, 16) + '...' : '—'}</code></td>
        <td>${p.created_at ? new Date(p.created_at).toLocaleDateString('en-NG') : ''}</td>
      </tr>`).join('') : '<tr><td colspan="6" style="text-align:center; color:var(--gray-500);">No payment records.</td></tr>';
  }

  async function payAdmissionFee() {
    GA.payWithPaystack({
      email: profile.email,
      amountNGN: 5000,
      metadata: {
        student_id: student.id,
        admission_no: student.admission_no,
        term: 'Admission',
        session: GA.cfg.CURRENT_SESSION,
        fee_type: 'admission'
      },
      onSuccess: () => { const msg = GA.isMockMode() ? 'Admission payment successful! Reloading...' : 'Payment initiated. Awaiting verification from webhook.'; GA.toast(msg); setTimeout(() => location.reload(), 1000); }
    });
  }

  // ---- Results ----
  async function renderResults() {
    const term = document.getElementById('result-term').value;
    const session = document.getElementById('result-session').value;
    const fs3 = await feeStatus(term, session);
    const lock = document.getElementById('result-locked');
    const wrap = document.querySelectorAll('.result-tab-content');
    
    if (!fs3.paid) {
      lock.style.display = 'block';
      wrap.forEach(w => w.style.display = 'none');
      return;
    }
    
    lock.style.display = 'none';
    wrap.forEach(w => w.style.display = 'block');

    // Set up tab switching
    document.querySelectorAll('.result-tab-btn').forEach(btn => {
      btn.classList.remove('active');
      btn.style.borderBottomColor = 'transparent';
      btn.style.color = 'var(--gray-600)';
      btn.addEventListener('click', function() {
        const tabName = this.dataset.tab;
        document.querySelectorAll('.result-tab-btn').forEach(b => {
          b.classList.remove('active');
          b.style.borderBottomColor = 'transparent';
          b.style.color = 'var(--gray-600)';
        });
        document.querySelectorAll('.result-tab-content').forEach(t => t.hidden = true);
        this.classList.add('active');
        this.style.borderBottomColor = 'var(--green-600)';
        this.style.color = 'var(--green-700)';
        document.getElementById(tabName).hidden = false;
      });
    });
    
    // Activate first tab
    document.querySelector('.result-tab-btn').classList.add('active');
    document.querySelector('.result-tab-btn').style.borderBottomColor = 'var(--green-600)';
    document.querySelector('.result-tab-btn').style.color = 'var(--green-700)';

    // Load overall results
    const rs = await loadResults(term, session);
    const body = document.querySelector('#result-table tbody');
    body.innerHTML = rs.length ? rs.map(r => `
      <tr>
        <td>${subjectMap[r.subject_id]?.name || '—'}</td>
        <td>${r.ca_score ?? ''}</td>
        <td>${r.exam_score ?? ''}</td>
        <td><b>${r.total ?? ''}</b></td>
        <td><span class="badge badge-info">${r.grade || ''}</span></td>
        <td>${r.remark || ''}</td>
      </tr>`).join('') : '<tr><td colspan="6" style="text-align:center; color:var(--gray-500);">No results yet for this term.</td></tr>';

    // Load assignment marks
    try {
      const { data: assignmentMarks } = await c
        .from('assignment_marks')
        .select('id, assignment_title, score, max_score, term, created_at, subjects(name)')
        .eq('student_id', student.id)
        .eq('term', term)
        .order('created_at', { ascending: false });

      const asgBody = document.querySelector('#assignment-table tbody');
      if (assignmentMarks && assignmentMarks.length) {
        asgBody.innerHTML = assignmentMarks.map(m => {
          const percent = m.max_score ? Math.round((m.score / m.max_score) * 100) : 0;
          return `
            <tr>
              <td>${m.subjects?.name || '—'}</td>
              <td>${m.assignment_title || '—'}</td>
              <td><b>${m.score}</b></td>
              <td>${m.max_score}</td>
              <td><span class="badge badge-info">${percent}%</span></td>
              <td>${new Date(m.created_at).toLocaleDateString()}</td>
            </tr>
          `;
        }).join('');
      } else {
        asgBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--gray-500);">No assignment marks yet.</td></tr>';
      }
    } catch (e) {
      console.warn('Assignment marks load failed:', e);
    }

    // Load exam marks
    try {
      const { data: examMarks } = await c
        .from('exam_marks')
        .select('id, exam_title, score, max_score, exam_date, term, subjects(name)')
        .eq('student_id', student.id)
        .eq('term', term)
        .order('exam_date', { ascending: false });

      const examBody = document.querySelector('#exam-table tbody');
      if (examMarks && examMarks.length) {
        examBody.innerHTML = examMarks.map(m => {
          const percent = m.max_score ? Math.round((m.score / m.max_score) * 100) : 0;
          return `
            <tr>
              <td>${m.subjects?.name || '—'}</td>
              <td>${m.exam_title || '—'}</td>
              <td><b>${m.score}</b></td>
              <td>${m.max_score}</td>
              <td><span class="badge badge-info">${percent}%</span></td>
              <td>${m.exam_date ? new Date(m.exam_date).toLocaleDateString() : '—'}</td>
            </tr>
          `;
        }).join('');
      } else {
        examBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--gray-500);">No exam marks yet.</td></tr>';
      }
    } catch (e) {
      console.warn('Exam marks load failed:', e);
    }

    // Load test marks
    try {
      const { data: testMarks } = await c
        .from('test_marks')
        .select('id, test_title, score, max_score, term, created_at, subjects(name)')
        .eq('student_id', student.id)
        .eq('term', term)
        .order('created_at', { ascending: false });

      const testBody = document.querySelector('#test-table tbody');
      if (testMarks && testMarks.length) {
        testBody.innerHTML = testMarks.map(m => {
          const percent = m.max_score ? Math.round((m.score / m.max_score) * 100) : 0;
          return `
            <tr>
              <td>${m.subjects?.name || '—'}</td>
              <td>${m.test_title || '—'}</td>
              <td><b>${m.score}</b></td>
              <td>${m.max_score}</td>
              <td><span class="badge badge-info">${percent}%</span></td>
              <td>${new Date(m.created_at).toLocaleDateString()}</td>
            </tr>
          `;
        }).join('');
      } else {
        testBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--gray-500);">No test marks yet.</td></tr>';
      }
    } catch (e) {
      console.warn('Test marks load failed:', e);
    }
  }
  document.getElementById('result-term').addEventListener('change', renderResults);
  document.getElementById('result-session').addEventListener('change', renderResults);

  // ---- Assignments ----
  function renderAssignments() {
    const sel = document.getElementById('asg-subject');
    if (sel.children.length <= 1) {
      (subjects || []).forEach(s => {
        const o = document.createElement('option'); o.value = s.id; o.textContent = s.name; sel.appendChild(o);
      });
    }
    const subFilter = sel.value;
    const termFilter = document.getElementById('asg-term').value;
    const list = assignments.filter(a => (!subFilter || a.subject_id === subFilter) && (!termFilter || a.term === termFilter));
    const body = document.querySelector('#asg-table tbody');
    body.innerHTML = list.length ? list.map(a => `
      <tr>
        <td>${a.title}</td>
        <td>${subjectMap[a.subject_id]?.name || '—'}</td>
        <td>${a.term}</td>
        <td>${a.due_date || ''}</td>
        <td><a class="btn btn-primary btn-sm" href="${a.file_url || '#'}" target="_blank"><i class="fa-solid fa-download"></i> Download PDF</a></td>
      </tr>`).join('') : '<tr><td colspan="5" style="text-align:center; color:var(--gray-500);">No assignments match.</td></tr>';
  }
  ['asg-subject', 'asg-term'].forEach(id => document.getElementById(id).addEventListener('change', renderAssignments));

  // ---- Documents Upload ----
  async function renderDocuments() {
    const uploadArea = document.getElementById('documents-upload-area');
    const documentTypes = [
      { id: 'date_of_birth_cert', label: 'Date of Birth Certificate', icon: 'fa-certificate' },
      { id: 'nin_id_card', label: 'NIN ID Card', icon: 'fa-id-card' },
      { id: 'passport', label: 'Passport Photo', icon: 'fa-image' },
      { id: 'birth_cert', label: 'Birth Certificate', icon: 'fa-file-pdf' }
    ];

    uploadArea.innerHTML = documentTypes.map(doc => `
      <div style="border:2px dashed var(--gray-300); border-radius:10px; padding:1.5rem; text-align:center;">
        <i class="fa-solid ${doc.icon}" style="font-size:2rem; color:var(--green-600); margin-bottom:.5rem;"></i>
        <h4 style="color:var(--gray-900); margin-bottom:.25rem;">${doc.label}</h4>
        <p style="color:var(--gray-500); font-size:.9rem; margin-bottom:1rem;">PDF, JPG, PNG (max 5MB)</p>
        <input type="file" id="file-${doc.id}" style="display:none;" accept=".pdf,.jpg,.jpeg,.png" />
        <button class="btn btn-primary" onclick="document.getElementById('file-${doc.id}').click();" style="font-size:.9rem;">
          <i class="fa-solid fa-cloud-arrow-up"></i> Upload
        </button>
        <div id="upload-status-${doc.id}" style="margin-top:.5rem; display:none;"></div>
      </div>
    `).join('');

    // Add file upload handlers
    documentTypes.forEach(doc => {
      const fileInput = document.getElementById(`file-${doc.id}`);
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
          GA.toast('File size exceeds 5MB limit', 'error');
          return;
        }

        await uploadDocument(file, doc.id, doc.label);
      });
    });

    // Load submitted documents
    loadSubmittedDocuments();
  }

  async function uploadDocument(file, docType, docLabel) {
    const statusDiv = document.getElementById(`upload-status-${docType}`);
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = '<span style="color:var(--gray-600);"><i class="fa-solid fa-spinner fa-spin"></i> Uploading...</span>';

    try {
      const c = GA.client();
      if (!c) throw new Error('Supabase not available');

      // Upload to storage
      const filePath = `student-documents/${student.id}/${docType}-${Date.now()}-${file.name}`;
      const { data: storageData, error: storageError } = await c.storage
        .from('student-documents')
        .upload(filePath, file, { upsert: false });

      if (storageError) throw storageError;

      // Get public URL
      const { data: urlData } = c.storage
        .from('student-documents')
        .getPublicUrl(filePath);

      // Save to database
      const { error: dbError } = await c.from('document_uploads').insert({
        student_id: student.id,
        document_type: docType,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        status: 'pending'
      });

      if (dbError) throw dbError;

      GA.toast(`${docLabel} uploaded successfully!`, 'success');
      statusDiv.innerHTML = '<span style="color:var(--green-600);"><i class="fa-solid fa-check-circle"></i> Uploaded</span>';
      
      setTimeout(() => {
        statusDiv.style.display = 'none';
        loadSubmittedDocuments();
      }, 1500);
    } catch (err) {
      GA.toast('Upload failed: ' + (err.message || 'unknown error'), 'error');
      statusDiv.innerHTML = '<span style="color:var(--red-600);"><i class="fa-solid fa-exclamation-circle"></i> Upload failed</span>';
    }
  }

  async function loadSubmittedDocuments() {
    const listDiv = document.getElementById('documents-list');
    
    try {
      const c = GA.client();
      if (!c) throw new Error('Supabase not available');

      const { data: documents, error } = await c
        .from('document_uploads')
        .select('*')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!documents || documents.length === 0) {
        listDiv.innerHTML = '<p style="color:var(--gray-500); text-align:center;">No documents uploaded yet.</p>';
        return;
      }

      listDiv.innerHTML = documents.map(doc => {
        const statusBadgeClass = doc.status === 'verified' ? 'badge-paid' : 
                                 doc.status === 'rejected' ? 'badge-unpaid' : 'badge-info';
        const statusIcon = doc.status === 'verified' ? 'fa-check-circle' :
                          doc.status === 'rejected' ? 'fa-times-circle' : 'fa-hourglass-half';
        
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem; background:var(--gray-50); border-radius:8px; border-left:4px solid var(--green-600);">
            <div>
              <h4 style="margin:0 0 .25rem 0; color:var(--gray-900);">${doc.document_type.replace(/_/g, ' ').toUpperCase()}</h4>
              <small style="color:var(--gray-500);">${doc.file_name} • ${(doc.file_size / 1024).toFixed(0)} KB</small>
              ${doc.rejection_reason ? `<div style="color:var(--red-600); font-size:.85rem; margin-top:.25rem;"><i class="fa-solid fa-exclamation"></i> ${doc.rejection_reason}</div>` : ''}
            </div>
            <div style="display:flex; gap:.5rem; align-items:center;">
              <span class="badge ${statusBadgeClass}"><i class="fa-solid ${statusIcon}"></i> ${doc.status}</span>
              <a href="${doc.file_url}" target="_blank" class="btn btn-ghost btn-sm"><i class="fa-solid fa-external-link"></i></a>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      listDiv.innerHTML = `<p style="color:var(--red-600);">Error loading documents: ${err.message || 'unknown error'}</p>`;
    }
  }

  // ---- Admission Letter ----
  function renderAdmissionLetter() {
    const container = document.getElementById('admission-letter-content');
    if (!container) return;

    container.innerHTML = `
      <div id="admission-letter-sheet" style="background:#fff;border:1px solid var(--gray-200);border-radius:12px;overflow:hidden;">
        <iframe
          title="Admission Letter Preview"
          src="admission-letter.html"
          style="width:100%;min-height:1200px;border:0;background:#fff;"
          loading="lazy"
        ></iframe>
      </div>
    `;
  }

  const printAdmissionBtn = document.getElementById('print-admission-btn');
  if (printAdmissionBtn) {
    printAdmissionBtn.addEventListener('click', () => {
      const win = window.open('admission-letter.html', '_blank');
      if (!win) GA.toast('Please allow popups to print your admission letter.', 'warn');
    });
  }

  const downloadAdmissionBtn = document.getElementById('download-admission-btn');
  if (downloadAdmissionBtn) {
    downloadAdmissionBtn.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = 'admission-letter.html';
      a.target = '_blank';
      a.rel = 'noopener';
      a.click();
    });
  }

  const printStudentIdBtn = document.getElementById('print-student-id-btn');
  if (printStudentIdBtn) {
    printStudentIdBtn.addEventListener('click', () => {
      const win = window.open('id-card.html', '_blank');
      if (!win) GA.toast('Please allow popups to print your ID card.', 'warn');
    });
  }

  // ---- Result Slip ----
  async function renderSlip() {
    const term = document.getElementById('slip-term').value;
    const session = document.getElementById('slip-session').value;
    const fs4 = await feeStatus(term, session);
    const cont = document.getElementById('slip-content');
    if (!fs4.paid) {
      cont.innerHTML = `<div class="panel" style="text-align:center; color:#991b1b; background:#fee2e2;">
        <i class="fa-solid fa-lock" style="font-size:1.5rem;"></i>
        <p>Result slip locked — please pay fees for ${term} ${session}.</p></div>`;
      return;
    }
    const rs = await loadResults(term, session);
    if (!rs.length) {
      cont.innerHTML = `<div class="panel" style="text-align:center; color:var(--gray-500);">No results published for ${term} ${session}.</div>`;
      return;
    }
    const totalSum = rs.reduce((s, r) => s + (r.total || 0), 0);
    const avg = (totalSum / rs.length).toFixed(1);
    const overall = GA.gradeOf(parseFloat(avg));

    cont.innerHTML = `
      <div class="result-slip">
        <div class="slip-header">
          <div style="display:flex; justify-content:center; align-items:center; gap:1rem; margin-bottom:.5rem;">
            <div class="logo-mark" style="width:60px; height:60px; font-size:1.5rem;">G</div>
            <div>
              <div class="school">${GA.cfg.SCHOOL_NAME}</div>
              <div class="motto">"${GA.cfg.SCHOOL_MOTTO}"</div>
              <div class="address">${GA.cfg.SCHOOL_ADDRESS}</div>
            </div>
          </div>
          <h3 style="margin-top:.75rem; color:var(--green-700); letter-spacing:.05em;">STUDENT TERMINAL REPORT</h3>
        </div>
        <div class="slip-meta">
          <div><b>Name:</b> ${profile.full_name}</div>
          <div><b>Admission No.:</b> ${student.admission_no}</div>
          <div><b>Class:</b> ${classRow?.name || ''}</div>
          <div><b>Prefect:</b> ${student.prefect_title || '—'}</div>
          <div><b>Term:</b> ${term}</div>
          <div><b>Session:</b> ${session}</div>
        </div>
        <table class="data" style="margin-bottom:1rem;">
          <thead><tr><th>Subject</th><th>CA (40)</th><th>Exam (60)</th><th>Total (100)</th><th>Grade</th><th>Remark</th></tr></thead>
          <tbody>
            ${rs.map(r => `<tr>
              <td>${subjectMap[r.subject_id]?.name || ''}</td>
              <td>${r.ca_score ?? ''}</td>
              <td>${r.exam_score ?? ''}</td>
              <td><b>${r.total ?? ''}</b></td>
              <td>${r.grade || ''}</td>
              <td>${r.remark || ''}</td>
            </tr>`).join('')}
          </tbody>
          <tfoot>
            <tr style="background:var(--cream-50); font-weight:700;">
              <td>Average / Overall Grade</td>
              <td colspan="2"></td>
              <td>${avg}%</td>
              <td>${overall.grade}</td>
              <td>${overall.remark}</td>
            </tr>
          </tfoot>
        </table>
        <div class="slip-sigs">
          <div class="sig">Class Teacher</div>
          <div class="sig">Principal</div>
          <div class="sig">Parent / Guardian</div>
        </div>
        <p style="margin-top:1rem; font-size:.75rem; color:var(--gray-500); text-align:center;">
          This is a computer-generated report. Generated on ${new Date().toLocaleDateString('en-NG', { day:'numeric', month:'long', year:'numeric' })}.
        </p>
      </div>`;
  }
  ['slip-term', 'slip-session'].forEach(id => document.getElementById(id).addEventListener('change', renderSlip));

  setView((location.hash || '#dashboard').replace('#', ''), false);

})();





