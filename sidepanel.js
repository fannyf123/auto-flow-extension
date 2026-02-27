// ══════════════════════════════════════════════════════
//  Auto Flow DIY — Side Panel Script v2.0
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
function updateCount(textareaId, badgeId) {
  const lines = el(textareaId).value.split('\n').filter(l => l.trim()).length;
  el(badgeId).textContent = lines;
}
el('v-prompts').addEventListener('input', () => updateCount('v-prompts', 'v-count'));
el('i-prompts').addEventListener('input', () => updateCount('i-prompts', 'i-count'));

// ── Load .txt file ─────────────────────────────────────
function setupFileLoad(btnId, inputId, textareaId, badgeId) {
  el(btnId).addEventListener('click', () => el(inputId).click());
  el(inputId).addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      el(textareaId).value = ev.target.result.trim();
      updateCount(textareaId, badgeId);
    };
    reader.readAsText(file);
  });
}
setupFileLoad('v-btnLoad', 'v-fileInput', 'v-prompts', 'v-count');
setupFileLoad('i-btnLoad', 'i-fileInput', 'i-prompts', 'i-count');

// ── Update UI status ───────────────────────────────────
function setStatus(prefix, status, detail = '', percent = null) {
  el(`${prefix}-status`).textContent  = status;
  el(`${prefix}-detail`).textContent  = detail;
  if (percent !== null) {
    el(`${prefix}-progress-bar`).style.width = percent + '%';
    el(`${prefix}-progress-label`).textContent = percent + '%';
  }
}

// ── Send message to content script ────────────────────
async function sendToContent(action, config) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) { alert('Tidak ada tab aktif!'); return; }
  try {
    chrome.tabs.sendMessage(tab.id, { action, config });
  } catch (e) {
    console.warn('Content script not ready:', e);
  }
}

// ══════════════════════════════════
//  TEXT TO VIDEO — Start / Stop
// ══════════════════════════════════
el('v-btnStart').addEventListener('click', async () => {
  const raw = el('v-prompts').value.trim();
  if (!raw) { setStatus('v', '⚠ Masukkan prompts dulu!'); return; }

  const prompts = raw.split('\n').map(p => p.trim()).filter(Boolean);
  const startFrom = Math.max(0, parseInt(el('v-startFrom').value) - 1);

  const config = {
    mode: 'video',
    prompts,
    startFrom,
    ratio: el('v-ratio').value,
    model: el('v-model').value,
    waitTime: parseInt(el('v-waitTime').value) * 1000
  };

  await chrome.storage.local.set({ autoFlowConfig: { ...config, running: true } });
  setStatus('v', `🚀 Running... (${prompts.length} tasks)`, '', 0);
  sendToContent('START', config);
});

el('v-btnStop').addEventListener('click', async () => {
  await chrome.storage.local.set({ autoFlowConfig: { running: false } });
  sendToContent('STOP', {});
  setStatus('v', '⏹ Stopped');
});

// ══════════════════════════════════
//  TEXT TO IMAGE — Start / Stop
// ══════════════════════════════════
function addLog(msg, type = 'info') {
  const logEl = el('i-log');
  const p = document.createElement('p');
  p.className = `log-${type}`;
  p.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logEl.appendChild(p);
  logEl.scrollTop = logEl.scrollHeight;
}

el('i-btnStart').addEventListener('click', async () => {
  const raw = el('i-prompts').value.trim();
  if (!raw) { setStatus('i', '⚠ Masukkan prompts dulu!'); return; }

  const prompts = raw.split('\n').map(p => p.trim()).filter(Boolean);
  const startFrom = Math.max(0, parseInt(el('i-startFrom').value) - 1);

  const config = {
    mode: 'image',
    prompts,
    startFrom,
    ratio: el('i-ratio').value,
    model: el('i-model').value,
    waitTime: parseInt(el('i-waitTime').value) * 1000
  };

  await chrome.storage.local.set({ autoFlowImageConfig: { ...config, running: true } });
  setStatus('i', `🚀 Running... (${prompts.length} tasks)`, '', 0);
  addLog(`Starting ${prompts.length} image tasks`, 'info');
  sendToContent('START_IMAGE', config);
});

el('i-btnStop').addEventListener('click', async () => {
  await chrome.storage.local.set({ autoFlowImageConfig: { running: false } });
  sendToContent('STOP_IMAGE', {});
  setStatus('i', '⏹ Stopped');
  addLog('Stopped by user', 'err');
});

// ── Listen progress from content script ───────────────
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'VIDEO_PROGRESS') {
    setStatus('v', msg.status, msg.detail || '', msg.percent ?? null);
  }
  if (msg.type === 'IMAGE_PROGRESS') {
    setStatus('i', msg.status, msg.detail || '', msg.percent ?? null);
    if (msg.log) addLog(msg.log, msg.logType || 'info');
  }
});
