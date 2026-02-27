// ── Elemen UI ──────────────────────────────────────────
const el = id => document.getElementById(id);

// Load .txt file
el('btnLoad').addEventListener('click', () => el('fileInput').click());
el('fileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => { el('prompts').value = ev.target.result.trim(); };
  reader.readAsText(file);
});

// Start
el('btnStart').addEventListener('click', async () => {
  const rawPrompts = el('prompts').value.trim();
  if (!rawPrompts) { el('status').textContent = '⚠ Masukkan prompts dulu!'; return; }

  const prompts = rawPrompts.split('\n').map(p => p.trim()).filter(Boolean);
  const startFrom = Math.max(1, parseInt(el('startFrom').value) || 1);
  const config = {
    prompts,
    startFrom: startFrom - 1,
    ratio: el('ratio').value,
    model: el('model').value,
    waitTime: parseInt(el('waitTime').value) * 1000,
    running: true
  };

  await chrome.storage.local.set({ autoFlowConfig: config });
  el('status').textContent = `🚀 Running... (${prompts.length} tasks)`;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: 'START', config });
});

// Stop
el('btnStop').addEventListener('click', async () => {
  await chrome.storage.local.set({ autoFlowConfig: { running: false } });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: 'STOP' });
  el('status').textContent = '⏹ Stopped';
});

// Listener progress update dari content script
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'PROGRESS') {
    el('status').textContent = msg.status;
    el('progress').textContent = msg.detail || '';
  }
});
