(function () {
  const staffGrid = document.getElementById('staff-grid');
  const prefectGrid = document.getElementById('prefect-grid');
  if (!staffGrid || !prefectGrid || !window.GA) return;

  const defaultStaffImages = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=500&h=500&fit=crop'
  ];

  function pickDefaultStaffImage(index) {
    return defaultStaffImages[index % defaultStaffImages.length];
  }

  async function renderStaff() {
    try {
      const c = GA.client();
      const [{ data: staff }, { data: subjects }, { data: students }, { data: profiles }, { data: classes }] = await Promise.all([
        c.from('staff').select('*').order('full_name'),
        c.from('subjects').select('*'),
        c.from('students').select('*').not('prefect_title', 'is', null),
        c.from('profiles').select('id, full_name, email'),
        c.from('classes').select('id,name')
      ]);

      const subjectMap = Object.fromEntries((subjects || []).map(s => [s.id, s]));
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      const classMap = Object.fromEntries((classes || []).map(c => [c.id, c]));

      staffGrid.innerHTML = (staff || []).length ? staff.map((member, index) => `
        <article class="staff-card">
          <div class="staff-image" style="background-image: url('${member.picture_url || pickDefaultStaffImage(index)}'); background-size: cover; background-position: center; width: 100%; height: 280px; border-radius: 12px 12px 0 0;"></div>
          <div class="staff-body">
            <h3>${member.full_name || 'Staff Member'}</h3>
            <p class="staff-position" style="color:var(--gold-500); font-weight:600; margin-bottom:.5rem;">${member.position || 'Staff Member'}</p>
            <p style="color:var(--gray-500); font-size:.9rem; margin-bottom:.5rem;"><i class="fa-solid fa-envelope"></i> ${member.email || 'Email not available'}</p>
            <p style="color:var(--gray-700); font-size:.9rem; margin-bottom:.75rem;"><i class="fa-solid fa-phone"></i> ${member.phone || '+234 (0) 123 456 7890'}</p>
            <div class="staff-subjects">
              ${(member.subject_ids || []).length
                ? (member.subject_ids || []).map(id => `<span class="badge badge-info" style="margin:.2rem;">${subjectMap[id]?.code || 'SUB'}</span>`).join('')
                : '<span class="badge badge-pending">No subjects assigned</span>'}
            </div>
          </div>
        </article>
      `).join('') : '<div class="panel" style="text-align:center; color:var(--gray-500);">No staff records found.</div>';

      prefectGrid.innerHTML = (students || []).length ? students.map(item => {
        const p = profileMap[item.profile_id] || {};
        const cl = classMap[item.class_id] || {};
        return `
          <article class="program-card">
            <div class="icon"><i class="fa-solid fa-shield"></i></div>
            <h3>${p.full_name || 'Student Leader'}</h3>
            <p style="color:var(--green-700); font-weight:600; margin-bottom:.35rem;">${item.prefect_title || 'Prefect'}</p>
            <p style="color:var(--gray-600); font-size:.9rem;"><b>Class:</b> ${cl.name || '-'}</p>
            <p style="color:var(--gray-600); font-size:.9rem;"><b>Admission No:</b> ${item.admission_no || '-'}</p>
          </article>
        `;
      }).join('') : '<div class="panel" style="text-align:center; color:var(--gray-500);">No prefect records available.</div>';
    } catch (error) {
      staffGrid.innerHTML = `<div class="panel" style="color:var(--red-500);">${error.message}</div>`;
      prefectGrid.innerHTML = '';
    }
  }

  renderStaff();
})();
