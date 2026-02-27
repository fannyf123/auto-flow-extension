// ══════════════════════════════════════════════════════
//  Auto Flow DIY — Side Panel Script v3.0
// ══════════════════════════════════════════════════════

const el = id => document.getElementById(id);

// ── Tab switching ──────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    el('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ── Prompt counter ─────────────────────────────────────
function updateCount(txId, badgeId) {
  const n = el(txId).value.split('\n').filter(l => l.trim()).length;
  el(badgeId).textContent = n;
}
el('i-prompts').addEventListener('input', () => updateCount('i-prompts','i-count'));
el('v-prompts').addEventListener('input', () => updateCount('v-prompts','v-count'));

// ── File load ──────────────────────────────────────────
function setupFile(btnId, inputId, txId, badgeId) {
  el(btnId).addEventListener('click', () => el(inputId).click());
  el(inputId).addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => { el(txId).value = ev.target.result.trim(); updateCount(txId, badgeId); };
    r.readAsText(f);
  });
}
setupFile('i-btnLoad','i-fileInput','i-prompts','i-count');
setupFile('v-btnLoad','v-fileInput','v-prompts','v-count');

// ── Status UI ──────────────────────────────────────────
function setStatus(prefix, status, detail='', pct=null) {
  el(`${prefix}-status`).textContent = status;
  el(`${prefix}-detail`).textContent = detail;
  if (pct !== null) {
    el(`${prefix}-prog-bar`).style.width  = pct+'%';
    el(`${prefix}-prog-label`).textContent = pct+'%';
  }
}

// ── Log ────────────────────────────────────────────────
function addLog(msg, type='info') {
  const logEl = el('i-log');
  const p = document.createElement('p');
  p.className = `log-${type}`;
  const t = new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  p.textContent = `[${t}] ${msg}`;
  logEl.appendChild(p);
  logEl.scrollTop = logEl.scrollHeight;
}

// ── Send to content script ─────────────────────────────
async function sendToContent(action, config) {
  const [tab] = await chrome.tabs.query({ active:true, currentWindow:true });
  if (!tab) { alert('Tidak ada tab aktif!\nPastikan labs.google/flow terbuka.'); return; }
  chrome.tabs.sendMessage(tab.id, { action, config }, resp => {
    if (chrome.runtime.lastError) {
      console.warn('[AutoFlow] Content script belum siap:', chrome.runtime.lastError.message);
    }
  });
}

// ══════════════════════════════════════════════════════
//  TEXT TO IMAGE — Start
// ══════════════════════════════════════════════════════
el('i-btnStart').addEventListener('click', async () => {
  const raw = el('i-prompts').value.trim();
  if (!raw) { setStatus('i','⚠ Masukkan prompts dulu!'); return; }

  const prompts   = raw.split('\n').map(p=>p.trim()).filter(Boolean);
  const startFrom = Math.max(0, parseInt(el('i-startFrom').value)-1);

  const config = {
    prompts,
    startFrom,
    model:       el('i-model').value,
    orientation: el('i-orientation').value,
    count:       el('i-count-gen').value,
    resolution:  el('i-resolution').value,
    waitTime:    parseInt(el('i-waitTime').value) * 1000
  };

  setStatus('i', `🚀 Running... (${prompts.length} prompts)`, '', 0);
  addLog(`Start: ${prompts.length} prompts | Model: ${config.model} | ${config.orientation} | ${config.count} | DL: ${config.resolution}`, 'info');
  sendToContent('START', config);
});

el('i-btnStop').addEventListener('click', () => {
  sendToContent('STOP', {});
  setStatus('i','⏹ Stopped');
  addLog('Stopped by user','err');
});

// ══════════════════════════════════════════════════════
//  TEXT TO VIDEO — Start
// ══════════════════════════════════════════════════════
el('v-btnStart').addEventListener('click', async () => {
  const raw = el('v-prompts').value.trim();
  if (!raw) { setStatus('v','⚠ Masukkan prompts dulu!'); return; }

  const prompts   = raw.split('\n').map(p=>p.trim()).filter(Boolean);
  const startFrom = Math.max(0, parseInt(el('v-startFrom').value)-1);

  const config = {
    prompts, startFrom,
    waitTime: parseInt(el('v-waitTime').value) * 1000
  };

  setStatus('v', `🚀 Running... (${prompts.length} prompts)`, '', 0);
  sendToContent('START_VIDEO', config);
});

el('v-btnStop').addEventListener('click', () => {
  sendToContent('STOP_VIDEO', {});
  setStatus('v','⏹ Stopped');
});

// ── Receive progress from content script ───────────────
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'IMAGE_PROGRESS') {
    setStatus('i', msg.status, msg.detail||'', msg.percent??null);
    if (msg.log) addLog(msg.log, msg.logType||'info');
  }
  if (msg.type === 'VIDEO_PROGRESS') {
    setStatus('v', msg.status, msg.detail||'', msg.percent??null);
  }
});
