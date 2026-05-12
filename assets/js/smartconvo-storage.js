/* smartconvo-storage.js
 * LocalStorage simulation layer for SMARTCONVO.
 * - Keeps a production-like “single source of truth” in browser.
 * - Designed for easy switch to PHP APIs later (add fetch() in callers).
 */

(function () {
  const KEY = 'smartconvo_v1';

  const DEFAULT_STATE = {
    // Session split for awards & best-student voting
    session: {
      activeHalf: 'jan-jun' // 'jan-jun' | 'jul-dec'
    },

    courses: {
      // Required: IKM Lumut courses (course mapping basis for awards)
      ikmLumut: [
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
      ]
    },

    // Identity & student records
    auth: {
      // admin seeded credentials (UI default is admin/12345)
      admin: { username: 'admin', password: '12345' },

      // In production this should come from backend.
      // Here we store student login + profile.
      students: []
    },

    // Queue state machine
    queue: {
      // step flow: seated -> waiting -> verified -> onstage -> finished
      stepOrder: ['seated', 'waiting', 'verified', 'onstage', 'finished'],
      state: {
        // Next index to advance
        seq: 0,
        currentStep: 'seated',
        // ceremony time reference used for countdown/progress
        ceremonyStartEpochMs: Date.now() + 1000 * 60 * 10 // default: 10 minutes from now
      },
      queueItems: [] // {id, studentId, name, course, faceStatus, queueNo, step, updatedAtEpochMs}
    },

    // Awards
    awards: {
      gallery: {
        akademik: [],
        bukanAkademik: [],
        bestStudent: {
          'jan-jun': [],
          'jul-dec': []
        }
      },
      // best student voting results
      voting: {
        locked: false,
        candidates: [], // candidate studentId
        votes: {}, // {candidateStudentId: number}
        lastUpdatedAtEpochMs: Date.now()
      }
    },

    // Notifications stream simulation
    notifications: {
      items: [] // {id, at, role, message}
    },

    // Chatbot transcripts (per user)
    chat: {
      threads: {} // {threadKey: [{role:'user'|'assistant', text, at}]}
    }
  };

  function safeParse(json, fallback) {
    try {
      return JSON.parse(json);
    } catch (e) {
      return fallback;
    }
  }

  function loadState() {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(DEFAULT_STATE));
      return structuredClone(DEFAULT_STATE);
    }
    const parsed = safeParse(raw, null);
    if (!parsed) {
      localStorage.setItem(KEY, JSON.stringify(DEFAULT_STATE));
      return structuredClone(DEFAULT_STATE);
    }

    // shallow merge for forward compatibility
    return Object.assign(structuredClone(DEFAULT_STATE), parsed);
  }

  function saveState(next) {
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  // Expose a minimal API
  window.smartconvoStorage = {
    KEY,
    DEFAULT_STATE,

    getState() {
      return loadState();
    },

    setState(next) {
      saveState(next);
    },

    update(mutatorFn) {
      const st = loadState();
      mutatorFn(st);
      saveState(st);
      return st;
    },

    uid(prefix = 'id') {
      return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
    },

    // Queue number generator: Q-2026-000001 style
    generateQueueNo(seq) {
      const year = 2026;
      const n = String(seq + 1).padStart(6, '0');
      return `Q-${year}-${n}`;
    },

    // Notifications helper
    pushNotification({ role = 'guest', message = '' }) {
      return window.smartconvoStorage.update((st) => {
        st.notifications.items.unshift({
          id: window.smartconvoStorage.uid('notif'),
          at: Date.now(),
          role,
          message
        });
        st.notifications.items = st.notifications.items.slice(0, 30);
      });
    }
  };
})();

