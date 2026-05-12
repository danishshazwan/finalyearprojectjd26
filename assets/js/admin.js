/*
  SMARTCONVO — Admin Dashboard Controller
  - Connects to window.smartconvoStorage (LocalStorage simulation layer)
  - Renders enterprise-grade dashboard UI
  - Provides live queue + face verification + awards/voting + AI insights

  NOTE:
  - admin.html contains the CSS and markup.
  - This file focuses on data->UI rendering and interactions.
*/

(function () {
  'use strict';

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // ---------- Storage helpers ----------
  function getSmartState() {
    try {
      if (!window.smartconvoStorage?.getState) return null;
      return window.smartconvoStorage.getState();
    } catch (e) {
      return null;
    }
  }

  function updateSmartState(mutator) {
    try {
      if (!window.smartconvoStorage?.update) return null;
      return window.smartconvoStorage.update(mutator);
    } catch (e) {
      return null;
    }
  }

  // ---------- Dummy data seeding (only if missing) ----------
  function ensureSeededState() {
    // We keep compatibility with smartconvo-storage.js model.
    // If your storage state is updated server-side later, this seeding will still be safe.

    const st = getSmartState();
    if (!st) return;

    // Seed courses if missing
    if (!st.courses?.ikmLumut?.length) {
      // smartconvo-storage.js already seeds it, but keep defensive.
      updateSmartState((s) => {
        s.courses = s.courses || {};
        s.courses.ikmLumut = Array.isArray(s.courses.ikmLumut) && s.courses.ikmLumut.length
          ? s.courses.ikmLumut
          : [
            'Diploma Teknologi Perkhidmatan Air',
            'Diploma Teknologi Komputer (Analisa Data Besar)',
            'Diploma Teknologi Kejuruteraan — Pembuatan Pintar',
            'Diploma Teknologi Pengeluaran Perabot Kontemporari',
            'Diploma Kompetensi Kimpalan',
            'Diploma Kompetensi Penjaga Jentera Elektrik Voltan A4',
            'Diploma Kompetensi Elektrik (Domestik & Industri) PW4',
            'Diploma Teknologi Automotif',
            'Diploma Teknologi Automotif — Baikpulih & Kemas Badan Kenderaan',
            'Sijil Teknologi Kejuruteraan Mekanikal (Lukisan Rekabentuk)',
            'Sijil Teknologi Kejuruteraan Bangunan',
            'Sijil Teknologi Foundri',
            'Sijil Senibina'
          ];
      });
    }

    // Seed queueItems if missing/empty
    const q = st.queue;
    if (!q || !Array.isArray(q.queueItems) || q.queueItems.length === 0) {
      const courses = st.courses?.ikmLumut || [];
      const names = [
        'Nur Aisyah', 'Muhammad Hafiz', 'Siti Hajar', 'Ahmad Syafiq', 'Aina Sofia',
        'Muhammad Arif', 'Nurul Izzah', 'Adam Hakimi', 'Siti Nurul', 'Raihan Hakim',
        'Nadia Farhana', 'Faris Syazwan'
      ];

      const seeded = [];
      const total = 18;
      for (let i = 0; i < total; i++) {
        const course = courses[i % courses.length] || 'Diploma Teknologi Komputer (Analisa Data Besar)';
        const name = `${names[i % names.length]} ${String.fromCharCode(65 + (i % 26))}.`;
        const studentId = `A${String(21)}EC${String(1000 + i).padStart(4, '0')}`;

        // Face status spread
        const faceRoll = i % 10;
        let faceStatus = 'pending';
        if (faceRoll <= 5) faceStatus = 'verified';
        else if (faceRoll <= 7) faceStatus = 'failed';

        seeded.push({
          id: window.smartconvoStorage?.uid ? window.smartconvoStorage.uid('q') : `q_${i}`,
          studentId,
          name,
          course,
          faceStatus,
          queueNo: window.smartconvoStorage?.generateQueueNo
            ? window.smartconvoStorage.generateQueueNo(i)
            : `Q-2026-${String(i + 1).padStart(6, '0')}`,
          // queue step
          step: q?.stepOrder?.[Math.min(q.stepOrder.length - 1, i % q.stepOrder.length)] || 'waiting',
          updatedAtEpochMs: Date.now() - (total - i) * 1000 * 20
        });
      }

      updateSmartState((s) => {
        s.queue = s.queue || { stepOrder: ['seated', 'waiting', 'verified', 'onstage', 'finished'], state: { seq: 0, currentStep: 'seated', ceremonyStartEpochMs: Date.now() + 600000 }, queueItems: [] };
        s.queue.queueItems = seeded;
        if (!s.queue.stepOrder || !s.queue.stepOrder.length) {
          s.queue.stepOrder = ['seated', 'waiting', 'verified', 'onstage', 'finished'];
        }
        if (!s.queue.state) {
          s.queue.state = { seq: 0, currentStep: s.queue.stepOrder[0], ceremonyStartEpochMs: Date.now() + 1000 * 60 * 10 };
        }
      });
    }

    // Seed notifications stream
    const notif = st.notifications;
    if (!notif || !Array.isArray(notif.items)) {
      updateSmartState((s) => {
        s.notifications = s.notifications || { items: [] };
        s.notifications.items = [];
      });
    }

    // Seed awards structure
    const awards = st.awards;
    if (!awards?.gallery) {
      updateSmartState((s) => {
        s.awards = s.awards || {};
        s.awards.gallery = s.awards.gallery || {
          akademik: [],
          bukanAkademik: [],
          bestStudent: { 'jan-jun': [], 'jul-dec': [] }
        };
        s.awards.voting = s.awards.voting || { locked: false, candidates: [], votes: {}, lastUpdatedAtEpochMs: Date.now() };
      });
    }

    // Seed awards gallery from queueItems (for coherence)
    const gallery = getSmartState()?.awards?.gallery;
    if (gallery) {
      const queueItems = getSmartState()?.queue?.queueItems || [];
      const pick = (arr, n) => arr.slice(0, n);

      if ((gallery.akademik?.length || 0) === 0 && queueItems.length) {
        updateSmartState((s) => {
          s.awards = s.awards || {};
          s.awards.gallery = s.awards.gallery || { akademik: [], bukanAkademik: [], bestStudent: { 'jan-jun': [], 'jul-dec': [] } };
          s.awards.voting = s.awards.voting || { locked: false, candidates: [], votes: {}, lastUpdatedAtEpochMs: Date.now() };

          const items = s.queue?.queueItems || [];
          const academic = items.slice(0, 4).map((it, i) => ({
            studentId: it.studentId,
            name: it.name,
            projectTitle: `AI Innovation Project #${i + 1}`,
            cat: items[i % items.length]?.course || 'Akademik',
            score: 80 + (i * 3) % 20,
            status: 'review',
            updatedAtEpochMs: Date.now() - i * 60000
          }));
          const bukan = items.slice(4, 8).map((it, i) => ({
            studentId: it.studentId,
            name: it.name,
            projectTitle: `Industry Automation Proposal #${i + 1}`,
            cat: it.course,
            score: 70 + (i * 4) % 20,
            status: 'review',
            updatedAtEpochMs: Date.now() - i * 65000
          }));

          const half = s.session?.activeHalf || 'jan-jun';
          s.awards.gallery.akademik = academic;
          s.awards.gallery.bukanAkademik = bukan;
          s.awards.gallery.bestStudent = s.awards.gallery.bestStudent || { 'jan-jun': [], 'jul-dec': [] };
          s.awards.gallery.bestStudent[half] = pick(items, 5).map((it, i) => ({
            studentId: it.studentId,
            name: it.name,
            category: 'Best Student',
            cat: 'Best Student',
            score: 85 + (i * 2) % 15,
            status: 'review',
            updatedAtEpochMs: Date.now() - i * 55000
          }));

          s.awards.voting.candidates = pick(items, 6).map(it => it.studentId);
          s.awards.voting.votes = {};
          s.awards.voting.lastUpdatedAtEpochMs = Date.now();
        });
      }
    }
  }

  // ---------- UI helpers ----------
  function $(sel, root = document) {
    return root.querySelector(sel);
  }

  function $all(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '<')
      .replaceAll('>', '>')
      .replaceAll('"', '"')
      .replaceAll("'", '&#039;');
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function formatTimeMy(ts) {
    try {
      return new Date(ts).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  }

  function formatDateMY(ts) {
    try {
      return new Date(ts).toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: '2-digit' });
    } catch {
      return '';
    }
  }

  // ---------- Toast ----------
  function toast(msg, kind = 'success') {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.dataset.kind = kind;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
  }

  // ---------- Modal ----------
  function openModal() {
    const overlay = $('#modal');
    if (overlay) overlay.classList.add('open');
  }

  function closeModal() {
    const overlay = $('#modal');
    if (overlay) overlay.classList.remove('open');
  }

  // ---------- Navigation (kept simple for now) ----------
  function showView(viewId) {
    $all('.view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById(viewId);
    if (el) el.classList.add('active');
  }

  // ---------- Dashboard rendering ----------
  const COURSE_LIST = [
    'Diploma Teknologi Perkhidmatan Air',
    'Diploma Teknologi Komputer (Analisa Data Besar)',
    'Diploma Teknologi Kejuruteraan — Pembuatan Pintar',
    'Diploma Teknologi Pengeluaran Perabot Kontemporari',
    'Diploma Kompetensi Kimpalan',
    'Diploma Kompetensi Penjaga Jentera Elektrik Voltan A4',
    'Diploma Kompetensi Elektrik (Domestik & Industri) PW4',
    'Diploma Teknologi Automotif',
    'Diploma Teknologi Automotif — Baikpulih & Kemas Badan Kenderaan',
    'Sijil Teknologi Kejuruteraan Mekanikal (Lukisan Rekabdesng)',
    'Sijil Teknologi Kejuruteraan Bangunan',
    'Sijil Teknologi Foundri',
    'Sijil Senibina'
  ];

  function computeQueueStats(st) {
    const items = st?.queue?.queueItems || [];
    const stepOrder = st?.queue?.stepOrder || ['seated', 'waiting', 'verified', 'onstage', 'finished'];

    const counts = {
      waiting: 0,
      queueing: 0,
      verified: 0,
      onstage: 0,
      completed: 0
    };

    for (const it of items) {
      const step = it.step;
      if (step === 'waiting') counts.waiting++;
      if (step === 'seated') counts.queueing++;
      if (step === 'verified') counts.verified++;
      if (step === 'onstage') counts.onstage++;
      if (step === 'finished') counts.completed++;
    }

    // Face statuses for analytics
    const verifiedFace = items.filter(x => x.faceStatus === 'verified').length;
    const failedFace = items.filter(x => x.faceStatus === 'failed').length;
    const pendingFace = items.filter(x => x.faceStatus === 'pending').length;

    // current / next graduate (heuristic): onstage is current, verified is next else waiting
    const current = items.find(x => x.step === 'onstage') || null;
    const next = items.find(x => x.step === 'verified') || items.find(x => x.step === 'waiting') || null;

    return { items, stepOrder, counts, verifiedFace, failedFace, pendingFace, current, next };
  }

  function updateKPI(st) {
    const k = computeQueueStats(st);

    const totalStudents = st?.queue?.queueItems?.length || 0;
    const activeGuests = Math.floor(12 + (totalStudents % 9) * 1.8);
    const updatedData = Math.floor(totalStudents * 0.72);
    const verifiedFace = k.verifiedFace;
    const queueActive = k.counts.waiting + k.counts.queueing + k.counts.verified;

    const awardsCandidates = st?.awards?.awardsCandidatesCount
      ? st.awards.awardsCandidatesCount
      : (st?.awards?.voting?.candidates?.length || 0);

    const yetToLogin = Math.max(0, totalStudents - Math.floor(totalStudents * 0.62));

    const currentGraduatesInsideHall = k.counts.onstage;

    const map = {
      '#kpi-total-students': totalStudents,
      '#kpi-active-guests': activeGuests,
      '#kpi-verified-face': verifiedFace,
      '#kpi-updated-data': updatedData,
      '#kpi-queue-active': queueActive,
      '#kpi-award-candidates': awardsCandidates,
      '#kpi-yet-to-login': yetToLogin,
      '#kpi-current-graduates': currentGraduatesInsideHall
    };

    Object.entries(map).forEach(([sel, val]) => {
      const el = $(sel);
      if (el) {
        el.textContent = String(val);
      }
    });
  }

  function animateCounter(el, to, durationMs = 900) {
    if (!el) return;
    const from = Number(el.textContent.replace(/[^0-9.-]/g, '')) || 0;
    const start = performance.now();
    const tick = (now) => {
      const t = clamp((now - start) / durationMs, 0, 1);
      const v = Math.round(from + (to - from) * (t * (2 - t)));
      el.textContent = String(v);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function renderQueueMain(st) {
    const wrap = $('#live-queue');
    if (!wrap) return;

    const { items, counts, current, next } = computeQueueStats(st);

    // Queue list: waiting + verified + onstage (top 8)
    const sorted = items
      .slice()
      .sort((a, b) => (a.updatedAtEpochMs || 0) - (b.updatedAtEpochMs || 0));

    const list = sorted.filter(x => x.step === 'waiting' || x.step === 'seated' || x.step === 'verified' || x.step === 'onstage')
      .slice(0, 9);

    const statusMeta = (it) => {
      if (it.step === 'waiting') return { label: 'Waiting', cls: 's-waiting' };
      if (it.step === 'seated') return { label: 'Queueing', cls: 's-queueing' };
      if (it.step === 'verified') return { label: 'Face Verified', cls: 's-verified' };
      if (it.step === 'onstage') return { label: 'On Stage', cls: 's-stage' };
      if (it.step === 'finished') return { label: 'Completed', cls: 's-done' };
      return { label: 'Waiting', cls: 's-waiting' };
    };

    const currentEl = $('#queue-current');
    const nextEl = $('#queue-next');
    if (currentEl) {
      currentEl.innerHTML = current
        ? renderQueueRowCard(current, statusMeta(current).label)
        : `<div class="empty-state">No graduate currently on stage</div>`;
    }

    if (nextEl) {
      nextEl.innerHTML = next
        ? renderQueueRowCard(next, statusMeta(next).label)
        : `<div class="empty-state">Waiting to detect next graduate</div>`;
    }

    const tbody = $('#queue-list');
    if (tbody) {
      tbody.innerHTML = '';
      const maxLen = Math.max(1, list.length);
      list.forEach((it, idx) => {
        const stx = statusMeta(it);
        const progressPct = Math.round(((idx + 1) / maxLen) * 100);
        tbody.innerHTML += `
          <div class="qrow ${stx.cls}">
            <div class="qcol qno">${escapeHtml(it.queueNo || 'Q-—')}</div>
            <div class="qcol qname">
              <div class="qtitle">${escapeHtml(it.name)}</div>
              <div class="qsub">${escapeHtml(it.course)}</div>
            </div>
            <div class="qcol qstatus">
              <span class="qpill">${escapeHtml(stx.label)}</span>
            </div>
            <div class="qcol qbar">
              <div class="qprogress"><div class="qprogress-fill" style="width:${progressPct}%"></div></div>
            </div>
          </div>
        `;
      });
    }

    // Progress bar for ceremony countdown
    const start = st?.queue?.state?.ceremonyStartEpochMs || (Date.now() + 1000 * 60 * 10);
    const now = Date.now();
    const totalMs = 1000 * 60 * 12; // simulated window
    const elapsed = now - (start - totalMs);
    const p = clamp(elapsed / totalMs, 0, 1);

    const progress = $('#ceremony-progress');
    if (progress) {
      progress.style.width = `${Math.round(p * 100)}%`;
    }

    const countdown = $('#countdown-next');
    if (countdown) {
      // Countdown derived: next graduate time = start + 1.5 minutes
      const target = start + 1000 * 60 * 1.5;
      const remain = Math.max(0, target - now);
      const mm = Math.floor(remain / 60000);
      const ss = Math.floor((remain % 60000) / 1000);
      countdown.textContent = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    }

    // Live indicator
    const live = $('#live-indicator');
    if (live) {
      live.classList.add('pulse');
    }
  }

  function renderFacePanel(st) {
    const panel = $('#face-panel');
    if (!panel) return;

    const { verifiedFace, failedFace, pendingFace, items } = computeQueueStats(st);
    const currentDetect = items.find(x => x.faceStatus === 'pending') || items.find(x => x.faceStatus === 'failed') || items.find(Boolean) || null;

    const set = (sel, val) => {
      const el = $(sel, panel);
      if (el) el.textContent = String(val);
    };

    set('#face-verified', verifiedFace);
    set('#face-failed', failedFace);
    set('#face-pending', pendingFace);

    const conf = $('#face-confidence');
    if (conf) {
      const seed = (currentDetect?.studentId || '').length + (Date.now() % 1000);
      const pct = clamp(78 + (seed % 19), 70, 99);
      conf.textContent = `${pct}%`;
    }

    const cam = $('#face-camera');
    if (cam) {
      const name = currentDetect?.name || 'Awaiting camera detection';
      cam.textContent = name;
    }

    const logs = $('#face-logs');
    if (logs) {
      const now = Date.now();
      logs.innerHTML = '';
      const recent = items
        .slice()
        .sort((a, b) => (b.updatedAtEpochMs || 0) - (a.updatedAtEpochMs || 0))
        .slice(0, 6);

      const statusLabel = (it) => {
        if (it.faceStatus === 'verified') return { lbl: 'VERIFIED', cls: 'log-ok' };
        if (it.faceStatus === 'failed') return { lbl: 'FAILED', cls: 'log-bad' };
        return { lbl: 'PENDING', cls: 'log-mid' };
      };

      recent.forEach((it, i) => {
        const s = statusLabel(it);
        const at = now - i * 1000 * 26;
        logs.innerHTML += `
          <div class="flog">
            <div class="flog-dot ${s.cls}"></div>
            <div class="flog-main">
              <div class="flog-top">${escapeHtml(it.name || it.studentId)} · ${escapeHtml(it.course || '')}</div>
              <div class="flog-bot">${escapeHtml(statusText(s.lbl))} · ${formatTimeMy(at)}</div>
            </div>
            <div class="flog-pill ${s.cls}">${s.lbl}</div>
          </div>
        `;
      });
    }

    function statusText(lbl) {
      if (lbl === 'VERIFIED') return 'Confidence passed';
      if (lbl === 'FAILED') return 'Liveness check failed';
      return 'Scanning…';
    }
  }

  function renderRightPanel(st) {
    // Live notifications
    const rightNotif = $('#right-live-notifs');
    if (rightNotif) {
      const notifs = st?.notifications?.items || [];
      rightNotif.innerHTML = '';
      const top = notifs.slice(0, 6);
      if (!top.length) {
        rightNotif.innerHTML = '<div class="empty-state">No live alerts</div>';
      }
      top.forEach(n => {
        const role = n.role || 'guest';
        const cls = role === 'admin' ? 'n-admin' : role === 'guest' ? 'n-guest' : 'n-system';
        rightNotif.innerHTML += `
          <div class="rnotif">
            <div class="rnotif-dot ${cls}"></div>
            <div class="rnotif-text">${escapeHtml(n.message || 'Alert')}</div>
            <div class="rnotif-time">${formatTimeMy(n.at || Date.now())}</div>
          </div>
        `;
      });
    }

    // Current graduate status
    const status = $('#right-current-grad');
    if (status) {
      const { current } = computeQueueStats(st);
      status.innerHTML = current
        ? `<div class="grad-top">On Stage</div><div class="grad-name">${escapeHtml(current.name)}</div><div class="grad-sub">${escapeHtml(current.course)}</div>`
        : `<div class="empty-state">No active graduate detected</div>`;
    }

    // AI Recommendations
    const aiRecs = $('#right-ai-recs');
    if (aiRecs) {
      const q = computeQueueStats(st);
      const votes = st?.awards?.voting?.votes || {};
      const cand = st?.awards?.voting?.candidates || [];

      const missingVerify = (st?.queue?.queueItems || []).filter(x => x.faceStatus === 'pending').length;
      const tooLongCourse = courseWithLongestQueue(st);

      const topVotes = Object.entries(votes)
        .map(([id, v]) => ({ id, v }))
        .sort((a, b) => b.v - a.v)
        .slice(0, 1)[0];

      const items = [
        `AI Recommendations: ${missingVerify} students belum verify muka`,
        `Queue Monitor: Course ${tooLongCourse} terlalu panjang`,
        `High guest traffic detected · ${Math.floor(18 + ((Date.now() / 1000) % 9))} guests now`,
        topVotes ? `Voting: Top candidate ${escapeHtml(lookupStudentName(st, topVotes.id) || topVotes.id)} (${topVotes.v} votes)` : 'Voting: Awaiting results'
      ];

      aiRecs.innerHTML = items
        .slice(0, 4)
        .map((t, i) => `
          <div class="arec">
            <div class="arec-idx">${i + 1}</div>
            <div class="arec-text">${escapeHtml(t)}</div>
          </div>
        `)
        .join('');
    }
  }

  function courseWithLongestQueue(st) {
    const items = st?.queue?.queueItems || [];
    const map = {};
    items.forEach(it => {
      const c = it.course || 'Unknown';
      map[c] = (map[c] || 0) + 1;
    });
    const entries = Object.entries(map);
    if (!entries.length) return '—';
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0];
  }

  function lookupStudentName(st, studentId) {
    const items = st?.queue?.queueItems || [];
    return (items.find(x => x.studentId === studentId) || {}).name;
  }

  function renderCoursePanel(st) {
    const wrap = $('#course-panel');
    if (!wrap) return;

    const courses = st?.courses?.ikmLumut || COURSE_LIST;
    wrap.innerHTML = '';

    // total counts per course
    const items = st?.queue?.queueItems || [];
    const byCourse = {};
    items.forEach(it => {
      const c = it.course || 'Unknown';
      byCourse[c] = byCourse[c] || { total: 0, verified: 0, onStage: 0, candidates: 0 };
      byCourse[c].total++;
      if (it.faceStatus === 'verified') byCourse[c].verified++;
      if (it.step === 'onstage') byCourse[c].onStage++;
    });

    // award candidates: heuristic using voting candidates
    const votingCand = st?.awards?.voting?.candidates || [];
    votingCand.forEach(cid => {
      const it = items.find(x => x.studentId === cid);
      if (!it) return;
      const c = it.course || 'Unknown';
      byCourse[c] = byCourse[c] || { total: 0, verified: 0, onStage: 0, candidates: 0 };
      byCourse[c].candidates++;
    });

    courses.forEach((c, i) => {
      const d = byCourse[c] || { total: 0, verified: 0, onStage: 0, candidates: 0 };
      wrap.innerHTML += `
        <button class="course-card ${i === 0 ? 'active' : ''}" data-course="${escapeHtml(c)}">
          <div class="cc-top">
            <div class="cc-title">${escapeHtml(shortCourse(c))}</div>
            <div class="cc-badge">${d.total} students</div>
          </div>
          <div class="cc-mid">
            <div class="cc-metric"><span class="cc-k">Verified</span><span class="cc-v">${d.verified}</span></div>
            <div class="cc-metric"><span class="cc-k">Candidates</span><span class="cc-v">${d.candidates}</span></div>
          </div>
          <div class="cc-bottom">
            <div class="cc-live"><span class="cc-pip"></span> On Hall: ${d.onStage}</div>
          </div>
        </button>
      `;
    });

    const detail = $('#course-details');
    function renderDetails(course) {
      const d = byCourse[course] || { total: 0, verified: 0, onStage: 0, candidates: 0 };
      if (!detail) return;
      detail.innerHTML = `
        <div class="cd-title">Course Profile</div>
        <div class="cd-course">${escapeHtml(course)}</div>
        <div class="cd-grid">
          <div class="cd-box"><div class="cd-k">Total Student</div><div class="cd-v">${d.total}</div></div>
          <div class="cd-box"><div class="cd-k">Verified Student</div><div class="cd-v">${d.verified}</div></div>
          <div class="cd-box"><div class="cd-k">Award Candidates</div><div class="cd-v">${d.candidates}</div></div>
          <div class="cd-box"><div class="cd-k">Queue Status</div><div class="cd-v">${queueStatusForCourse(st, course)}</div></div>
        </div>
        <div class="cd-topstudent">Top student (simulation): <span>${escapeHtml(bestStudentForCourse(st, course) || '—')}</span></div>
      `;
    }

    // init click
    const first = courses[0];
    renderDetails(first);

    $all('.course-card').forEach(btn => {
      btn.addEventListener('click', () => {
        $all('.course-card').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
        renderDetails(btn.dataset.course);
      });
    });
  }

  function shortCourse(c) {
    // keep it compact for card
    return c
      .replace('Diploma Teknologi ', 'DTP ')
      .replace('Diploma Kompetensi ', 'DTK ')
      .replace('Sijil Teknologi ', 'ST ')
      .replace(' (Analisa Data Besar)', ' (ADB)');
  }

  function queueStatusForCourse(st, course) {
    const items = st?.queue?.queueItems || [];
    const active = items.filter(it => (it.course || '') === course && (it.step === 'waiting' || it.step === 'seated' || it.step === 'verified' || it.step === 'onstage')).length;
    if (active >= 7) return 'Too Long';
    if (active >= 4) return 'Moderate';
    return 'Stable';
  }

  function bestStudentForCourse(st, course) {
    const items = st?.queue?.queueItems || [];
    const verified = items.filter(it => (it.course || '') === course && it.faceStatus === 'verified');
    if (!verified.length) return null;
    const pick = verified.slice().sort((a, b) => (b.updatedAtEpochMs || 0) - (a.updatedAtEpochMs || 0))[0];
    return pick.name;
  }

  // ---------- Charts ----------
  let charts = { line: null, pie: null, bar: null };

  function ensureChartJs() {
    // Chart.js is optional but requested.
    // If not available, we render no charts gracefully.
    return !!window.Chart;
  }

  function renderReportsCharts(st) {
    if (!ensureChartJs()) return;

    const face = computeQueueStats(st);
    const faceData = [face.verifiedFace, face.pendingFace, face.failedFace];

    const voting = st?.awards?.voting || {};
    const votes = voting.votes || {};
    const candIds = voting.candidates || [];

    const top3 = Object.entries(votes)
      .map(([id, v]) => ({ id, v }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 3);

    const labels = top3.map(x => lookupStudentName(st, x.id) || x.id);
    const values = top3.map(x => x.v);

    const attendance = {
      attended: Math.floor((st?.queue?.queueItems?.length || 0) * 0.62),
      missing: Math.max(0, (st?.queue?.queueItems?.length || 0) - Math.floor((st?.queue?.queueItems?.length || 0) * 0.62))
    };

    // Line chart: graduation progress simulation
    const lineCtx = $('#chart-line');
    if (lineCtx) {
      const ctx = lineCtx.getContext('2d');
      const points = Array.from({ length: 8 }).map((_, i) => {
        const base = 20 + i * 7;
        const drift = (Date.now() / 10000) % 6;
        return Math.round(clamp(base + drift + (face.verifiedFace % 5), 0, 100));
      });

      if (charts.line) charts.line.destroy();
      charts.line = new Chart(ctx, {
        type: 'line',
        data: {
          labels: Array.from({ length: 8 }).map((_, i) => `T-${7 - i}`),
          datasets: [{
            label: 'Graduation Completion % (Simulated)',
            data: points,
            borderColor: '#00e5b4',
            backgroundColor: 'rgba(0,229,180,0.08)',
            tension: 0.35,
            fill: true
          }]
        },
        options: chartOptions()
      });
    }

    // Pie: face verification distribution
    const pieCtx = $('#chart-pie');
    if (pieCtx) {
      const ctx = pieCtx.getContext('2d');
      if (charts.pie) charts.pie.destroy();
      charts.pie = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['Verified', 'Pending', 'Failed'],
          datasets: [{
            data: faceData,
            backgroundColor: ['rgba(0,229,180,0.75)', 'rgba(240,192,64,0.75)', 'rgba(255,77,109,0.75)'],
            borderColor: 'rgba(0,0,0,0)',
          }]
        },
        options: chartOptions(true)
      });
    }

    // Bar: voting analytics (top candidates)
    const barCtx = $('#chart-bar');
    if (barCtx) {
      const ctx = barCtx.getContext('2d');
      if (charts.bar) charts.bar.destroy();
      charts.bar = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels.length ? labels : ['No data'],
          datasets: [{
            label: 'Votes',
            data: values.length ? values : [0],
            backgroundColor: 'rgba(77,127,255,0.65)',
            borderColor: 'rgba(77,127,255,1)',
            borderWidth: 1
          }]
        },
        options: chartOptions()
      });
    }
  }

  function chartOptions(pieOnly = false) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: 'rgba(255,255,255,0.7)' } },
        tooltip: { enabled: true }
      },
      scales: pieOnly ? {} : {
        x: { ticks: { color: 'rgba(255,255,255,0.6)' }, grid: { color: 'rgba(255,255,255,0.08)' } },
        y: { ticks: { color: 'rgba(255,255,255,0.6)' }, grid: { color: 'rgba(255,255,255,0.08)' } }
      }
    };
  }

  // ---------- Student management (table + modal) ----------
  // Because current smartconvo-storage.js only stores students minimally, we render from queueItems as student records.
  // Actions mutate smartconvoStorage.notifications only (since full backend isn't available in this front-end file).

  function studentTableData(st) {
    const items = st?.queue?.queueItems || [];
    return items.map((it, i) => ({
      id: it.studentId,
      name: it.name,
      course: it.course,
      faceStatus: it.faceStatus,
      queueNo: it.queueNo,
      updatedAtEpochMs: it.updatedAtEpochMs || (Date.now() - i * 60000),
      suspended: false,
      lastLoginAtEpochMs: Date.now() - (i % 9) * 1000 * 60 * 60
    }));
  }

  function renderStudentTable(st) {
    const tableWrap = $('#student-table');
    if (!tableWrap) return;

    const data = studentTableData(st);

    // controls
    const search = ($('#student-search')?.value || '').toLowerCase();
    const course = $('#student-course-filter')?.value || 'all';
    const ver = $('#student-ver-filter')?.value || 'all';

    let filtered = data.slice();
    if (search) {
      filtered = filtered.filter(r => (r.name + ' ' + r.id + ' ' + r.course).toLowerCase().includes(search));
    }
    if (course !== 'all') {
      filtered = filtered.filter(r => r.course === course);
    }
    if (ver !== 'all') {
      filtered = filtered.filter(r => r.faceStatus === ver);
    }

    // sort
    const sortKey = $('#student-sort-key')?.value || 'updatedAtEpochMs';
    const sortDir = $('#student-sort-dir')?.value || 'desc';

    filtered.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });

    // pagination
    const pageSize = Number($('#student-page-size')?.value || 8);
    const page = Number($('#student-page')?.value || 1);
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const p = clamp(page, 1, pages);

    // update pagination UI
    if ($('#student-page') && $('#student-pages')) {
      $('#student-page').value = String(p);
      $('#student-pages').textContent = String(pages);
    }

    const start = (p - 1) * pageSize;
    const slice = filtered.slice(start, start + pageSize);

    const tbody = $('#student-tbody');
    tbody.innerHTML = '';

    const facePill = (fs) => {
      if (fs === 'verified') return { cls: 'sp-approved', text: 'Face Verified' };
      if (fs === 'failed') return { cls: 'sp-rejected', text: 'Verification Failed' };
      return { cls: 'sp-pending', text: 'Pending Verification' };
    };

    slice.forEach(r => {
      const fp = facePill(r.faceStatus);
      tbody.innerHTML += `
        <tr>
          <td class="td-name">
            <div class="student-name">${escapeHtml(r.name)}</div>
            <div class="student-id">${escapeHtml(r.id)}</div>
          </td>
          <td>${escapeHtml(r.course)}</td>
          <td><span class="status-pill ${fp.cls}">${fp.text}</span></td>
          <td>${escapeHtml(r.queueNo || '—')}</td>
          <td>${formatTimeMy(r.updatedAtEpochMs)}</td>
          <td class="td-actions">
            <button class="mini-action" data-action="edit" data-id="${escapeHtml(r.id)}">Edit</button>
            <button class="mini-action danger" data-action="suspend" data-id="${escapeHtml(r.id)}">Suspend</button>
            <button class="mini-action" data-action="reset" data-id="${escapeHtml(r.id)}">Reset</button>
          </td>
        </tr>
      `;
    });

    // no results
    if (!slice.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="padding:18px;color:rgba(255,255,255,0.5)">No students match current filters.</td>
        </tr>`;
    }

    // bind action buttons
    $all('#student-tbody .mini-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        const student = data.find(x => x.id === id);
        if (!student) return;

        if (action === 'edit') {
          openStudentModal({ mode: 'edit', student });
        } else if (action === 'suspend') {
          // UI demo only
          toast(`Suspended ${student.name} (demo)`, 'warn');
          pushNotif(`Admin suspended account: ${student.name}`);
        } else if (action === 'reset') {
          toast(`Password reset link generated for ${student.name} (demo)`, 'success');
          pushNotif(`Admin reset password: ${student.name}`);
        }
      });
    });
  }

  function openStudentModal({ mode, student }) {
    const overlay = $('#student-modal');
    if (!overlay) return;

    // fill fields
    $('#student-modal-mode').textContent = mode === 'edit' ? 'Edit Student' : 'Add Student';
    $('#student-modal-name').value = student?.name || '';
    $('#student-modal-id').value = student?.id || '';
    $('#student-modal-course').value = student?.course || (getSmartState()?.courses?.ikmLumut?.[0] || '');

    $('#student-modal-queueNo').value = student?.queueNo || '';

    overlay.classList.add('open');
  }

  function pushNotif(message) {
    updateSmartState((s) => {
      s.notifications = s.notifications || { items: [] };
      s.notifications.items.unshift({
        id: window.smartconvoStorage?.uid ? window.smartconvoStorage.uid('notif') : `notif_${Date.now()}`,
        at: Date.now(),
        role: 'admin',
        message
      });
      s.notifications.items = s.notifications.items.slice(0, 30);
    });
  }

  function bindStudentControls() {
    const ids = [
      'student-search',
      'student-course-filter',
      'student-ver-filter',
      'student-sort-key',
      'student-sort-dir',
      'student-page',
      'student-page-size'
    ];

    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          // reset to page 1 when filtering
          const page = document.getElementById('student-page');
          if (page) page.value = '1';
          renderStudentTable(getSmartState());
        });
        el.addEventListener('change', () => {
          const page = document.getElementById('student-page');
          if (page && el.id !== 'student-page') page.value = '1';
          renderStudentTable(getSmartState());
        });
      }
    });

    const prev = $('#student-page-prev');
    const next = $('#student-page-next');
    if (prev) prev.addEventListener('click', () => {
      const page = $('#student-page');
      page.value = String(Math.max(1, Number(page.value) - 1));
      renderStudentTable(getSmartState());
    });
    if (next) next.addEventListener('click', () => {
      const page = $('#student-page');
      page.value = String(Number(page.value) + 1);
      renderStudentTable(getSmartState());
    });

    const close = $('#student-modal-close');
    if (close) close.addEventListener('click', () => $('#student-modal')?.classList.remove('open'));

    const save = $('#student-modal-save');
    if (save) save.addEventListener('click', () => {
      // UI demo: update notifications and close
      const overlay = $('#student-modal');
      const name = $('#student-modal-name')?.value || '';
      toast(`Student saved (demo): ${name}`, 'success');
      pushNotif(`Admin saved student changes: ${name}`);
      overlay?.classList.remove('open');
    });
  }

  // ---------- Guest monitoring (demo) ----------
  function renderGuestPanel(st) {
    const guestCount = $('#guest-total');
    if (guestCount) {
      const total = (st?.queue?.queueItems?.length || 0);
      guestCount.textContent = String(18 + (total % 11));
    }

    const guestOnline = $('#guest-online');
    if (guestOnline) {
      const v = 10 + ((Date.now() / 1000) % 7);
      guestOnline.textContent = String(Math.round(v));
    }

    const popular = $('#guest-popular');
    if (popular) {
      const votes = st?.awards?.voting?.votes || {};
      const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1]);
      const topId = sorted[0]?.[0];
      popular.textContent = lookupStudentName(st, topId) || '—';
    }

    const votesChart = $('#guest-votes-chart');
    if (votesChart && window.Chart) {
      // Render small chart using candidates
      const ctx = votesChart.getContext('2d');
      const candidates = st?.awards?.voting?.candidates || [];
      const votes = st?.awards?.voting?.votes || {};

      const top = candidates
        .slice(0, 5)
        .map(cid => ({
          cid,
          votes: votes[cid] || 0,
          name: lookupStudentName(st, cid) || cid
        }))
        .sort((a, b) => b.votes - a.votes);

      if (window.__guestVotesChart) window.__guestVotesChart.destroy();
      window.__guestVotesChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: top.map(x => x.name),
          datasets: [{
            label: 'Guest Votes (Simulated)',
            data: top.map(x => x.votes),
            backgroundColor: 'rgba(240,192,64,0.65)',
            borderColor: 'rgba(240,192,64,1)'
          }]
        },
        options: chartOptions()
      });
    }

    const guestActivity = $('#guest-activity');
    if (guestActivity) {
      const items = st?.notifications?.items || [];
      // show last 6 guest actions
      const guestItems = items.filter(x => x.role === 'guest' || !x.role).slice(0, 6);
      guestActivity.innerHTML = '';
      if (!guestItems.length) {
        guestActivity.innerHTML = '<div class="empty-state">No guest activity yet</div>';
      }
      guestItems.forEach((n, i) => {
        guestActivity.innerHTML += `
          <div class="gact">
            <div class="gact-dot" style="background:${i % 2 ? 'rgba(0,229,180,0.8)' : 'rgba(77,127,255,0.8)'}"></div>
            <div>
              <div class="gact-text">${escapeHtml(n.message || 'Guest action')}</div>
              <div class="gact-time">${formatTimeMy(n.at || Date.now())}</div>
            </div>
          </div>
        `;
      });
    }
  }

  // ---------- AI smart simulation ----------
  function renderAISmart(st) {
    const rec = $('#ai-recommendations');
    const pred = $('#ai-predictions');
    if (!rec && !pred) return;

    const q = computeQueueStats(st);
    const missingVerify = st?.queue?.queueItems?.filter(x => x.faceStatus === 'pending').length || 0;

    const tooLongCourse = courseWithLongestQueue(st);

    const estimatedWaitMin = clamp(Math.round(6 + missingVerify * 0.6), 4, 28);
    const estimatedCompletion = clamp(Math.round(45 + q.counts.completed * 8 + (Date.now() % 6)), 20, 95);

    const recList = [
      { t: `AI: ${missingVerify} students belum verify muka`, cls: 'ai-ok' },
      { t: `AI: Queue Course ${tooLongCourse} terlalu panjang`, cls: 'ai-warn' },
      { t: `AI: High guest traffic detected`, cls: 'ai-info' },
      { t: `AI: Smart notification queued for face-failed group`, cls: 'ai-bad' }
    ];

    if (rec) {
      rec.innerHTML = '';
      recList.forEach((x, i) => {
        rec.innerHTML += `
          <div class="srec">
            <div class="srec-idx">${i + 1}</div>
            <div class="srec-text">${escapeHtml(x.t)}</div>
            <div class="srec-rail ${x.cls}"></div>
          </div>
        `;
      });
    }

    if (pred) {
      pred.innerHTML = `
        <div class="spred-grid">
          <div class="spred-box">
            <div class="spred-k">Estimated Waiting Time</div>
            <div class="spred-v">~${estimatedWaitMin} min</div>
            <div class="spred-sub">based on queue step + pending verification</div>
          </div>
          <div class="spred-box">
            <div class="spred-k">Estimated Graduate Completion</div>
            <div class="spred-v">~${estimatedCompletion}%</div>
            <div class="spred-sub">on-stage + completed velocity</div>
          </div>
        </div>
        <div class="spred-btm">Smart Notifications are active · live alerts enabled</div>
      `;
    }
  }

  // ---------- Update loop ----------
  function tick() {
    ensureSeededState();
    const st = getSmartState();
    if (!st) return;

    updateKPI(st);
    renderQueueMain(st);
    renderFacePanel(st);
    renderRightPanel(st);
    renderCoursePanel(st);
    renderReportsCharts(st);
    renderStudentTable(st);
    renderGuestPanel(st);
    renderAISmart(st);

    // subtle: pulse sidebar badge counts etc.
  }

  function addNavBindings() {
    // Keep compatibility with old inline onclick in admin.html if any.
    // New admin.html will call showView('view-dashboard') etc.
    window.showView = (id) => {
      $all('.view').forEach(v => v.classList.remove('active'));
      const el = document.getElementById(id);
      if (el) el.classList.add('active');
    };

    window.logout = () => {
      localStorage.clear();
      window.location.href = 'index.html';
    };

    window.openModal = openModal;
    window.closeModal = closeModal;
  }

  function updateTopbarClock() {
    const timeEl = $('#topbar-time');
    const dateEl = $('#topbar-date');
    if (!timeEl && !dateEl) return;

    const tickFn = () => {
      const now = new Date();
      if (timeEl) timeEl.textContent = formatTimeMy(now.getTime());
      if (dateEl) dateEl.textContent = formatDateMY(now.getTime());
    };

    tickFn();
    setInterval(tickFn, 1000);
  }

  function bootstrap() {
    addNavBindings();
    ensureSeededState();
    updateTopbarClock();
    bindStudentControls();

    tick();
    setInterval(() => {
      // simulate queue movement and smart alerts
      simulateQueueProgress();
      simulateVerificationPulse();
      simulateGuestActivityPulse();
      tick();
    }, 2500);
  }

  // ---------- Simulation mutators to create live feeling ----------
  function simulateQueueProgress() {
    const st = getSmartState();
    if (!st?.queue?.queueItems?.length) return;

    // Move one item forward in step order every tick (demo)
    const stepOrder = st.queue.stepOrder || ['seated', 'waiting', 'verified', 'onstage', 'finished'];
    const idxOf = (step) => stepOrder.indexOf(step);

    const items = st.queue.queueItems;
    const candidates = items.filter(x => x.step !== 'finished');
    if (!candidates.length) return;

    // Prefer waiting -> verified transitions when face is verified
    const waiting = candidates.find(x => x.step === 'waiting' && x.faceStatus === 'verified');
    const current = waiting || candidates[Math.floor(Math.random() * candidates.length)];
    const idx = idxOf(current.step);
    if (idx < 0) return;

    const nextStep = stepOrder[Math.min(stepOrder.length - 1, idx + 1)];

    // If next step is verified but face isn't verified, keep it pending
    if (nextStep === 'verified' && current.faceStatus !== 'verified') {
      // push notification
      pushNotif(`Face verification required again: ${current.name}`);
      return;
    }

    updateSmartState((s) => {
      const it = (s.queue.queueItems || []).find(x => x.id === current.id);
      if (!it) return;
      it.step = nextStep;
      it.updatedAtEpochMs = Date.now();

      // auto-complete notification
      if (nextStep === 'onstage') {
        s.notifications = s.notifications || { items: [] };
        s.notifications.items.unshift({
          id: window.smartconvoStorage?.uid ? window.smartconvoStorage.uid('notif') : `notif_${Date.now()}`,
          at: Date.now(),
          role: 'admin',
          message: `Graduate on stage: ${it.name}`
        });
        s.notifications.items = s.notifications.items.slice(0, 30);
      }
    });
  }

  function simulateVerificationPulse() {
    const st = getSmartState();
    if (!st?.queue?.queueItems?.length) return;

    // Pick one pending item and resolve it sometimes
    const pending = st.queue.queueItems.filter(x => x.faceStatus === 'pending');
    if (!pending.length) return;

    const target = pending[Math.floor(Math.random() * pending.length)];
    const roll = Math.random();

    if (roll < 0.52) {
      updateSmartState((s) => {
        const it = (s.queue.queueItems || []).find(x => x.id === target.id);
        if (!it) return;
        it.faceStatus = 'verified';
        it.updatedAtEpochMs = Date.now();
      });
      updateSmartState((s) => {
        s.notifications = s.notifications || { items: [] };
        s.notifications.items.unshift({
          id: window.smartconvoStorage?.uid ? window.smartconvoStorage.uid('notif') : `notif_${Date.now()}`,
          at: Date.now(),
          role: 'admin',
          message: `Face verified: ${target.name}`
        });
        s.notifications.items = s.notifications.items.slice(0, 30);
      });
    } else if (roll < 0.74) {
      updateSmartState((s) => {
        const it = (s.queue.queueItems || []).find(x => x.id === target.id);
        if (!it) return;
        it.faceStatus = 'failed';
        it.updatedAtEpochMs = Date.now();
      });
      pushNotif(`Face verification failed: ${target.name} · needs re-scan (demo)`);
    }
  }

  function simulateGuestActivityPulse() {
    // Generate guest votes activity in a safe, front-end only manner.
    const st = getSmartState();
    if (!st?.awards?.voting) return;

    const locked = !!st.awards.voting.locked;
    // if voting locked, increase votes less frequently
    const chance = locked ? 0.28 : 0.45;
    if (Math.random() > chance) return;

    const candidates = st.awards.voting.candidates || [];
    if (!candidates.length) return;

    const pick = candidates[Math.floor(Math.random() * Math.min(6, candidates.length))];
    updateSmartState((s) => {
      s.awards.voting.votes = s.awards.voting.votes || {};
      s.awards.voting.votes[pick] = (s.awards.voting.votes[pick] || 0) + 1;
      s.awards.voting.lastUpdatedAtEpochMs = Date.now();
    });

    // create notification as guest action
    if (Math.random() < 0.55) {
      updateSmartState((s) => {
        s.notifications = s.notifications || { items: [] };
        s.notifications.items.unshift({
          id: window.smartconvoStorage?.uid ? window.smartconvoStorage.uid('notif') : `notif_${Date.now()}`,
          at: Date.now(),
          role: 'guest',
          message: `Guest voted for ${lookupStudentName(getSmartState(), pick) || 'a nominee'} (+1)`
        });
        s.notifications.items = s.notifications.items.slice(0, 30);
      });
    }
  }

  // ---------- Bind window-level exports ----------
  window.__smartconvo_admin = {
    tick,
    toast
  };

  // start
  document.addEventListener('DOMContentLoaded', bootstrap);

})();

