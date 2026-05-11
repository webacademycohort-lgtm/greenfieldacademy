// Greenfield Academy — Admin panel logic
(async function () {
  const c = GA.client();
  const conn = await GA.checkConnection();
  if (!conn.ok) GA.toast('Supabase connection issue: ' + (conn.error || 'unknown error'), 'error');
  const profile = await GA.requireRole('admin', '../login.html');
  if (!profile) return;

  document.getElementById('user-name').textContent = profile.full_name;
  document.getElementById('user-avatar').textContent = (profile.full_name || 'A')[0];

  // Reference data
  const { data: classesData } = await c.from('classes').select('*').order('name');
  const { data: subjectsData } = await c.from('subjects').select('*').order('name');
  const classes = classesData || [];
  const subjects = subjectsData || [];
  const classMap = Object.fromEntries(classes.map(cl => [cl.id, cl]));
  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]));

  // Fill filter selects
  const sClass = document.getElementById('s-class');
  classes.forEach(cl => { const o = document.createElement('option'); o.value = cl.id; o.textContent = cl.name; sClass.appendChild(o); });

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (v) {
      const r = Math.random() * 16 | 0;
      const n = v === 'x' ? r : (r & 0x3 | 0x8);
      return n.toString(16);
    });
  }

  function normalizeAdmission(row, source) {
    const fullName = row.full_name || [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' ').trim();
    const address = row.address || [row.street_address, row.lga, row.state, row.country].filter(Boolean).join(', ');
    return {
      id: row.id,
      _source: source,
      full_name: fullName || 'Unnamed Applicant',
      email: row.email || '',
      class_applying: row.class_applying || '',
      guardian_name: row.guardian_name || '',
      guardian_phone: row.guardian_phone || '',
      date_of_birth: row.date_of_birth || null,
      gender: row.gender || null,
      previous_school: row.previous_school || null,
      address: address || null,
      reference_number: row.reference_number || null,
      admission_no: row.admission_no || null,
      assigned_class_id: row.assigned_class_id || null,
      passport_photo_url: row.passport_photo_url || null,
      status: row.status || 'pending',
      created_at: row.created_at || null
    };
  }

  async function fetchAdmissions(status = 'pending') {
    const sources = ['admission_applications', 'pending_admissions'];
    const list = [];

    for (const source of sources) {
      const query = c.from(source).select('*').order('created_at', { ascending: false });
      const { data, error } = status ? await query.eq('status', status) : await query;
      if (!error && data) {
        data.forEach(item => list.push(normalizeAdmission(item, source)));
      }
    }

    list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return list;
  }

  async function updateAdmissionStatus(admission, status) {
    if (!admission?._source) throw new Error('Admission source is unknown');
    const { error } = await c.from(admission._source).update({ status }).eq('id', admission.id);
    if (error) throw error;
  }

  function resolveDefaultClassId(classApplying) {
    const normalized = (classApplying || '').replace(/\s+/g, '').toUpperCase();
    const match = classes.find(cl => cl.name.replace(/\s+/g, '').toUpperCase().startsWith(normalized));
    return match?.id || classes[0]?.id || '';
  }

  async function generateUniquePortalStudentId() {
    const year = new Date().getFullYear();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const value = `GFA-STU-${year}-${Math.floor(10000 + Math.random() * 90000)}`;
      const { data: exists } = await c.from('students').select('id').eq('portal_student_id', value).maybeSingle();
      if (!exists) return value;
    }
    return `GFA-STU-${year}-${Date.now().toString().slice(-6)}`;
  }

  async function saveParentNotification(payload) {
    const { error } = await c.from('parent_notifications').insert(payload);
    if (error) console.warn('Could not save parent notification:', error.message);
  }

  function admissionLetterHtml({ studentName, admissionNo, className, guardianName }) {
    return `
      <div id="admission-letter-print" style="max-width:960px; width:100%; margin:0 auto; background:white; border-radius:20px; box-shadow:0 25px 45px -12px rgba(0,0,0,0.25); overflow:hidden; border:1px solid #e2e8f0;">
        <div style="padding:2rem 2.2rem; position:relative;">
          <div style="position:absolute; top:0; left:0; width:100%; height:8px; background:linear-gradient(90deg,#008753 0%,#008753 33%,#ffffff 33%,#ffffff 66%,#008753 66%,#008753 100%);"></div>

          <div style="text-align:center; margin-bottom:1.5rem; border-bottom:2px solid #f0f2f5; padding-bottom:1rem;">
            <div style="font-size:1.55rem; font-weight:800; letter-spacing:-0.3px; color:#1e3a5f; text-transform:uppercase;">${GA.cfg.SCHOOL_NAME}</div>
            <div style="font-size:.9rem; color:#2c6e2f; font-weight:500; font-style:italic; margin-top:.2rem;">${GA.cfg.SCHOOL_MOTTO}</div>
            <div style="font-size:.82rem; color:#2d3e50; margin-top:.45rem; line-height:1.4;">${GA.cfg.SCHOOL_ADDRESS}<br>Tel: ${GA.cfg.SCHOOL_PHONE || ''} | Email: ${GA.cfg.SCHOOL_EMAIL || ''}</div>
          </div>

          <div style="display:flex; justify-content:space-between; margin:.8rem 0 1.2rem; font-size:.85rem; border-bottom:1px dashed #ccc; padding-bottom:.6rem; gap:.5rem; flex-wrap:wrap;">
            <span style="font-weight:500; color:#1e3a5f;">Ref: ADM/${admissionNo}</span>
            <span style="font-weight:500; color:#1e3a5f;">Date: ${new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>

          <p style="margin-bottom:.9rem;">Dear ${guardianName || 'Parent/Guardian'},</p>
          <div style="display:inline-block; padding:.2rem 1rem; border-radius:30px; font-size:.75rem; font-weight:700; color:#1e40af; background:#eef2ff; margin-bottom:.7rem;">
            <i class="fa-solid fa-file-signature"></i> OFFER OF PROVISIONAL ADMISSION
          </div>
          <p style="line-height:1.55; margin-bottom:.8rem;">We are pleased to inform you that your ward, <strong>${studentName}</strong>, has been offered provisional admission into <strong>${className}</strong> for the <strong>${GA.cfg.CURRENT_SESSION}</strong> academic session.</p>
          <p style="line-height:1.55; margin-bottom:.8rem;">This admission is subject to completion of registration, documentation, and payment of required fees.</p>
          <p style="line-height:1.55; margin-bottom:.8rem;"><strong><i class="fa-solid fa-thumbtack"></i> Admission Requirements:</strong> Birth certificate, previous school report (if applicable), recent passport photographs, and completed student forms.</p>
          <p style="line-height:1.55; margin-bottom:.8rem;">Please complete acceptance and registration within two weeks to confirm this offer.</p>

          <div style="margin-top:1.6rem; display:flex; justify-content:space-between; flex-wrap:wrap; gap:1.5rem; border-top:1px solid #e2e8f0; padding-top:1.2rem;">
            <div style="text-align:center; flex:1;">
              <div style="margin:1.5rem auto .4rem; width:150px; height:2px; background:#cbd5e1;"></div>
              <div><strong>Principal</strong></div>
              <div style="font-size:.72rem; color:#475569; font-style:italic;">${GA.cfg.SCHOOL_NAME}</div>
            </div>
            <div style="text-align:center; flex:1;">
              <div style="margin:1.5rem auto .4rem; width:150px; height:2px; background:#cbd5e1;"></div>
              <div><strong>Admissions Registrar</strong></div>
              <div style="font-size:.72rem; color:#475569; font-style:italic;">Official Stamp</div>
            </div>
          </div>

          <div style="margin-top:1.3rem; font-size:.7rem; text-align:center; color:#5b6e8a; background:#f9f9fb; padding:.8rem; border-radius:12px;">
            This admission letter can be verified on the school portal.
          </div>
        </div>
      </div>
    `;
  }

  function showAdmissionLetter(admitted) {
    document.getElementById('modal-title').textContent = 'Admission Letter';
    document.getElementById('modal-body').innerHTML = `
      ${admissionLetterHtml(admitted)}
      <div style="display:flex; gap:.75rem; margin-top:1rem;">
        <button class="btn btn-primary" id="print-letter" style="flex:1; justify-content:center;"><i class="fa-solid fa-print"></i> Print Letter</button>
        <button class="btn btn-gold" id="download-letter" style="flex:1; justify-content:center;"><i class="fa-solid fa-download"></i> Download Letter</button>
      </div>
      <div style="display:flex; gap:.75rem; margin-top:.75rem;">
        <button class="btn btn-primary" id="print-id-card" style="flex:1; justify-content:center;"><i class="fa-solid fa-id-card"></i> Print Student ID Card</button>
        <button class="btn btn-gold" id="download-id-card" style="flex:1; justify-content:center;"><i class="fa-solid fa-file-arrow-down"></i> Download ID Card</button>
        <button class="btn btn-ghost" id="close-letter" style="flex:1; justify-content:center;">Close</button>
      </div>
    `;
    document.getElementById('modal').classList.add('active');
    const content = document.getElementById('admission-letter-print')?.outerHTML || '';
    document.getElementById('print-letter').addEventListener('click', () => {
      const win = window.open('', '_blank', 'width=900,height=700');
      if (!win) return GA.toast('Please allow popups to print the admission letter.', 'warn');
      win.document.write(`
        <html><head><title>Admission Letter</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css">
        <link rel="stylesheet" href="../css/style.css">
        <style>body{padding:1.5rem;background:#fff;} .result-slip{max-width:900px;margin:0 auto;}</style>
        </head><body>${content}<script>window.onload=function(){window.print();};<\/script></body></html>
      `);
      win.document.close();
    });
    document.getElementById('download-letter').addEventListener('click', () => {
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Admission Letter</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css"><link rel="stylesheet" href="../css/style.css"></head><body style="padding:1.5rem;background:#fff;">${content}</body></html>`;
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${admitted.studentName.replace(/\s+/g, '_')}_Admission_Letter.html`;
      link.click();
      URL.revokeObjectURL(url);
    });

    const idCardHtml = `
      <div id="student-id-card" style="width:360px;border-radius:18px;overflow:hidden;font-family:Inter,sans-serif;background:#fff; border:1px solid rgba(20,83,45,.22); box-shadow:0 18px 28px -16px rgba(0,0,0,.35);">
        <div style="background:linear-gradient(135deg,#14532d,#16a34a); color:#fff; padding:.8rem 1rem; text-align:center;">
          <div style="font-size:1.05rem; font-weight:800;">${GA.cfg.SCHOOL_NAME}</div>
          <div style="font-size:.68rem; font-style:italic; opacity:.95;">${GA.cfg.SCHOOL_MOTTO}</div>
          <div style="margin-top:.3rem; display:inline-flex; align-items:center; gap:.3rem; background:rgba(255,255,255,.18); padding:.12rem .55rem; border-radius:999px; font-size:.62rem; font-weight:700; text-transform:uppercase;">
            <i class="fa-solid fa-id-card"></i> Student Identity Card
          </div>
        </div>
        <div style="padding:.9rem 1rem;">
          <div style="font-size:.72rem;color:#166534;font-weight:700;text-transform:uppercase;">Student Name</div>
          <div style="font-weight:700;color:#111827;margin-bottom:.4rem;">${admitted.studentName}</div>
          <div style="font-size:.72rem;color:#166534;font-weight:700;text-transform:uppercase;">Admission Number</div>
          <div style="font-weight:600;color:#111827;margin-bottom:.4rem;">${admitted.admissionNo}</div>
          <div style="font-size:.72rem;color:#166534;font-weight:700;text-transform:uppercase;">Portal Student ID</div>
          <div style="font-weight:600;color:#111827;margin-bottom:.4rem;">${admitted.portalStudentId}</div>
          <div style="font-size:.72rem;color:#166534;font-weight:700;text-transform:uppercase;">Class</div>
          <div style="font-weight:600;color:#111827;margin-bottom:.55rem;">${admitted.className}</div>
          <div style="display:flex; justify-content:space-between; font-size:.6rem; color:#6b7280;">
            <span><i class="fa-solid fa-pen"></i> Principal</span>
            <span>Valid: ${new Date().getFullYear()}</span>
          </div>
        </div>
        <div style="background:#fef9e3; color:#92400e; text-align:center; font-size:.62rem; font-weight:700; padding:.45rem; border-top:1px solid #fde68a;">
          Property of ${GA.cfg.SCHOOL_NAME} | Non-transferable
        </div>
      </div>
    `;

    function openPrintableCard() {
      const win = window.open('', '_blank', 'width=500,height=600');
      if (!win) return GA.toast('Please allow popups to print the ID card.', 'warn');
      win.document.write(`<html><head><title>Student ID Card</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css"></head><body style="padding:1.5rem;">${idCardHtml}<script>window.onload=function(){window.print();};<\/script></body></html>`);
      win.document.close();
    }

    document.getElementById('print-id-card').addEventListener('click', openPrintableCard);
    document.getElementById('download-id-card').addEventListener('click', () => {
      const blob = new Blob([`<html><head><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css"></head><body style="padding:1.5rem;">${idCardHtml}</body></html>`], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${admitted.studentName.replace(/\s+/g, '_')}_ID_Card.html`;
      link.click();
      URL.revokeObjectURL(url);
    });
    document.getElementById('close-letter').addEventListener('click', () => {
      document.getElementById('modal').classList.remove('active');
    });
  }

  // ---- KPIs + charts ----
  async function renderOverview() {
    const { data: students } = await c.from('students').select('*').eq('status', 'active');
    const { data: staff } = await c.from('staff').select('*');
    const pending = await fetchAdmissions('pending');
    const { data: payments } = await c.from('payments').select('*');

    document.getElementById('kpi-students').textContent = (students || []).length;
    document.getElementById('kpi-teachers').textContent = (staff || []).length;
    document.getElementById('kpi-pending').textContent = pending.length;
    const unpaid = (payments || []).filter(p => p.status !== 'paid').reduce((s, p) => s + (p.amount || 0), 0);
    document.getElementById('kpi-fees').textContent = '₦' + unpaid.toLocaleString();

    // Fee chart
    const terms = ['1st Term', '2nd Term', '3rd Term'];
    const paidByTerm = terms.map(t => (payments || []).filter(p => p.term === t && p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0));
    const unpaidByTerm = terms.map(t => (payments || []).filter(p => p.term === t && p.status !== 'paid').reduce((s, p) => s + (p.amount || 0), 0));

    if (window._feeChart) window._feeChart.destroy();
    window._feeChart = new Chart(document.getElementById('chart-fees'), {
      type: 'bar',
      data: {
        labels: terms,
        datasets: [
          { label: 'Paid', data: paidByTerm, backgroundColor: '#16a34a' },
          { label: 'Unpaid', data: unpaidByTerm, backgroundColor: '#ef4444' }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: v => '₦' + (v/1000) + 'k' } } } }
    });

    // Class distribution
    const counts = {};
    (students || []).forEach(s => { const n = classMap[s.class_id]?.name || 'Unassigned'; counts[n] = (counts[n] || 0) + 1; });
    if (window._classChart) window._classChart.destroy();
    window._classChart = new Chart(document.getElementById('chart-classes'), {
      type: 'doughnut',
      data: { labels: Object.keys(counts), datasets: [{ data: Object.values(counts), backgroundColor: ['#14532d','#16a34a','#d4a017','#eab308','#3b82f6','#ef4444','#8b5cf6','#0ea5e9'] }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
    });
  }
  renderOverview();

  // ---- View routing ----
  document.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const v = el.dataset.view;
      document.querySelectorAll('.dash-nav a').forEach(a => a.classList.toggle('active', a.dataset.view === v));
      document.querySelectorAll('[data-view-panel]').forEach(p => p.hidden = p.dataset.viewPanel !== v);
      document.getElementById('view-title').textContent = el.textContent.trim();
      document.getElementById('sidebar').classList.remove('open');
      if (v === 'dashboard') renderOverview();
      if (v === 'admissions') renderAdmissions();
      if (v === 'students') renderStudents();
      if (v === 'teachers') renderTeachers();
      if (v === 'teacher-registrations') renderTeacherRegistrations();
      if (v === 'fees') renderFees();
      if (v === 'broadcasts') { renderBroadcasts(); renderParentNotifications(); }
      if (v === 'blog') renderBlog();
    });
  });

  // ---- Admissions ----
  async function renderAdmissions() {
    const statusFilter = document.getElementById('adm-status')?.value ?? 'pending';
    const list = await fetchAdmissions(statusFilter || null);
    const body = document.querySelector('#adm-table tbody');
    body.innerHTML = (list || []).length ? list.map(a => `
      <tr>
        <td><b>${a.full_name}</b><br><small style="color:var(--gray-500);">${a.email || ''}</small></td>
        <td>${a.class_applying}</td>
        <td><span class="badge ${a.status === 'approved' ? 'badge-paid' : (a.status === 'rejected' ? 'badge-unpaid' : 'badge-pending')}">${a.status}</span></td>
        <td>${a.guardian_name || '—'}<br><small style="color:var(--gray-500);">${a.guardian_phone || ''}</small></td>
        <td>${a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}</td>
        <td>
          <button class="btn btn-ghost btn-sm" data-preview="${a.id}"><i class="fa-solid fa-eye"></i></button>
          ${a.status === 'pending' ? `<button class="btn btn-primary btn-sm" data-approve="${a.id}"><i class="fa-solid fa-check"></i> Approve</button>
          <button class="btn btn-danger btn-sm" data-reject="${a.id}"><i class="fa-solid fa-xmark"></i></button>` : ''}
        </td>
      </tr>`).join('') : '<tr><td colspan="6" style="text-align:center; color:var(--gray-500);">No applications found.</td></tr>';

    body.querySelectorAll('[data-preview]').forEach(b => b.addEventListener('click', () => previewAdmissionModal(b.dataset.preview, list)));
    body.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click', () => approveModal(b.dataset.approve, list)));
    body.querySelectorAll('[data-reject]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Reject this application?')) return;
      const target = list.find(item => item.id === b.dataset.reject);
      if (!target) return;
      try {
        await updateAdmissionStatus(target, 'rejected');
      } catch (error) {
        return GA.toast(error.message, 'error');
      }
      GA.toast('Rejected.'); renderAdmissions();
      renderOverview();
    }));
  }
  document.getElementById('adm-status')?.addEventListener('change', renderAdmissions);

  function previewAdmissionModal(id, list) {
    const a = list.find(x => x.id === id);
    if (!a) return;
    document.getElementById('modal-title').textContent = 'Admission Preview';
    document.getElementById('modal-body').innerHTML = `
      <div class="panel" style="margin:0; box-shadow:none;">
        <p><b>Name:</b> ${a.full_name}</p>
        <p><b>Email:</b> ${a.email || '—'}</p>
        <p><b>Class Applying:</b> ${a.class_applying || '—'}</p>
        <p><b>Status:</b> ${a.status}</p>
        <p><b>Guardian:</b> ${a.guardian_name || '—'} (${a.guardian_phone || '—'})</p>
        <p><b>DOB:</b> ${a.date_of_birth || '—'}</p>
        <p><b>Gender:</b> ${a.gender || '—'}</p>
        <p><b>Address:</b> ${a.address || '—'}</p>
        <p><b>Previous School:</b> ${a.previous_school || '—'}</p>
      </div>
      <button class="btn btn-ghost" id="close-preview" style="width:100%; justify-content:center;">Close</button>
    `;
    document.getElementById('modal').classList.add('active');
    document.getElementById('close-preview').addEventListener('click', () => {
      document.getElementById('modal').classList.remove('active');
    });
  }

  function approveModal(id, list) {
    const a = list.find(x => x.id === id);
    if (!a) return;
    document.getElementById('modal-title').textContent = `Approve: ${a.full_name}`;
    document.getElementById('modal-body').innerHTML = `
      <p style="color:var(--gray-500); margin-bottom:1rem;">Assign an admission number and class.</p>
      <div class="form-group"><label>Admission Number *</label><input id="adm-no" value="${a.admission_no || `GFA/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`}" /></div>
      <div class="form-group"><label>Class *</label>
        <select id="adm-class">${classes.map(cl => `<option value="${cl.id}" ${cl.id === resolveDefaultClassId(a.class_applying) ? 'selected' : ''}>${cl.name}</option>`).join('')}</select>
      </div>
      <button class="btn btn-primary" id="adm-confirm" style="width:100%; justify-content:center;"><i class="fa-solid fa-check"></i> Confirm Admission</button>
    `;
    document.getElementById('modal').classList.add('active');
    document.getElementById('adm-confirm').addEventListener('click', async () => {
      const adm = document.getElementById('adm-no').value.trim();
      const cls = document.getElementById('adm-class').value;
      if (!adm || !cls) return GA.toast('Admission number and class are required.', 'warn');

      const { data: existingAdmissionNo } = await c.from('students').select('id').eq('admission_no', adm).maybeSingle();
      if (existingAdmissionNo) return GA.toast('Admission number already exists.', 'warn');
      const portalStudentId = await generateUniquePortalStudentId();
      const updatePayload = {
        status: 'approved',
        admission_no: adm,
        assigned_class_id: cls,
        portal_student_id: portalStudentId,
        approved_at: new Date().toISOString()
      };
      const { error: approvalErr } = await c.from(a._source).update(updatePayload).eq('id', a.id);
      if (approvalErr) return GA.toast(approvalErr.message, 'error');

      await saveParentNotification({
        application_id: a.id,
        student_id: null,
        guardian_name: a.guardian_name || '',
        guardian_phone: a.guardian_phone || '',
        guardian_email: a.email || '',
        channel: 'email',
        subject: 'Admission Approved',
        message: `Congratulations! ${a.full_name} has been offered admission into ${classMap[cls]?.name || 'the assigned class'} at ${GA.cfg.SCHOOL_NAME}. Admission Number: ${adm}. Portal Student ID: ${portalStudentId}.`,
        status: 'queued',
        created_by: profile.id
      });

      GA.toast(`Admitted ${a.full_name}.`);
      renderAdmissions();
      renderOverview();

      showAdmissionLetter({
        studentName: a.full_name,
        admissionNo: adm,
        portalStudentId,
        className: classMap[cls]?.name || 'Assigned Class',
        guardianName: a.guardian_name
      });
    });
  }

  // ---- Students ----
  async function renderStudents() {
    const fc = document.getElementById('s-class').value;
    const search = (document.getElementById('s-search').value || '').toLowerCase();
    const { data: students } = await c.from('students').select('*');
    const { data: profiles } = await c.from('profiles').select('id, full_name, email');
    const profMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
    const list = (students || []).filter(s => (!fc || s.class_id === fc))
      .filter(s => {
        if (!search) return true;
        const name = (profMap[s.profile_id]?.full_name || '').toLowerCase();
        return name.includes(search) || (s.admission_no || '').toLowerCase().includes(search);
      });
    const body = document.querySelector('#s-table tbody');
    body.innerHTML = list.length ? list.map(s => `
      <tr>
        <td><code>${s.admission_no}</code></td>
        <td>${profMap[s.profile_id]?.full_name || '—'}<br><small style="color:var(--gray-500);">${profMap[s.profile_id]?.email || ''}</small></td>
        <td>${classMap[s.class_id]?.name || '—'}</td>
        <td>${s.prefect_title || '—'}</td>
        <td><span class="badge badge-paid">${s.status}</span></td>
        <td>
          <button class="btn btn-ghost btn-sm" data-edit-student="${s.id}"><i class="fa-solid fa-pen"></i> Edit</button>
        </td>
      </tr>`).join('') : '<tr><td colspan="6" style="text-align:center; color:var(--gray-500);">No students.</td></tr>';
    body.querySelectorAll('[data-edit-student]').forEach(b => b.addEventListener('click', () => editStudent(b.dataset.editStudent, students)));
  }
  document.getElementById('s-class').addEventListener('change', renderStudents);
  document.getElementById('s-search').addEventListener('input', renderStudents);

  function editStudent(id, students) {
    const s = students.find(x => x.id === id);
    document.getElementById('modal-title').textContent = 'Edit Student';
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group"><label>Class</label>
        <select id="es-class">${classes.map(cl => `<option value="${cl.id}" ${cl.id===s.class_id?'selected':''}>${cl.name}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Prefect Title</label>
        <select id="es-prefect">
          <option value="">— None —</option>
          <option ${s.prefect_title==='Head Boy'?'selected':''}>Head Boy</option>
          <option ${s.prefect_title==='Head Girl'?'selected':''}>Head Girl</option>
          <option ${s.prefect_title==='Time Keeper'?'selected':''}>Time Keeper</option>
          <option ${s.prefect_title==='Sports Prefect'?'selected':''}>Sports Prefect</option>
          <option ${s.prefect_title==='Library Prefect'?'selected':''}>Library Prefect</option>
        </select>
      </div>
      <button class="btn btn-primary" id="es-save" style="width:100%; justify-content:center;"><i class="fa-solid fa-floppy-disk"></i> Save</button>
    `;
    document.getElementById('modal').classList.add('active');
    document.getElementById('es-save').addEventListener('click', async () => {
      const { error } = await c.from('students').update({
        class_id: document.getElementById('es-class').value,
        prefect_title: document.getElementById('es-prefect').value || null
      }).eq('id', id);
      if (error) return GA.toast(error.message, 'error');
      GA.toast('Student updated.');
      document.getElementById('modal').classList.remove('active');
      renderStudents();
    });
  }

  // ---- Teachers ----
  async function renderTeachers() {
    const { data: staff } = await c.from('staff').select('*');
    const body = document.querySelector('#t-table tbody');
    body.innerHTML = (staff || []).length ? staff.map(t => `
      <tr>
        <td><b>${t.full_name}</b></td>
        <td>${t.email || '—'}</td>
        <td>${(t.subject_ids || []).map(sid => `<span class="badge badge-info">${subjectMap[sid]?.code || ''}</span>`).join(' ')}</td>
        <td>${t.phone || '—'}</td>
        <td><button class="btn btn-ghost btn-sm" data-edit-teacher="${t.id}"><i class="fa-solid fa-pen"></i> Subjects</button></td>
      </tr>`).join('') : '<tr><td colspan="5" style="text-align:center; color:var(--gray-500);">No teachers.</td></tr>';
    body.querySelectorAll('[data-edit-teacher]').forEach(b => b.addEventListener('click', () => editTeacher(b.dataset.editTeacher, staff)));
  }
  function editTeacher(id, staff) {
    const t = staff.find(x => x.id === id);
    document.getElementById('modal-title').textContent = 'Edit Teacher Subjects';
    document.getElementById('modal-body').innerHTML = `
      <p style="color:var(--gray-500); margin-bottom:1rem;">Toggle subjects this teacher will handle.</p>
      <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:.5rem;">
        ${subjects.map(s => `<label style="display:flex; gap:.5rem; align-items:center; padding:.5rem; border:1px solid var(--gray-200); border-radius:8px;">
          <input type="checkbox" value="${s.id}" ${(t.subject_ids||[]).includes(s.id)?'checked':''} class="t-sub" /> ${s.name}
        </label>`).join('')}
      </div>
      <button class="btn btn-primary" id="et-save" style="width:100%; justify-content:center; margin-top:1rem;"><i class="fa-solid fa-floppy-disk"></i> Save</button>
    `;
    document.getElementById('modal').classList.add('active');
    document.getElementById('et-save').addEventListener('click', async () => {
      const ids = Array.from(document.querySelectorAll('.t-sub:checked')).map(i => i.value);
      const { error } = await c.from('staff').update({ subject_ids: ids }).eq('id', id);
      if (error) return GA.toast(error.message, 'error');
      GA.toast('Subjects updated.');
      document.getElementById('modal').classList.remove('active');
      renderTeachers();
    });
  }
  document.getElementById('add-teacher-btn').addEventListener('click', () => {
    document.getElementById('modal-title').textContent = 'Add Teacher';
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group"><label>Full Name *</label><input id="nt-name" required /></div>
      <div class="form-group"><label>Email *</label><input type="email" id="nt-email" required /></div>
      <div class="form-group"><label>Phone</label><input id="nt-phone" /></div>
      <button class="btn btn-primary" id="nt-save" style="width:100%; justify-content:center;"><i class="fa-solid fa-plus"></i> Create</button>
    `;
    document.getElementById('modal').classList.add('active');
    document.getElementById('nt-save').addEventListener('click', async () => {
      const name = document.getElementById('nt-name').value;
      const email = document.getElementById('nt-email').value;
      const phone = document.getElementById('nt-phone').value;
      if (!name || !email) return GA.toast('Name & email required', 'warn');
      const newProfileId = 'u-' + Date.now();
      const { error: profileErr } = await c.from('profiles').upsert({ id: newProfileId, email, full_name: name, role: 'teacher' });
      if (profileErr) return GA.toast(profileErr.message, 'error');
      const { error: staffErr } = await c.from('staff').insert({ profile_id: newProfileId, full_name: name, email, phone, subject_ids: [] });
      if (staffErr) return GA.toast(staffErr.message, 'error');
      GA.toast('Teacher created. Send them an invite email so they can set a password.');
      document.getElementById('modal').classList.remove('active');
      renderTeachers();
    });
  });

  // ---- Teacher Registrations (Pending Approvals) ----
  async function renderTeacherRegistrations() {
    const statusFilter = document.getElementById('tr-status').value;
    const { data: registrations } = await c.from('teacher_registrations').select('*').order('created_at', { ascending: false });
    const list = registrations && statusFilter ? registrations.filter(r => r.status === statusFilter) : registrations || [];
    const body = document.querySelector('#tr-table tbody');
    body.innerHTML = list.length ? list.map(r => `
      <tr>
        <td><b>${r.full_name}</b></td>
        <td>${r.email}</td>
        <td><small>${r.experience || '—'}</small></td>
        <td><small>${r.subjects || '—'}</small></td>
        <td><span class="badge ${r.status === 'pending' ? 'badge-warn' : r.status === 'approved' ? 'badge-paid' : 'badge-unpaid'}">${r.status}</span></td>
        <td><small>${new Date(r.created_at).toLocaleDateString()}</small></td>
        <td><button class="btn btn-ghost btn-sm" data-review-teacher="${r.id}"><i class="fa-solid fa-magnifying-glass"></i> Review</button></td>
      </tr>`).join('') : '<tr><td colspan="7" style="text-align:center; color:var(--gray-500);">No registrations.</td></tr>';
    body.querySelectorAll('[data-review-teacher]').forEach(b => b.addEventListener('click', () => reviewTeacherRegistration(b.dataset.reviewTeacher, list)));
  }

  function reviewTeacherRegistration(registrationId, registrations) {
    const reg = registrations.find(r => r.id === registrationId);
    if (!reg) return;
    
    document.getElementById('modal-title').textContent = 'Review Teacher Application';
    document.getElementById('modal-body').innerHTML = `
      <div style="display:grid; gap:1rem;">
        <div>
          <h4 style="color:var(--green-900); margin-bottom:.5rem;">Personal Information</h4>
          <div style="display:grid; gap:.5rem; font-size:.9rem;">
            <div><span style="font-weight:600; color:var(--gray-700);">Full Name:</span> ${reg.full_name}</div>
            <div><span style="font-weight:600; color:var(--gray-700);">Email:</span> ${reg.email}</div>
            <div><span style="font-weight:600; color:var(--gray-700);">Phone:</span> ${reg.phone || '—'}</div>
          </div>
        </div>
        <div>
          <h4 style="color:var(--green-900); margin-bottom:.5rem;">Professional Details</h4>
          <div style="display:grid; gap:.5rem; font-size:.9rem;">
            <div><span style="font-weight:600; color:var(--gray-700);">Experience:</span> ${reg.experience || '—'}</div>
            <div><span style="font-weight:600; color:var(--gray-700);">Qualification:</span> ${reg.qualification || '—'}</div>
            <div><span style="font-weight:600; color:var(--gray-700);">Subjects:</span> ${reg.subjects || '—'}</div>
            <div><span style="font-weight:600; color:var(--gray-700);">Bio:</span> <p style="margin:.5rem 0; color:var(--gray-600);">${reg.bio || '—'}</p></div>
          </div>
        </div>
        <div>
          <h4 style="color:var(--green-900); margin-bottom:.5rem;">Application Status</h4>
          <div style="padding:.8rem; background:${reg.status === 'pending' ? '#fef3c7' : reg.status === 'approved' ? '#dbeafe' : '#fee2e2'}; border-radius:8px; border-left:4px solid ${reg.status === 'pending' ? '#f59e0b' : reg.status === 'approved' ? '#3b82f6' : '#ef4444'};">
            <span style="font-weight:600; color:${reg.status === 'pending' ? '#b45309' : reg.status === 'approved' ? '#1e40af' : '#991b1b'}; text-transform:uppercase;">${reg.status}</span>
            ${reg.rejected_reason ? `<p style="margin-top:.5rem; font-size:.9rem;">${reg.rejected_reason}</p>` : ''}
          </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:.75rem; ${reg.status !== 'pending' ? 'display:none;' : ''}">
          <button class="btn btn-primary" id="approve-teacher" style="width:100%;"><i class="fa-solid fa-check"></i> Approve Application</button>
          <button class="btn" style="background:#ef4444; color:white; width:100%;" id="reject-teacher"><i class="fa-solid fa-times"></i> Reject Application</button>
        </div>
        ${reg.status === 'approved' ? `
          <div>
            <p style="font-size:.9rem; color:var(--gray-600); margin-bottom:.75rem;">Teacher has been approved. You may now assign subjects from the Teachers section.</p>
          </div>
        ` : ''}
      </div>
    `;
    document.getElementById('modal').classList.add('active');

    if (reg.status === 'pending') {
      document.getElementById('approve-teacher').addEventListener('click', async () => {
        try {
          // Create staff account
          const newProfileId = uuid();
          const { error: profileErr } = await c.from('profiles').insert({
            id: newProfileId,
            email: reg.email,
            full_name: reg.full_name,
            role: 'teacher'
          });
          if (profileErr && !profileErr.message.includes('duplicate')) throw profileErr;

          const { error: staffErr } = await c.from('staff').insert({
            profile_id: newProfileId,
            full_name: reg.full_name,
            email: reg.email,
            phone: reg.phone,
            subject_ids: [],
            registration_id: reg.id
          });
          if (staffErr) throw staffErr;

          // Update registration status
          const { error: updateErr } = await c.from('teacher_registrations').update({
            status: 'approved',
            approved_by: profile.id,
            approved_at: new Date().toISOString()
          }).eq('id', reg.id);
          if (updateErr) throw updateErr;

          GA.toast('Teacher application approved! They can now log in.', 'success');
          document.getElementById('modal').classList.remove('active');
          renderTeacherRegistrations();
        } catch (err) {
          GA.toast('Error approving application: ' + (err?.message || 'unknown error'), 'error');
        }
      });

      document.getElementById('reject-teacher').addEventListener('click', async () => {
        const reason = prompt('Reason for rejection (optional):');
        if (reason === null) return;
        try {
          const { error } = await c.from('teacher_registrations').update({
            status: 'rejected',
            rejected_reason: reason || null,
            approved_by: profile.id,
            approved_at: new Date().toISOString()
          }).eq('id', reg.id);
          if (error) throw error;
          GA.toast('Application rejected.', 'info');
          document.getElementById('modal').classList.remove('active');
          renderTeacherRegistrations();
        } catch (err) {
          GA.toast('Error rejecting application: ' + (err?.message || 'unknown error'), 'error');
        }
      });
    }
  }

  document.getElementById('tr-status')?.addEventListener('change', renderTeacherRegistrations);

  // ---- Fees ----
  async function renderFees() {
    const term = document.getElementById('p-term').value;
    const status = document.getElementById('p-status').value;
    const { data: payments } = await c.from('payments').select('*').order('created_at', { ascending: false });
    const { data: students } = await c.from('students').select('*');
    const { data: profiles } = await c.from('profiles').select('id, full_name');
    const profMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
    const studentMap = Object.fromEntries((students || []).map(s => [s.id, s]));
    const list = (payments || []).filter(p => (!term || p.term === term) && (!status || p.status === status));
    const body = document.querySelector('#p-table tbody');
    body.innerHTML = list.length ? list.map(p => {
      const s = studentMap[p.student_id];
      const pr = s ? profMap[s.profile_id] : null;
      return `<tr>
        <td><code>${s?.admission_no || '—'}</code></td>
        <td>${pr?.full_name || '—'}</td>
        <td>${p.term}</td>
        <td>${p.session}</td>
        <td>₦${(p.amount||0).toLocaleString()}</td>
        <td><span class="badge ${p.status==='paid'?'badge-paid':'badge-unpaid'}">${p.status}</span></td>
        <td><code>${p.paystack_ref || '—'}</code></td>
      </tr>`;
    }).join('') : '<tr><td colspan="7" style="text-align:center; color:var(--gray-500);">No records.</td></tr>';
  }
  ['p-term', 'p-status'].forEach(id => document.getElementById(id).addEventListener('change', renderFees));

  // ---- Broadcasts ----
  const broadcastForm = document.getElementById('broadcast-form');
  if (broadcastForm) {
    broadcastForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const audience = document.getElementById('bc-audience').value;
      const title = document.getElementById('bc-title').value.trim();
      const message = document.getElementById('bc-message').value.trim();
      if (!title || !message) return GA.toast('Title and message are required.', 'warn');
      const { error } = await c.from('broadcast_messages').insert({
        audience,
        title,
        message,
        created_by: profile.id
      });
      if (error) return GA.toast(error.message, 'error');
      GA.toast('Broadcast sent.');
      broadcastForm.reset();
      renderBroadcasts();
    });
  }

  async function renderBroadcasts() {
    const body = document.querySelector('#bc-table tbody');
    if (!body) return;
    const { data, error } = await c.from('broadcast_messages').select('*').order('created_at', { ascending: false }).limit(40);
    if (error) {
      body.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--red-500);">${error.message}</td></tr>`;
      return;
    }
    body.innerHTML = (data || []).length ? data.map(item => `
      <tr>
        <td>${item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</td>
        <td><span class="badge badge-info">${item.audience}</span></td>
        <td><b>${item.title}</b></td>
        <td>${item.message}</td>
      </tr>
    `).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--gray-500);">No broadcasts yet.</td></tr>';
  }

  async function renderParentNotifications() {
    const body = document.querySelector('#parent-notify-table tbody');
    if (!body) return;
    const { data, error } = await c.from('parent_notifications').select('*').order('created_at', { ascending: false }).limit(40);
    if (error) {
      body.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--red-500);">${error.message}</td></tr>`;
      return;
    }
    body.innerHTML = (data || []).length ? data.map(item => `
      <tr>
        <td>${item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</td>
        <td>${item.guardian_name || '—'}<br><small style="color:var(--gray-500);">${item.guardian_phone || item.guardian_email || ''}</small></td>
        <td><span class="badge badge-info">${item.channel || 'portal'}</span></td>
        <td><span class="badge ${item.status === 'sent' ? 'badge-paid' : 'badge-pending'}">${item.status || 'queued'}</span></td>
        <td>${item.message || ''}</td>
      </tr>
    `).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--gray-500);">No parent notifications yet.</td></tr>';
  }

    // ---- Blog CMS ----
  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async function renderBlog() {
    const { data: posts } = await c.from('blog_posts').select('*').order('published_at', { ascending: false });
    const body = document.querySelector('#b-table tbody');
    body.innerHTML = (posts || []).length ? posts.map(p => `
      <tr>
        <td><b>${p.title}</b><br><small style="color:var(--gray-500);">${p.excerpt || ''}</small></td>
        <td>${p.author || '�'}</td>
        <td>${p.published_at ? new Date(p.published_at).toLocaleDateString() : '<span class="badge badge-pending">Draft</span>'}</td>
        <td>
          <button class="btn btn-ghost btn-sm" data-edit-post='${p.id}'><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-danger btn-sm" data-del-post="${p.id}"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`).join('') : '<tr><td colspan="4" style="text-align:center; color:var(--gray-500);">No posts.</td></tr>';

    body.querySelectorAll('[data-edit-post]').forEach(b => b.addEventListener('click', () => postModal(posts.find(x => x.id === b.dataset.editPost))));
    body.querySelectorAll('[data-del-post]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Delete post?')) return;
      const { error } = await c.from('blog_posts').delete().eq('id', b.dataset.delPost);
      if (error) return GA.toast(error.message, 'error');
      GA.toast('Deleted.');
      renderBlog();
    }));
  }
  document.getElementById('new-post-btn').addEventListener('click', () => postModal(null));

  function postModal(p) {
    p = p || {};
    document.getElementById('modal-title').textContent = p.id ? 'Edit Post' : 'New Post';
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group"><label>Title *</label><input id="bp-title" value="${p.title || ''}" /></div>
      <div class="form-group"><label>Slug</label><input id="bp-slug" value="${p.slug || ''}" /></div>
      <div class="form-group"><label>Cover Image URL</label><input id="bp-cover" value="${p.cover || ''}" placeholder="https://..." /></div>
      <div class="form-group"><label>Excerpt</label><textarea id="bp-excerpt" rows="2">${p.excerpt || ''}</textarea></div>
      <div class="form-group"><label>Body *</label><textarea id="bp-body" rows="6">${p.body || ''}</textarea></div>
      <div class="form-group"><label>Author</label><input id="bp-author" value="${p.author || profile.full_name}" /></div>
      <div class="form-group">
        <label style="display:flex; align-items:center; gap:.5rem;">
          <input type="checkbox" id="bp-publish" ${p.published_at ? 'checked' : ''} />
          Publish immediately
        </label>
      </div>
      <div style="display:flex; gap:.75rem;">
        <button class="btn btn-ghost" id="bp-preview" style="flex:1; justify-content:center;"><i class="fa-solid fa-eye"></i> Preview</button>
        <button class="btn btn-primary" id="bp-save" style="flex:1; justify-content:center;"><i class="fa-solid fa-floppy-disk"></i> Save</button>
      </div>
    `;

    document.getElementById('modal').classList.add('active');
    const titleInput = document.getElementById('bp-title');
    const slugInput = document.getElementById('bp-slug');
    if (!p.slug) {
      titleInput.addEventListener('input', () => {
        slugInput.value = slugify(titleInput.value);
      });
    }

    document.getElementById('bp-preview').addEventListener('click', () => {
      const title = document.getElementById('bp-title').value.trim() || 'Untitled post';
      const excerpt = document.getElementById('bp-excerpt').value.trim();
      const bodyText = document.getElementById('bp-body').value.trim();
      const cover = document.getElementById('bp-cover').value.trim() || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=900';
      const author = document.getElementById('bp-author').value.trim() || profile.full_name || 'Admin';
      const win = window.open('', '_blank', 'width=900,height=800');
      if (!win) return GA.toast('Please allow popups for preview.', 'warn');
      win.document.write(`
        <html><head><title>Blog Preview</title><meta charset="utf-8">
        <style>body{font-family:Inter,Segoe UI,sans-serif;margin:0;background:#f8fafc;color:#0f172a;}main{max-width:900px;margin:2rem auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.08);}img{width:100%;height:360px;object-fit:cover;}article{padding:1.5rem 1.75rem;}h1{margin:.3rem 0 1rem;font-size:2rem;}p{line-height:1.65;} .meta{color:#64748b;font-size:.9rem}</style>
        </head><body><main><img src="${cover}" alt=""><article><div class="meta">${new Date().toLocaleDateString()} � ${author}</div><h1>${title}</h1><p><strong>${excerpt}</strong></p><p>${bodyText.replace(/\n/g, '<br>')}</p></article></main></body></html>
      `);
      win.document.close();
    });

    document.getElementById('bp-save').addEventListener('click', async () => {
      const title = document.getElementById('bp-title').value.trim();
      const bodyText = document.getElementById('bp-body').value.trim();
      if (!title || !bodyText) return GA.toast('Title and body are required.', 'warn');

      const slug = slugify(document.getElementById('bp-slug').value) || slugify(title);
      const payload = {
        title,
        slug,
        cover: document.getElementById('bp-cover').value.trim(),
        excerpt: document.getElementById('bp-excerpt').value.trim(),
        body: bodyText,
        author: document.getElementById('bp-author').value.trim(),
        published_at: document.getElementById('bp-publish').checked ? (p.published_at || new Date().toISOString()) : null
      };

      const { data: slugConflict } = await c.from('blog_posts').select('id').eq('slug', slug).maybeSingle();
      if (slugConflict && slugConflict.id !== p.id) return GA.toast('Slug already exists. Use a different one.', 'warn');

      if (p.id) {
        const { error } = await c.from('blog_posts').update(payload).eq('id', p.id);
        if (error) return GA.toast(error.message, 'error');
      } else {
        const { error } = await c.from('blog_posts').insert(payload);
        if (error) return GA.toast(error.message, 'error');
      }

      GA.toast('Saved.');
      document.getElementById('modal').classList.remove('active');
      renderBlog();
    });
  }

  // ---- Teacher Registrations ----
  async function renderTeacherRegistrations() {
    const table = document.querySelector('#tr-table tbody');
    if (!table) return;

    const statusFilter = document.getElementById('tr-status')?.value || 'pending';
    let query = c.from('teacher_registrations').select('*').order('created_at', { ascending: false });
    
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data: registrations, error } = await query;
    if (error) {
      table.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--red-500);">${error.message}</td></tr>`;
      return;
    }

    if (!registrations || registrations.length === 0) {
      table.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--gray-500);">No teacher applications found.</td></tr>`;
      return;
    }

    table.innerHTML = registrations.map(reg => {
      const statusBadge = reg.status === 'pending' ? 'badge-pending' : reg.status === 'approved' ? 'badge-paid' : 'badge-danger';
      const createdDate = reg.created_at ? new Date(reg.created_at).toLocaleDateString() : '—';
      return `
        <tr>
          <td><b>${reg.full_name || '—'}</b></td>
          <td>${reg.email || '—'}</td>
          <td>${reg.experience || '—'}</td>
          <td>${reg.subjects || '—'}</td>
          <td><span class="badge ${statusBadge}">${reg.status || 'pending'}</span></td>
          <td>${createdDate}</td>
          <td>
            <button class="btn btn-ghost btn-sm" data-review-teacher="${reg.id}" title="Review application">
              <i class="fa-solid fa-eye"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Add review button handlers
    table.querySelectorAll('[data-review-teacher]').forEach(btn => {
      btn.addEventListener('click', () => {
        const regId = btn.dataset.reviewTeacher;
        const reg = registrations.find(r => r.id === regId);
        if (reg) reviewTeacherRegistration(reg, registrations);
      });
    });
  }

  function reviewTeacherRegistration(registration, allRegistrations) {
    const modal = document.getElementById('modal');
    if (!modal) {
      GA.toast('Modal not found', 'error');
      return;
    }

    document.getElementById('modal-title').textContent = 'Review Teacher Application';
    
    const statusDisplay = registration.status === 'pending' 
      ? '<span class="badge badge-pending">Awaiting Review</span>'
      : registration.status === 'approved'
      ? '<span class="badge badge-paid">Approved</span>'
      : `<span class="badge badge-danger">Rejected: ${registration.rejected_reason || 'N/A'}</span>`;

    const bioDisplay = registration.bio ? `<p style="color:var(--gray-700); line-height:1.6;">${registration.bio}</p>` : '<p style="color:var(--gray-500);">No bio provided</p>';

    document.getElementById('modal-body').innerHTML = `
      <div style="display:grid; gap:1.5rem;">
        <div>
          <h3 style="margin:0 0 0.5rem; color:var(--gray-900);">Personal Information</h3>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
            <div>
              <label style="font-size:0.85rem; color:var(--gray-600); display:block; margin-bottom:0.25rem;">Full Name</label>
              <p style="margin:0; font-weight:600; color:var(--gray-900);">${registration.full_name || '—'}</p>
            </div>
            <div>
              <label style="font-size:0.85rem; color:var(--gray-600); display:block; margin-bottom:0.25rem;">Email</label>
              <p style="margin:0; font-weight:600; color:var(--gray-900);">${registration.email || '—'}</p>
            </div>
            <div>
              <label style="font-size:0.85rem; color:var(--gray-600); display:block; margin-bottom:0.25rem;">Phone</label>
              <p style="margin:0; font-weight:600; color:var(--gray-900);">${registration.phone || '—'}</p>
            </div>
            <div>
              <label style="font-size:0.85rem; color:var(--gray-600); display:block; margin-bottom:0.25rem;">Status</label>
              <p style="margin:0;">${statusDisplay}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 style="margin:0 0 0.5rem; color:var(--gray-900);">Professional Details</h3>
          <div style="display:grid; gap:1rem;">
            <div>
              <label style="font-size:0.85rem; color:var(--gray-600); display:block; margin-bottom:0.25rem;">Subjects to Teach</label>
              <p style="margin:0; font-weight:600; color:var(--gray-900);">${registration.subjects || '—'}</p>
            </div>
            <div>
              <label style="font-size:0.85rem; color:var(--gray-600); display:block; margin-bottom:0.25rem;">Years of Experience</label>
              <p style="margin:0; font-weight:600; color:var(--gray-900);">${registration.experience || '—'}</p>
            </div>
            <div>
              <label style="font-size:0.85rem; color:var(--gray-600); display:block; margin-bottom:0.25rem;">Qualification</label>
              <p style="margin:0; font-weight:600; color:var(--gray-900);">${registration.qualification || '—'}</p>
            </div>
            <div>
              <label style="font-size:0.85rem; color:var(--gray-600); display:block; margin-bottom:0.25rem;">Bio / Cover Letter</label>
              ${bioDisplay}
            </div>
          </div>
        </div>

        ${registration.status === 'pending' ? `
        <div style="display:flex; gap:1rem; padding-top:1rem; border-top:1px solid var(--gray-300);">
          <button class="btn btn-primary" id="btn-approve-teacher" style="flex:1;">
            <i class="fa-solid fa-check"></i> Approve Teacher
          </button>
          <button class="btn btn-danger" id="btn-reject-teacher" style="flex:1;">
            <i class="fa-solid fa-xmark"></i> Reject Application
          </button>
        </div>
        ` : ''}
      </div>
    `;

    modal.classList.add('active');

    if (registration.status === 'pending') {
      const approveBtn = document.getElementById('btn-approve-teacher');
      const rejectBtn = document.getElementById('btn-reject-teacher');

      approveBtn.addEventListener('click', async () => {
        approveBtn.disabled = true;
        approveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

        try {
          // Create profile
          const profileId = uuid();
          const { error: profileError } = await c.from('profiles').insert({
            id: profileId,
            email: registration.email,
            full_name: registration.full_name,
            role: 'teacher',
            phone: registration.phone
          });

          if (profileError) throw profileError;

          // Create staff record
          const { error: staffError } = await c.from('staff').insert({
            id: uuid(),
            profile_id: profileId,
            subjects: registration.subjects,
            experience_years: registration.experience,
            qualification: registration.qualification,
            bio: registration.bio
          });

          if (staffError) throw staffError;

          // Update registration status
          const { error: updateError } = await c.from('teacher_registrations')
            .update({ 
              status: 'approved',
              approved_by: profile.id,
              approved_at: new Date().toISOString()
            })
            .eq('id', registration.id);

          if (updateError) throw updateError;

          // Send approval email
          try {
            await c.functions.invoke('send-email', {
              body: {
                to: registration.email,
                template: 'teacher-approved',
                data: { name: registration.full_name }
              }
            });
          } catch (e) {
            console.warn('Email send failed (non-critical):', e);
          }

          GA.toast('✓ Teacher approved! Account created and email sent.', 'success');
          modal.classList.remove('active');
          renderTeacherRegistrations();
        } catch (err) {
          GA.toast('Error: ' + (err?.message || 'Unknown error'), 'error');
        } finally {
          approveBtn.disabled = false;
          approveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Approve Teacher';
        }
      });

      rejectBtn.addEventListener('click', () => {
        const reason = prompt('Enter rejection reason (optional):');
        if (reason === null) return; // User cancelled

        rejectBtn.disabled = true;
        rejectBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

        (async () => {
          try {
            const { error } = await c.from('teacher_registrations')
              .update({ 
                status: 'rejected',
                rejected_reason: reason || 'No reason provided'
              })
              .eq('id', registration.id);

            if (error) throw error;

            // Send rejection email
            try {
              await c.functions.invoke('send-email', {
                body: {
                  to: registration.email,
                  template: 'teacher-rejected',
                  data: { name: registration.full_name, reason: reason || 'Please contact the school for details.' }
                }
              });
            } catch (e) {
              console.warn('Email send failed (non-critical):', e);
            }

            GA.toast('✓ Application rejected. Notification email sent.', 'warn');
            modal.classList.remove('active');
            renderTeacherRegistrations();
          } catch (err) {
            GA.toast('Error: ' + (err?.message || 'Unknown error'), 'error');
          } finally {
            rejectBtn.disabled = false;
            rejectBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> Reject Application';
          }
        })();
      });
    }
  }

  // Add status filter listener
  document.getElementById('tr-status')?.addEventListener('change', renderTeacherRegistrations);

  document.getElementById('logout-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    await GA.signOut('../login.html');
  });
})();

