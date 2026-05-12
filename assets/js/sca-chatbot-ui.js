/* sca-chatbot-ui.js
 * Floating SCA (Smart Convo Assistant) chatbot UI.
 * Requirements implemented:
 * - FAQ system
 * - Queue explanation
 * - Navigation helper
 * - Graduation guide
 * - “AI assistant feel”
 *
 * Data is simulated (LocalStorage threads + rule-based responses).
 */

(function () {
  const BOT_NAME = 'SCA';

  const FAQ = [
    {
      q: 'queue',
      answers: [
        'Queue flow SMARTCONVO: Duduk → Beratur → Verified → Naik Pentas → Selesai.',
        'Semasa “Verified”, sistem face recognition (simulasi) akan sahkan identiti anda.'
      ]
    },
    {
      q: 'verification',
      answers: [
        'Face verification (simulasi) biasanya akan menghasilkan status VERIFIED atau NOT VERIFIED.',
        'Jika gagal, guest akan nampak senarai backup queue sehingga semakan semula selesai.'
      ]
    },
    {
      q: 'voting',
      answers: [
        'Voting pelajar terbaik hanya aktif apabila Admin lock voting dibuka.',
        'Hasil voting dikemaskini secara realtime (simulasi) di portal Guest.'
      ]
    },
    {
      q: 'award',
      answers: [
        'Anugerah SMARTCONVO ada 2 kategori utama: Akademik & Bukan Akademik.',
        'Tambahan: Pelajar Terbaik untuk sesi Jan–Jun dan Jul–Dec.'
      ]
    },
    {
      q: 'help',
      answers: [
        'Panduan cepat: Guest boleh track queue + lihat award gallery. Student boleh verify face + submit pencapaian. Admin boleh uruskan voting, queue dan award assignment.'
      ]
    }
  ];

  function threadKey() {
    const userType = localStorage.getItem('userType') || 'guest';
    const userEmail = localStorage.getItem('userEmail') || 'anon';
    return `sca_${userType}_${userEmail}`;
  }

  function getThread() {
    const st = window.smartconvoStorage ? window.smartconvoStorage.getState() : null;
    if (!st || !st.chat || !st.chat.threads) return [];
    return st.chat.threads[threadKey()] || [];
  }

  function setThread(messages) {
    if (!window.smartconvoStorage) return;
    window.smartconvoStorage.update((st) => {
      st.chat.threads[threadKey()] = messages;
    });
  }

  function formatTime(ts) {
    try {
      return new Date(ts).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  function defaultBotReply(userText) {
    const text = (userText || '').toLowerCase();
    const hit = FAQ.find(f => text.includes(f.q));
    if (hit) {
      // choose first answer for deterministic UX
      return hit.answers[0];
    }

    // route helper
    if (text.includes('guest')) return 'Anda boleh masuk Guest Portal untuk lihat queue realtime dan award gallery.';
    if (text.includes('student')) return 'Anda boleh masuk Student Portal untuk face verification (simulasi) dan auto queue number.';
    if (text.includes('admin')) return 'Anda boleh masuk Admin Portal untuk dashboard, voting control dan session management.';

    return 'Saya SCA. Cuba tanya tentang queue, verification, voting, atau award. Untuk mula, tulis: “queue flow”.';
  }

  function ensureStyles() {
    if (document.getElementById('sca-chat-styles')) return;
    const style = document.createElement('style');
    style.id = 'sca-chat-styles';
    style.textContent = `
      .sca-bubble-wrap{position:fixed;right:18px;bottom:18px;z-index:9999;}
      .sca-fab{width:56px;height:56px;border-radius:18px;border:1px solid rgba(0,229,180,0.25);background:rgba(0,229,180,0.1);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,0.25);transition:transform .2s, background .2s;}
      .sca-fab:hover{transform:translateY(-2px);background:rgba(0,229,180,0.16);}
      .sca-fab svg{width:22px;height:22px;stroke:var(--accent);}
      .sca-panel{position:absolute;right:0;bottom:66px;width:min(360px, calc(100vw - 36px));height:420px;display:flex;flex-direction:column;border-radius:18px;border:1px solid rgba(255,255,255,0.10);background:rgba(8,10,14,0.92);backdrop-filter:blur(20px);box-shadow:0 20px 60px rgba(0,0,0,0.55);overflow:hidden;transform:translateY(12px);opacity:0;pointer-events:none;transition:opacity .22s ease, transform .22s ease;}
      .sca-panel.open{opacity:1;transform:translateY(0);pointer-events:auto;}
      .sca-head{padding:14px 14px 10px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.08);}
      .sca-brand{display:flex;align-items:center;gap:10px;}
      .sca-avatar{width:30px;height:30px;border-radius:12px;background:rgba(0,229,180,0.1);border:1px solid rgba(0,229,180,0.25);display:flex;align-items:center;justify-content:center;}
      .sca-avatar svg{width:14px;height:14px;stroke:var(--accent);}
      .sca-title{font-family:'Bebas Neue';letter-spacing:3px;font-size:1.05rem;}
      .sca-close{background:none;border:none;color:rgba(255,255,255,0.45);cursor:pointer;font-family:'DM Mono';letter-spacing:1px;}
      .sca-body{flex:1;padding:14px;overflow:auto;display:flex;flex-direction:column;gap:10px;}
      .sca-msg{max-width:85%;padding:10px 12px;border-radius:14px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);font-family:'DM Mono';font-size:0.72rem;letter-spacing:0.3px;color:rgba(255,255,255,0.75);}
      .sca-msg.user{margin-left:auto;background:rgba(0,229,180,0.08);border-color:rgba(0,229,180,0.22);color:rgba(255,255,255,0.9);}
      .sca-msg.bot{margin-right:auto;}
      .sca-meta{margin-top:4px;font-size:0.58rem;color:rgba(255,255,255,0.35);}
      .sca-foot{padding:12px;border-top:1px solid rgba(255,255,255,0.08);display:flex;gap:10px;align-items:center;}
      .sca-input{flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.10);border-radius:12px;padding:10px 12px;color:var(--fg);font-family:'DM Mono';font-size:0.72rem;outline:none;}
      .sca-send{background:var(--accent);border:none;border-radius:12px;padding:10px 14px;color:#06080b;font-family:'Bebas Neue';letter-spacing:3px;cursor:pointer;transition:transform .2s;}
      .sca-send:active{transform:scale(0.98);}
      .sca-quick{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;}
      .sca-chip{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:100px;padding:7px 10px;font-family:'DM Mono';font-size:0.62rem;letter-spacing:1px;color:rgba(255,255,255,0.5);cursor:pointer;}
      .sca-typing{display:inline-flex;gap:6px;align-items:center;}
      .sca-dot{width:6px;height:6px;border-radius:50%;background:var(--accent);opacity:.35;animation:sca-bounce 1.0s infinite;}
      .sca-dot:nth-child(2){animation-delay:.15s}.sca-dot:nth-child(3){animation-delay:.3s}
      @keyframes sca-bounce{0%,100%{transform:translateY(0);opacity:.25}50%{transform:translateY(-4px);opacity:.9}}
    `;
    document.head.appendChild(style);
  }

  function mountSCAChat() {
    ensureStyles();
    const wrap = document.createElement('div');
    wrap.className = 'sca-bubble-wrap';
    wrap.innerHTML = `
      <div class="sca-panel" id="sca-panel">
        <div class="sca-head">
          <div class="sca-brand">
            <div class="sca-avatar" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a7 7 0 0 0-7 7c0 2.5 1 4.2 2.7 5.6V21l4.3-2 4.3 2v-6.4C18 13.2 19 11.5 19 9a7 7 0 0 0-7-7z"/>
              </svg>
            </div>
            <div class="sca-title">SCA</div>
          </div>
          <button class="sca-close" id="sca-close" type="button">Close</button>
        </div>
        <div class="sca-body" id="sca-body"></div>
        <div class="sca-foot">
          <div style="display:none" class="sca-quick" id="sca-quick"></div>
          <input class="sca-input" id="sca-input" placeholder="Tanya SCA... (queue, verification, voting, award)" />
          <button class="sca-send" id="sca-send" type="button">Send</button>
        </div>
      </div>

      <button class="sca-fab" id="sca-fab" type="button" aria-label="Open SCA chatbot">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>
        </svg>
      </button>
    `;
    document.body.appendChild(wrap);

    const panel = wrap.querySelector('#sca-panel');
    const fab = wrap.querySelector('#sca-fab');
    const close = wrap.querySelector('#sca-close');
    const body = wrap.querySelector('#sca-body');
    const input = wrap.querySelector('#sca-input');
    const send = wrap.querySelector('#sca-send');

    function addMsg(role, text) {
      const msg = document.createElement('div');
      msg.className = `sca-msg ${role === 'user' ? 'user' : 'bot'}`;
      const metaTs = formatTime(Date.now());
      msg.innerHTML = `
        <div>${escapeHtml(text)}</div>
        <div class="sca-meta">${role === 'user' ? 'You' : BOT_NAME} · ${metaTs}</div>
      `;
      body.appendChild(msg);
      body.scrollTop = body.scrollHeight;
      return msg;
    }

    function escapeHtml(str) {
      return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '<')
        .replaceAll('>', '>')
        .replaceAll('"', '"')
        .replaceAll("'", '&#039;');
    }

    function renderThread() {
      body.innerHTML = '';
      const thread = getThread();
      if (!thread.length) {
        addMsg('bot', 'Hi! I am SCA. Ask me about queue flow, face verification, voting, or awards.');
        return;
      }
      thread.slice(-10).forEach(m => addMsg(m.role, m.text));
    }

    renderThread();

    function saveToThread(userText, botText) {
      const st = window.smartconvoStorage;
      if (!st) return;
      const msgs = getThread();
      msgs.push({ role: 'user', text: userText, at: Date.now() });
      msgs.push({ role: 'assistant', text: botText, at: Date.now() + 10 });
      setThread(msgs);
    }

    function sendMessage() {
      const t = (input.value || '').trim();
      if (!t) return;
      input.value = '';

      addMsg('user', t);

      // typing indicator
      const typing = document.createElement('div');
      typing.className = 'sca-msg bot';
      typing.innerHTML = `
        <div class="sca-typing" aria-label="SCA is typing">
          <span class="sca-dot"></span><span class="sca-dot"></span><span class="sca-dot"></span>
        </div>
      `;
      body.appendChild(typing);
      body.scrollTop = body.scrollHeight;

      setTimeout(() => {
        typing.remove();
        const reply = defaultBotReply(t);
        addMsg('bot', reply);
        saveToThread(t, reply);
      }, 650);
    }

    fab.addEventListener('click', () => {
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) {
        input.focus();
      }
    });

    close.addEventListener('click', () => panel.classList.remove('open'));
    send.addEventListener('click', sendMessage);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  window.mountSCAChatbot = mountSCAChat;
})();

