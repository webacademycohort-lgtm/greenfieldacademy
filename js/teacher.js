// Greenfield Academy — Teacher dashboard logic
(async function () {
  const c = GA.client();
  const conn = await GA.checkConnection();
  if (!conn.ok) GA.toast('Supabase connection issue: ' + (conn.error || 'unknown error'), 'error');
  const profile = await GA.requireRole(['teacher', 'admin'], '../login.html');
  if (!profile) return;

  // Resolve staff record
  let { data: staff } = await c.from('staff').select('*').eq('profile_id', profile.id).maybeSingle();
  if (!staff && profile.role === 'admin') {
    // Admin viewing teacher panel — give access to all
    staff = { id: 'admin-view', full_name: profile.full_name, subject_ids: null };
  }
  if (!staff) {
    document.querySelector('.dash-main').innerHTML = `<div class="panel" style="text-align:center; padding:3rem;">
      <h2 style="color:var(--green-900);">Teacher record not yet set up</h2>
      <p style="color:var(--gray-500); margin-top:.5rem;">Please contact the admin office.</p></div>`;
    return;
  }

  document.getElementById('user-name').textContent = profile.full_name;
  document.getElementById('user-avatar').textContent = (profile.full_name || 'T')[0];

  // Load reference data
  const { data: classesData } = await c.from('classes').select('*').order('name');
  const { data: subjectsData } = await c.from('subjects').select('*').order('name');
  const classes = classesData || [];
  const subjects = subjectsData || [];
  const subjectMap = Object.fromEntries((subjects || []).map(s => [s.id, s]));
  const classMap = Object.fromEntries((classes || []).map(cl => [cl.id, cl]));

  // Filter teacher's classes (admin sees all)
  const myClasses = profile.role === 'admin'
    ? (classes || [])
    : (classes || []).filter(cl => cl.teacher_id === staff.id);
  const mySubjects = profile.role === 'admin'
    ? (subjects || [])
    : (subjects || []).filter(s => (staff.subject_ids || []).includes(s.id));

  function fillSelect(sel, arr, valKey, labelKey, placeholder) {
    sel.innerHTML = (placeholder ? `<option value="">${placeholder}</option>` : '') +
      arr.map(x => `<option value="${x[valKey]}">${x[labelKey]}</option>`).join('');
  }
  fillSelect(document.getElementById('r-class'), myClasses, 'id', 'name');
  fillSelect(document.getElementById('r-subject'), mySubjects.length ? mySubjects : (subjects || []), 'id', 'name');
  fillSelect(document.getElementById('a-class'), myClasses, 'id', 'name');
  fillSelect(document.getElementById('a-subject'), mySubjects.length ? mySubjects : (subjects || []), 'id', 'name');
  fillSelect(document.getElementById('f-class'), myClasses, 'id', 'name', 'All Classes');
  fillSelect(document.getElementById('f-subject'), mySubjects.length ? mySubjects : (subjects || []), 'id', 'name', 'All Subjects');
  
  // Marks management select fills
  const mClassSel = document.getElementById('m-class');
  const mSubjectSel = document.getElementById('m-subject');
  const attClassSel = document.getElementById('att-class');
  
  if (mClassSel) fillSelect(mClassSel, myClasses, 'id', 'name', 'Select Class');
  if (mSubjectSel) fillSelect(mSubjectSel, mySubjects.length ? mySubjects : (subjects || []), 'id', 'name', 'Select Subject');
  if (attClassSel) fillSelect(attClassSel, myClasses, 'id', 'name', 'Select Class');

  // KPIs
  document.getElementById('kpi-classes').textContent = myClasses.length;
  document.getElementById('kpi-subjects').textContent = mySubjects.length;
  const { data: myAsg } = await c.from('assignments').select('*').eq('uploaded_by', staff.id);
  document.getElementById('kpi-asg').textContent = (myAsg || []).length;
  const { data: myRes } = await c.from('results').select('id').limit(500);
  document.getElementById('kpi-res').textContent = (myRes || []).length;

  async function renderTeacherBroadcasts() {
    const holder = document.getElementById('teacher-broadcasts');
    if (!holder) return;
    const { data, error } = await c
      .from('broadcast_messages')
      .select('*')
      .in('audience', ['all', 'teachers'])
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) {
      holder.innerHTML = `<div style="color:var(--red-500);">${error.message}</div>`;
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
  renderTeacherBroadcasts();
  if (typeof c.channel === 'function') {
    c.channel('teacher-broadcasts-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'broadcast_messages' }, () => {
        renderTeacherBroadcasts();
      })
      .subscribe();
  }

  // My classes panel
  document.getElementById('my-classes').innerHTML = myClasses.length
    ? myClasses.map(cl => `<div class="kpi-card"><div class="lbl">${cl.level}</div><div class="num">${cl.name}</div></div>`).join('')
    : '<p style="color:var(--gray-500);">No classes assigned.</p>';

  // Profile form
  function renderTeacherProfile() {
    const fullName = document.getElementById('tp-full-name');
    const email = document.getElementById('tp-email');
    const phone = document.getElementById('tp-phone');
    if (!fullName || !email || !phone) return;
    fullName.value = profile.full_name || '';
    email.value = profile.email || '';
    phone.value = staff.phone || '';
  }
  renderTeacherProfile();
  const teacherProfileForm = document.getElementById('teacher-profile-form');
  if (teacherProfileForm) {
    teacherProfileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newName = document.getElementById('tp-full-name').value.trim();
      const newPhone = document.getElementById('tp-phone').value.trim();
      if (!newName) return GA.toast('Full name is required.', 'warn');

      const { error: profileErr } = await c.from('profiles').update({ full_name: newName }).eq('id', profile.id);
      if (profileErr) return GA.toast(profileErr.message, 'error');

      if (staff.id !== 'admin-view') {
        const { error: staffErr } = await c.from('staff').update({ full_name: newName, phone: newPhone || null }).eq('id', staff.id);
        if (staffErr) return GA.toast(staffErr.message, 'error');
      }

      document.getElementById('user-name').textContent = newName;
      document.getElementById('user-avatar').textContent = (newName || 'T')[0];
      GA.toast('Profile updated successfully.');
    });
  }

  // ---- View routing ----
  document.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const v = el.dataset.view;
      document.querySelectorAll('.dash-nav a').forEach(a => a.classList.toggle('active', a.dataset.view === v));
      document.querySelectorAll('[data-view-panel]').forEach(p => p.hidden = p.dataset.viewPanel !== v);
      document.getElementById('view-title').textContent = el.textContent.trim();
      document.getElementById('sidebar').classList.remove('open');
      if (v === 'profile') renderTeacherProfile();
      if (v === 'assignments') renderAsgList();
      if (v === 'marks') renderMarksManagement();
      if (v === 'attendance') renderAttendance();
    });
  });

  // ---- Bulk result entry ----
  let resStudents = [];
  document.getElementById('r-load').addEventListener('click', loadResults);
  async function loadResults() {
    const classId = document.getElementById('r-class').value;
    const subId = document.getElementById('r-subject').value;
    const term = document.getElementById('r-term').value;
    const session = document.getElementById('r-session').value;
    if (!classId || !subId) return GA.toast('Pick class and subject', 'warn');

    const { data: roster } = await c.from('students').select('*').eq('class_id', classId);
    const studentIds = (roster || []).map(s => s.id);

    // Pull names from profiles
    const { data: profiles } = await c.from('profiles').select('id,full_name').in('id', (roster || []).map(s => s.profile_id));
    const profMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]));

    // Existing results
    let existing = [];
    if (studentIds.length) {
      const { data: rs } = await c.from('results').select('*').in('student_id', studentIds).eq('subject_id', subId).eq('term', term).eq('session', session);
      existing = rs || [];
    }
    const exMap = Object.fromEntries(existing.map(r => [r.student_id, r]));

    resStudents = (roster || []).map((s, i) => ({
      idx: i + 1,
      student_id: s.id,
      adm: s.admission_no,
      name: profMap[s.profile_id] || '—',
      ca: exMap[s.id]?.ca_score ?? '',
      exam: exMap[s.id]?.exam_score ?? '',
      _existing_id: exMap[s.id]?.id
    }));

    const body = document.querySelector('#r-table tbody');
    if (!resStudents.length) {
      body.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--gray-500);">No students in this class.</td></tr>';
      return;
    }
    body.innerHTML = resStudents.map(s => `
      <tr data-sid="${s.student_id}">
        <td>${s.idx}</td>
        <td><code>${s.adm}</code></td>
        <td>${s.name}</td>
        <td><input type="number" min="0" max="40" class="cell ca" value="${s.ca}" /></td>
        <td><input type="number" min="0" max="60" class="cell exam" value="${s.exam}" /></td>
        <td class="total"><b>${(parseFloat(s.ca || 0) + parseFloat(s.exam || 0)) || ''}</b></td>
        <td class="grade">${(s.ca !== '' && s.exam !== '') ? GA.gradeOf(parseFloat(s.ca||0)+parseFloat(s.exam||0)).grade : ''}</td>
      </tr>`).join('');

    body.querySelectorAll('tr').forEach(tr => {
      const ca = tr.querySelector('.ca');
      const ex = tr.querySelector('.exam');
      [ca, ex].forEach(inp => inp.addEventListener('input', () => {
        const tot = (parseFloat(ca.value || 0) + parseFloat(ex.value || 0));
        tr.querySelector('.total').innerHTML = tot ? `<b>${tot}</b>` : '';
        tr.querySelector('.grade').textContent = (ca.value !== '' && ex.value !== '') ? GA.gradeOf(tot).grade : '';
      }));
    });
  }

  document.getElementById('r-save').addEventListener('click', async () => {
    const subId = document.getElementById('r-subject').value;
    const term = document.getElementById('r-term').value;
    const session = document.getElementById('r-session').value;
    if (!resStudents.length) return GA.toast('Load a class first', 'warn');
    const rows = [];
    document.querySelectorAll('#r-table tbody tr').forEach(tr => {
      const ca = parseFloat(tr.querySelector('.ca').value);
      const exam = parseFloat(tr.querySelector('.exam').value);
      const total = (isNaN(ca) ? 0 : ca) + (isNaN(exam) ? 0 : exam);
      const g = GA.gradeOf(total);
      rows.push({
        student_id: tr.dataset.sid,
        subject_id: subId,
        term, session,
        ca_score: isNaN(ca) ? null : ca,
        exam_score: isNaN(exam) ? null : exam,
        total,
        grade: g.grade,
        remark: g.remark
      });
    });
    // Upsert via delete-then-insert (for the simple demo). Real Supabase uses .upsert with composite key.
    for (const r of rows) {
      // Try update first, fallback to insert
      const { data: existing } = await c.from('results').select('id').eq('student_id', r.student_id).eq('subject_id', r.subject_id).eq('term', r.term).eq('session', r.session).maybeSingle();
      if (existing && existing.id) {
        const { error } = await c.from('results').update(r).eq('id', existing.id);
        if (error) return GA.toast(error.message, 'error');
      } else {
        const { error } = await c.from('results').insert(r);
        if (error) return GA.toast(error.message, 'error');
      }
    }
    GA.toast(`Saved ${rows.length} results.`);
  });

  // ---- Assignments ----
  document.getElementById('asg-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const fd = new FormData(f);
    const file = document.getElementById('a-file').files[0];
    let fileUrl = '#';
    if (file) {
      try {
        const path = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const { data: up, error } = await c.storage.from('assignments').upload(path, file);
        if (!error) {
          const pub = c.storage.from('assignments').getPublicUrl(up.path);
          fileUrl = pub.data.publicUrl;
        }
      } catch (err) { console.warn('Storage fallback', err); }
    }
    const payload = {
      title: fd.get('title'),
      class_id: fd.get('class_id'),
      subject_id: fd.get('subject_id'),
      term: fd.get('term'),
      session: fd.get('session'),
      due_date: fd.get('due_date') || null,
      file_url: fileUrl,
      uploaded_by: staff.id
    };
    const { error } = await c.from('assignments').insert(payload);
    if (error) return GA.toast(error.message, 'error');
    GA.toast('Assignment uploaded.');
    f.reset();
    renderAsgList();
  });

  async function renderAsgList() {
    const fc = document.getElementById('f-class').value;
    const fs = document.getElementById('f-subject').value;
    const ft = document.getElementById('f-term').value;
    let q = c.from('assignments').select('*').order('created_at', { ascending: false });
    if (profile.role !== 'admin') q = q.eq('uploaded_by', staff.id);
    const { data } = await q;
    const list = (data || []).filter(a =>
      (!fc || a.class_id === fc) &&
      (!fs || a.subject_id === fs) &&
      (!ft || a.term === ft)
    );
    const body = document.querySelector('#asg-list tbody');
    body.innerHTML = list.length ? list.map(a => `
      <tr>
        <td>${a.title}</td>
        <td>${classMap[a.class_id]?.name || '—'}</td>
        <td>${subjectMap[a.subject_id]?.name || '—'}</td>
        <td>${a.term}</td>
        <td>${a.due_date || ''}</td>
        <td>
          <a href="${a.file_url || '#'}" target="_blank" class="btn btn-ghost btn-sm"><i class="fa-solid fa-eye"></i></a>
          <button class="btn btn-danger btn-sm" data-del="${a.id}"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`).join('') : '<tr><td colspan="6" style="text-align:center; color:var(--gray-500);">No assignments yet.</td></tr>';
    body.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Delete this assignment?')) return;
      const { error } = await c.from('assignments').delete().eq('id', b.dataset.del);
      if (error) return GA.toast(error.message, 'error');
      GA.toast('Deleted.'); renderAsgList();
    }));
  }
  ['f-class', 'f-subject', 'f-term'].forEach(id => document.getElementById(id).addEventListener('change', renderAsgList));

  // ---- Marks Management ----
  async function renderMarksManagement() {
    const classId = document.getElementById('m-class').value;
    const subjectId = document.getElementById('m-subject').value;
    
    if (!classId || !subjectId) {
      GA.toast('Please select a class and subject', 'warn');
      return;
    }

    // Get students in this class
    const { data: students, error: studError } = await c
      .from('students')
      .select('id, first_name, last_name, admission_no')
      .eq('class_id', classId)
      .order('last_name');

    if (studError || !students) {
      GA.toast('Could not load students', 'error');
      return;
    }

    // Render assignment marks form
    const assignmentList = document.getElementById('assignment-marks-list');
    assignmentList.innerHTML = students.map(s => `
      <div style="display:grid; grid-template-columns:1fr 120px; gap:1rem; align-items:center; padding:0.75rem; background:var(--gray-100); border-radius:8px;">
        <div>
          <strong>${s.last_name}, ${s.first_name}</strong>
          <br><small style="color:var(--gray-600);">ID: ${s.admission_no || s.id.substring(0, 8)}</small>
        </div>
        <input class="assignment-score" data-student="${s.id}" type="number" min="0" step="0.5" placeholder="Score" style="padding:0.5rem; border:1px solid var(--gray-300); border-radius:6px;" />
      </div>
    `).join('');

    // Render exam marks form
    const examList = document.getElementById('exam-marks-list');
    examList.innerHTML = students.map(s => `
      <div style="display:grid; grid-template-columns:1fr 120px; gap:1rem; align-items:center; padding:0.75rem; background:var(--gray-100); border-radius:8px;">
        <div>
          <strong>${s.last_name}, ${s.first_name}</strong>
          <br><small style="color:var(--gray-600);">ID: ${s.admission_no || s.id.substring(0, 8)}</small>
        </div>
        <input class="exam-score" data-student="${s.id}" type="number" min="0" step="0.5" placeholder="Score" style="padding:0.5rem; border:1px solid var(--gray-300); border-radius:6px;" />
      </div>
    `).join('');

    // Render test marks form
    const testList = document.getElementById('test-marks-list');
    testList.innerHTML = students.map(s => `
      <div style="display:grid; grid-template-columns:1fr 120px; gap:1rem; align-items:center; padding:0.75rem; background:var(--gray-100); border-radius:8px;">
        <div>
          <strong>${s.last_name}, ${s.first_name}</strong>
          <br><small style="color:var(--gray-600);">ID: ${s.admission_no || s.id.substring(0, 8)}</small>
        </div>
        <input class="test-score" data-student="${s.id}" type="number" min="0" step="0.5" placeholder="Score" style="padding:0.5rem; border:1px solid var(--gray-300); border-radius:6px;" />
      </div>
    `).join('');

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
      btn.addEventListener('click', function() {
        const tabName = this.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.hidden = true);
        this.classList.add('active');
        document.getElementById(tabName).hidden = false;
        this.style.borderBottomColor = 'var(--green-600)';
        this.style.color = 'var(--green-700)';
      });
    });
    document.querySelector('.tab-btn').classList.add('active');
    document.querySelector('.tab-btn').style.borderBottomColor = 'var(--green-600)';
    document.querySelector('.tab-btn').style.color = 'var(--green-700)';

    // Assignment form submission
    document.getElementById('assignment-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('a-title').value;
      const total = parseFloat(document.getElementById('a-total').value);
      const term = document.getElementById('a-term').value;
      const notes = document.getElementById('a-notes').value;

      const marks = Array.from(document.querySelectorAll('.assignment-score')).map(inp => ({
        student_id: inp.dataset.student,
        score: parseFloat(inp.value) || 0,
        max_score: total
      })).filter(m => m.score >= 0);

      if (!marks.length) {
        GA.toast('Please enter at least one score', 'warn');
        return;
      }

      try {
        const payload = marks.map(m => ({
          teacher_id: profile.id,
          student_id: m.student_id,
          subject_id: subjectId,
          class_id: classId,
          assignment_title: title,
          score: m.score,
          max_score: m.max_score,
          term,
          session: new Date().getFullYear().toString(),
          notes
        }));

        const { error } = await c.from('assignment_marks').insert(payload);
        if (error) throw error;
        GA.toast('✓ Assignment marks saved successfully', 'success');
        document.getElementById('assignment-form').reset();
      } catch (err) {
        GA.toast('Error: ' + (err?.message || 'Unknown error'), 'error');
      }
    });

    // Exam form submission
    document.getElementById('exam-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('e-title').value;
      const total = parseFloat(document.getElementById('e-total').value);
      const term = document.getElementById('e-term').value;
      const date = document.getElementById('e-date').value;

      const marks = Array.from(document.querySelectorAll('.exam-score')).map(inp => ({
        student_id: inp.dataset.student,
        score: parseFloat(inp.value) || 0,
        max_score: total
      })).filter(m => m.score >= 0);

      if (!marks.length) {
        GA.toast('Please enter at least one score', 'warn');
        return;
      }

      try {
        const payload = marks.map(m => ({
          teacher_id: profile.id,
          student_id: m.student_id,
          subject_id: subjectId,
          class_id: classId,
          exam_title: title,
          score: m.score,
          max_score: m.max_score,
          exam_date: date || null,
          term,
          session: new Date().getFullYear().toString()
        }));

        const { error } = await c.from('exam_marks').insert(payload);
        if (error) throw error;
        GA.toast('✓ Exam marks saved successfully', 'success');
        document.getElementById('exam-form').reset();
      } catch (err) {
        GA.toast('Error: ' + (err?.message || 'Unknown error'), 'error');
      }
    });

    // Test form submission
    document.getElementById('test-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('t-title').value;
      const total = parseFloat(document.getElementById('t-total').value);
      const term = document.getElementById('t-term').value;

      const marks = Array.from(document.querySelectorAll('.test-score')).map(inp => ({
        student_id: inp.dataset.student,
        score: parseFloat(inp.value) || 0,
        max_score: total
      })).filter(m => m.score >= 0);

      if (!marks.length) {
        GA.toast('Please enter at least one score', 'warn');
        return;
      }

      try {
        const payload = marks.map(m => ({
          teacher_id: profile.id,
          student_id: m.student_id,
          subject_id: subjectId,
          class_id: classId,
          test_title: title,
          score: m.score,
          max_score: m.max_score,
          term,
          session: new Date().getFullYear().toString()
        }));

        const { error } = await c.from('test_marks').insert(payload);
        if (error) throw error;
        GA.toast('✓ Test marks saved successfully', 'success');
        document.getElementById('test-form').reset();
      } catch (err) {
        GA.toast('Error: ' + (err?.message || 'Unknown error'), 'error');
      }
    });
  }

  // ---- Attendance ----
  async function renderAttendance() {
    const classId = document.getElementById('att-class').value;
    const attDate = document.getElementById('att-date').value;

    if (!classId || !attDate) {
      GA.toast('Please select a class and date', 'warn');
      return;
    }

    // Get students in this class
    const { data: students, error: studError } = await c
      .from('students')
      .select('id, first_name, last_name, admission_no')
      .eq('class_id', classId)
      .order('last_name');

    if (studError || !students) {
      GA.toast('Could not load students', 'error');
      return;
    }

    // Render attendance form
    const attList = document.getElementById('attendance-list');
    attList.innerHTML = students.map(s => `
      <div style="display:grid; grid-template-columns:1fr 150px; gap:1rem; align-items:center; padding:0.75rem; background:var(--gray-100); border-radius:8px;">
        <div>
          <strong>${s.last_name}, ${s.first_name}</strong>
          <br><small style="color:var(--gray-600);">ID: ${s.admission_no || s.id.substring(0, 8)}</small>
        </div>
        <select class="att-status" data-student="${s.id}" style="padding:0.5rem; border:1px solid var(--gray-300); border-radius:6px;">
          <option value="">—</option>
          <option value="present">✓ Present</option>
          <option value="absent">✗ Absent</option>
          <option value="late">⏱ Late</option>
          <option value="excused">⊘ Excused</option>
        </select>
      </div>
    `).join('');

    // Mark all buttons
    document.getElementById('mark-all-present')?.addEventListener('click', () => {
      document.querySelectorAll('.att-status').forEach(s => s.value = 'present');
    });
    document.getElementById('mark-all-absent')?.addEventListener('click', () => {
      document.querySelectorAll('.att-status').forEach(s => s.value = 'absent');
    });

    // Attendance form submission
    document.getElementById('attendance-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const records = Array.from(document.querySelectorAll('.att-status'))
        .filter(inp => inp.value)
        .map(inp => ({
          student_id: inp.dataset.student,
          status: inp.value
        }));

      if (!records.length) {
        GA.toast('Please mark attendance for at least one student', 'warn');
        return;
      }

      try {
        const payload = records.map(r => ({
          teacher_id: profile.id,
          student_id: r.student_id,
          class_id: classId,
          attendance_date: attDate,
          status: r.status
        }));

        const { error } = await c.from('attendance').insert(payload);
        if (error) throw error;
        GA.toast('✓ Attendance recorded successfully', 'success');
        document.getElementById('attendance-form').reset();
      } catch (err) {
        GA.toast('Error: ' + (err?.message || 'Unknown error'), 'error');
      }
    });
  }

  document.getElementById('logout-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    await GA.signOut('../login.html');
  });
})();
