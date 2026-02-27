// ── State ──────────────────────────────────────────────
let running = false;
let currentIndex = 0;
let config = null;

// ── Helper: delay ──────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Kirim status ke popup ──────────────────────────────
function sendStatus(status, detail = '') {
  chrome.runtime.sendMessage({ type: 'PROGRESS', status, detail });
}

// ── Cari elemen dengan retry ───────────────────────────
async function waitForElement(selector, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const el = document.querySelector(selector);
    if (el) return el;
    await sleep(500);
  }
  return null;
}

// ── Isi prompt ke textarea ─────────────────────────────
async function fillPrompt(text) {
  const textarea = await waitForElement(
    'textarea[placeholder], div[contenteditable="true"]'
  );
  if (!textarea) throw new Error('Prompt textarea not found');

  textarea.focus();

  // Trigger React synthetic event
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value'
  ).set;
  nativeInputValueSetter.call(textarea, text);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(500);
}

// ── Klik tombol Generate ───────────────────────────────
async function clickGenerate() {
  const buttons = [...document.querySelectorAll('button')];
  const generateBtn = buttons.find(b =>
    /generate|create|run/i.test(b.textContent)
  );
  if (!generateBtn) throw new Error('Generate button not found');
  generateBtn.click();
  await sleep(2000);
}

// ── Tunggu video selesai render ────────────────────────
async function waitForVideoComplete(waitTime) {
  sendStatus('⏳ Menunggu render...', `Est. ${waitTime / 1000}s`);
  await sleep(waitTime);
  const videos = document.querySelectorAll('video');
  return videos.length > 0;
}

// ── Download video terbaru ─────────────────────────────
async function downloadLatestVideo(index) {
  const videos = [...document.querySelectorAll('video')];
  if (!videos.length) return;

  const lastVideo = videos[videos.length - 1];
  const src = lastVideo.src || lastVideo.currentSrc;
  if (!src) return;

  chrome.runtime.sendMessage({
    type: 'DOWNLOAD',
    url: src,
    filename: `auto-flow-${String(index + 1).padStart(4, '0')}.mp4`
  });
  await sleep(1000);
}

// ── Main Loop ──────────────────────────────────────────
async function runAutomation() {
  const { prompts, startFrom, waitTime } = config;
  currentIndex = startFrom;

  sendStatus(`🚀 Starting dari task ${startFrom + 1}/${prompts.length}`);

  while (running && currentIndex < prompts.length) {
    const prompt = prompts[currentIndex];
    sendStatus(
      `✏️ Task ${currentIndex + 1}/${prompts.length}`,
      `Prompt: "${prompt.substring(0, 40)}..."`
    );

    try {
      await fillPrompt(prompt);
      await clickGenerate();
      await waitForVideoComplete(waitTime);
      await downloadLatestVideo(currentIndex);
      sendStatus(`✅ Task ${currentIndex + 1} selesai!`);
    } catch (err) {
      sendStatus(`❌ Error task ${currentIndex + 1}: ${err.message}`);
      console.error('[AutoFlow]', err);
    }

    currentIndex++;
    await sleep(2000);
  }

  if (running) sendStatus('🎉 Semua task selesai!');
}

// ── Message Listener ───────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'START') {
    running = true;
    config = msg.config;
    runAutomation();
    sendResponse({ ok: true });
  } else if (msg.action === 'STOP') {
    running = false;
    sendResponse({ ok: true });
  }
  return true;
});
