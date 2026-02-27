// ══════════════════════════════════════════════════════
//  Auto Flow DIY — Content Script v2.0
//  Runs on: https://labs.google/flow/*
// ══════════════════════════════════════════════════════

let videoRunning = false;
let imageRunning = false;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ── Status reporter ────────────────────────────────────
function reportVideo(status, detail = '', percent = null) {
  chrome.runtime.sendMessage({ type: 'VIDEO_PROGRESS', status, detail, percent });
}
function reportImage(status, detail = '', percent = null, log = '', logType = 'info') {
  chrome.runtime.sendMessage({ type: 'IMAGE_PROGRESS', status, detail, percent, log, logType });
}

// ── Wait for element ───────────────────────────────────
async function waitForElement(selector, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const el = document.querySelector(selector);
    if (el) return el;
    await sleep(400);
  }
  return null;
}

// ── Fill prompt (handles both textarea & contenteditable) ──
async function fillPrompt(text) {
  // Try textarea first
  let el = document.querySelector('textarea');

  if (el) {
    el.focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(el, text);
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(400);
    return;
  }

  // Try contenteditable div
  el = document.querySelector('[contenteditable="true"]');
  if (el) {
    el.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(400);
    return;
  }

  throw new Error('Prompt input tidak ditemukan — pastikan halaman Flow sudah terbuka');
}

// ── Click generate button ──────────────────────────────
async function clickGenerate() {
  const allBtns = [...document.querySelectorAll('button')];
  let btn = allBtns.find(b => /^(generate|create|run|go)$/i.test(b.textContent.trim()));
  if (!btn) btn = allBtns.find(b => /generate|create/i.test(b.textContent));
  if (!btn) throw new Error('Tombol generate tidak ditemukan');
  btn.click();
  await sleep(rand(1500, 2500));
}

// ── Click image-mode generate button ──────────────────
async function clickImageGenerate() {
  const allBtns = [...document.querySelectorAll('button')];
  // Cari tombol yang berkaitan dengan image generation di Flow
  let btn = allBtns.find(b => /generate image|create image|generate/i.test(b.textContent.trim()));
  if (!btn) btn = allBtns.find(b => /generate|create/i.test(b.textContent));
  if (!btn) throw new Error('Tombol generate image tidak ditemukan');
  btn.click();
  await sleep(rand(1500, 2500));
}

// ── Wait for video to appear ───────────────────────────
async function waitForVideo(waitTime) {
  const initialCount = document.querySelectorAll('video').length;
  const deadline = Date.now() + waitTime;
  while (Date.now() < deadline) {
    const current = document.querySelectorAll('video').length;
    if (current > initialCount) return true;
    await sleep(2000);
  }
  return document.querySelectorAll('video').length > 0;
}

// ── Wait for new image to appear ──────────────────────
async function waitForImage(waitTime) {
  const initialCount = document.querySelectorAll('img[src*="blob"], img[src*="data:"]').length;
  const deadline = Date.now() + waitTime;
  while (Date.now() < deadline) {
    const current = document.querySelectorAll('img[src*="blob"], img[src*="data:"]').length;
    if (current > initialCount) return true;
    await sleep(1000);
  }
  return false;
}

// ── Download latest video ──────────────────────────────
async function downloadVideo(index) {
  const videos = [...document.querySelectorAll('video')];
  if (!videos.length) return;
  const src = videos[videos.length - 1].src || videos[videos.length - 1].currentSrc;
  if (!src || src.startsWith('blob:')) {
    console.warn('[AutoFlow] Video src adalah blob URL, download manual diperlukan');
    return;
  }
  chrome.runtime.sendMessage({
    type: 'DOWNLOAD',
    url: src,
    filename: `video-${String(index + 1).padStart(4, '0')}.mp4`
  });
  await sleep(1000);
}

// ── Download latest image ──────────────────────────────
async function downloadImage(index) {
  // Cari tombol download jika ada
  const allBtns = [...document.querySelectorAll('button, a')];
  const dlBtn = allBtns.find(b => /download/i.test(b.textContent) || /download/i.test(b.getAttribute('aria-label') || ''));
  if (dlBtn) {
    dlBtn.click();
    await sleep(1000);
    return;
  }

  // Fallback: cari img terbaru dan download via URL
  const imgs = [...document.querySelectorAll('img')];
  const validImg = imgs.reverse().find(img =>
    img.src &&
    !img.src.includes('icon') &&
    !img.src.includes('logo') &&
    img.naturalWidth > 100
  );
  if (!validImg) return;

  chrome.runtime.sendMessage({
    type: 'DOWNLOAD',
    url: validImg.src,
    filename: `image-${String(index + 1).padStart(4, '0')}.png`
  });
  await sleep(1000);
}

// ══════════════════════════════════
//  MAIN LOOP — VIDEO
// ══════════════════════════════════
async function runVideo(config) {
  const { prompts, startFrom, waitTime } = config;
  let i = startFrom;
  videoRunning = true;

  while (videoRunning && i < prompts.length) {
    const pct = Math.round((i / prompts.length) * 100);
    reportVideo(
      `✏️ Task ${i + 1}/${prompts.length}`,
      `"${prompts[i].substring(0, 50)}..."`,
      pct
    );

    try {
      await fillPrompt(prompts[i]);
      await clickGenerate();
      reportVideo(`⏳ Rendering...`, `Est. ${waitTime / 1000}s`, pct);
      await waitForVideo(waitTime);
      await downloadVideo(i);
      reportVideo(`✅ Task ${i + 1} selesai!`, '', pct);
    } catch (err) {
      reportVideo(`❌ Error task ${i + 1}`, err.message, pct);
      console.error('[AutoFlow Video]', err);
    }

    i++;
    await sleep(rand(2000, 3500));
  }

  if (videoRunning) reportVideo('🎉 Semua task selesai!', '', 100);
  videoRunning = false;
}

// ══════════════════════════════════
//  MAIN LOOP — IMAGE
// ══════════════════════════════════
async function runImage(config) {
  const { prompts, startFrom, waitTime } = config;
  let i = startFrom;
  imageRunning = true;

  while (imageRunning && i < prompts.length) {
    const pct = Math.round((i / prompts.length) * 100);
    reportImage(
      `🖼️ Task ${i + 1}/${prompts.length}`,
      `"${prompts[i].substring(0, 50)}"`,
      pct,
      `Task ${i + 1}: ${prompts[i].substring(0, 40)}...`,
      'info'
    );

    try {
      await fillPrompt(prompts[i]);
      await clickImageGenerate();
      reportImage(`⏳ Generating image...`, `Est. ${waitTime / 1000}s`, pct);
      await waitForImage(waitTime);
      await downloadImage(i);
      reportImage(
        `✅ Task ${i + 1} selesai!`, '', pct,
        `✅ Image ${i + 1} berhasil di-generate`, 'ok'
      );
    } catch (err) {
      reportImage(
        `❌ Error task ${i + 1}`, err.message, pct,
        `❌ Error task ${i + 1}: ${err.message}`, 'err'
      );
      console.error('[AutoFlow Image]', err);
    }

    i++;
    await sleep(rand(1500, 2500));
  }

  if (imageRunning) {
    reportImage('🎉 Semua image selesai!', '', 100, '🎉 All done!', 'ok');
  }
  imageRunning = false;
}

// ── Message Listener ───────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'START')       { runVideo(msg.config); }
  if (msg.action === 'STOP')        { videoRunning = false; }
  if (msg.action === 'START_IMAGE') { runImage(msg.config); }
  if (msg.action === 'STOP_IMAGE')  { imageRunning = false; }
  sendResponse({ ok: true });
  return true;
});
