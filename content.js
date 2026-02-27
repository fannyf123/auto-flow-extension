// ══════════════════════════════════════════════════════
//  Auto Flow DIY — Content Script v3.0
//  Based on actual Google Flow UI (Nano Banana / Imagen 4)
// ══════════════════════════════════════════════════════

let imageRunning = false;
let videoRunning = false;

const sleep  = ms  => new Promise(r => setTimeout(r, ms));
const rand   = (a,b) => Math.floor(Math.random()*(b-a+1))+a;

// ── Status reporter ────────────────────────────────────
function reportImage(status, detail='', percent=null, log='', logType='info') {
  chrome.runtime.sendMessage({ type:'IMAGE_PROGRESS', status, detail, percent, log, logType });
}
function reportVideo(status, detail='', percent=null) {
  chrome.runtime.sendMessage({ type:'VIDEO_PROGRESS', status, detail, percent });
}

// ── Wait for element (retry) ───────────────────────────
async function waitForEl(selector, timeout=20000) {
  const t = Date.now();
  while (Date.now()-t < timeout) {
    const el = document.querySelector(selector);
    if (el) return el;
    await sleep(400);
  }
  return null;
}

// ── Find button by exact or partial text ───────────────
function findBtn(text, exact=false) {
  return [...document.querySelectorAll('button')].find(b =>
    exact ? b.textContent.trim() === text
           : b.textContent.trim().toLowerCase().includes(text.toLowerCase())
  );
}

// ── Find any element by text ───────────────────────────
function findElByText(tag, text) {
  return [...document.querySelectorAll(tag)].find(el =>
    el.textContent.trim().toLowerCase().includes(text.toLowerCase())
  );
}

// ═══════════════════════════════════════════════════════
//  STEP 1 — Fill Prompt
// ═══════════════════════════════════════════════════════
async function fillPrompt(text) {
  // Selector dari placeholder "What do you want to create?"
  let el = document.querySelector('textarea[placeholder*="create"]');
  if (!el) el = document.querySelector('textarea[placeholder*="want"]');
  if (!el) el = document.querySelector('textarea');
  if (!el) el = document.querySelector('[contenteditable="true"]');
  if (!el) throw new Error('Prompt input tidak ditemukan');

  el.focus();
  // Clear existing
  el.select?.();
  document.execCommand('selectAll', false, null);

  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
    setter.call(el, text);
  } else {
    document.execCommand('insertText', false, text);
  }
  el.dispatchEvent(new Event('input',  { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(500);
}

// ═══════════════════════════════════════════════════════
//  STEP 2 — Click Image / Video tab
// ═══════════════════════════════════════════════════════
async function selectMode(mode) {
  // mode: 'Image' or 'Video'
  const btn = [...document.querySelectorAll('button')].find(b =>
    b.textContent.trim() === mode
  );
  if (btn) { btn.click(); await sleep(600); }
}

// ═══════════════════════════════════════════════════════
//  STEP 3 — Select Orientation (Landscape / Portrait)
// ═══════════════════════════════════════════════════════
async function selectOrientation(orientation) {
  // orientation: 'Landscape' or 'Portrait'
  const btn = [...document.querySelectorAll('button')].find(b =>
    b.textContent.trim().toLowerCase().includes(orientation.toLowerCase())
  );
  if (btn) { btn.click(); await sleep(500); }
}

// ═══════════════════════════════════════════════════════
//  STEP 4 — Select Count (x1 / x2 / x3 / x4)
// ═══════════════════════════════════════════════════════
async function selectCount(count) {
  // count: 'x1','x2','x3','x4'
  const btn = [...document.querySelectorAll('button')].find(b =>
    b.textContent.trim() === count
  );
  if (btn) { btn.click(); await sleep(500); }
}

// ═══════════════════════════════════════════════════════
//  STEP 5 — Select Model from dropdown
// ═══════════════════════════════════════════════════════
async function selectModel(modelName) {
  // Buka dropdown model (tombol yang menampilkan nama model aktif)
  const dropdowns = [...document.querySelectorAll('button')].filter(b =>
    b.textContent.includes('Nano Banana') || b.textContent.includes('Imagen')
  );
  if (!dropdowns.length) return;

  // Klik dropdown pertama (current model button)
  dropdowns[0].click();
  await sleep(700);

  // Cari dan klik model yang diinginkan
  const modelBtn = [...document.querySelectorAll('button, li, [role="option"], div')].find(el => {
    const t = el.textContent.trim();
    return t.toLowerCase().includes(modelName.toLowerCase()) &&
           t.length < 60; // hindari match ke container besar
  });
  if (modelBtn) { modelBtn.click(); await sleep(600); }
}

// ═══════════════════════════════════════════════════════
//  STEP 6 — Set View Mode (Batch) via settings gear
// ═══════════════════════════════════════════════════════
async function setViewModeBatch(useBatch) {
  // Klik gear/settings icon di top right
  const gearBtn = document.querySelector('[aria-label*="setting"], [aria-label*="Setting"], button svg[viewBox]');
  // Coba cari via title atau aria-label
  const settingBtns = [...document.querySelectorAll('button')].filter(b =>
    b.getAttribute('aria-label')?.toLowerCase().includes('setting') ||
    b.title?.toLowerCase().includes('setting') ||
    b.querySelector('svg')
  );

  // Flow settings icon biasanya svg tanpa teks — skip jika tidak ada label
  // Logic ini opsional, user bisa set manual sekali
  // Untuk automation kita fokus ke generate saja
  await sleep(300);
}

// ═══════════════════════════════════════════════════════
//  STEP 7 — Click Generate button (arrow → )
// ═══════════════════════════════════════════════════════
async function clickGenerate() {
  // Tombol generate di Flow adalah arrow button di kanan bawah prompt
  // Biasanya berupa <button> dengan svg arrow atau aria-label submit/generate
  let btn =
    document.querySelector('button[aria-label*="Generate"]') ||
    document.querySelector('button[aria-label*="generate"]') ||
    document.querySelector('button[aria-label*="Submit"]') ||
    document.querySelector('button[type="submit"]');

  // Fallback: cari tombol → (arrow right)
  if (!btn) {
    btn = [...document.querySelectorAll('button')].find(b => {
      const label = (b.getAttribute('aria-label')||'').toLowerCase();
      const text  = b.textContent.trim();
      return label.includes('generate') || label.includes('submit') ||
             text === '→' || text === '▶';
    });
  }

  // Fallback akhir: tombol terakhir di area prompt (biasanya generate)
  if (!btn) {
    const allBtns = [...document.querySelectorAll('button')];
    // cari yang punya Nano Banana text di dekatnya (area bawah)
    btn = allBtns.find(b => {
      const parent = b.closest('form, [class*="prompt"], [class*="input"]');
      return parent && b.querySelector('svg');
    });
  }

  if (!btn) throw new Error('Tombol Generate tidak ditemukan — coba inspect element dan report ke developer');
  btn.click();
  await sleep(1500);
}

// ═══════════════════════════════════════════════════════
//  STEP 8 — Wait for images to appear
// ═══════════════════════════════════════════════════════
async function waitForImages(count, waitTime) {
  const deadline = Date.now() + waitTime;
  while (Date.now() < deadline) {
    // Cari gambar hasil generate (bukan logo/icon)
    const imgs = [...document.querySelectorAll('img')].filter(img =>
      img.naturalWidth  > 150 &&
      img.naturalHeight > 150 &&
      !img.src.includes('logo') &&
      !img.src.includes('icon') &&
      !img.src.includes('avatar')
    );
    if (imgs.length >= count) return imgs;
    await sleep(2000);
  }
  // Return whatever is there
  return [...document.querySelectorAll('img')].filter(img =>
    img.naturalWidth > 150 && img.naturalHeight > 150
  );
}

// ═══════════════════════════════════════════════════════
//  STEP 9 — Download images (3-dot → Download → resolution)
// ═══════════════════════════════════════════════════════
async function downloadImages(count, resolution, taskIndex) {
  // Cari semua tile/card gambar hasil generate
  // Gambar yang baru muncul setelah generate ada di akhir list
  const imageContainers = [...document.querySelectorAll(
    '[class*="tile"], [class*="card"], [class*="result"], [class*="image-item"], [class*="grid-item"]'
  )].slice(-count); // ambil N terakhir sesuai jumlah generate

  let downloadCount = 0;

  for (let i = 0; i < count; i++) {
    const container = imageContainers[i];
    if (!container) continue;

    // Hover agar 3-dot muncul
    container.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    container.dispatchEvent(new MouseEvent('mouseover',  { bubbles: true }));
    await sleep(500);

    // Klik tombol 3-dot (⋮) pada gambar
    const dotsBtn =
      container.querySelector('button[aria-label*="more"], button[aria-label*="More"], button[aria-label*="option"]') ||
      [...container.querySelectorAll('button')].find(b =>
        b.textContent.trim() === '⋮' ||
        b.textContent.trim() === '...' ||
        b.getAttribute('aria-label')?.toLowerCase().includes('more')
      );

    if (!dotsBtn) {
      console.warn('[AutoFlow] 3-dot button tidak ditemukan untuk gambar', i+1);
      continue;
    }

    dotsBtn.click();
    await sleep(600);

    // Klik "Download" di menu dropdown
    const dlItem = [...document.querySelectorAll('li, [role="menuitem"], button, div')].find(el =>
      el.textContent.trim().toLowerCase().startsWith('download') &&
      el.textContent.trim().length < 40
    );

    if (dlItem) {
      dlItem.click();
      await sleep(500);
    } else {
      // Tutup menu dan coba direct download dari src
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await sleep(300);

      const img = container.querySelector('img');
      if (img && img.src) {
        chrome.runtime.sendMessage({
          type: 'DOWNLOAD',
          url: img.src,
          filename: `image-${String(taskIndex+1).padStart(3,'0')}-${i+1}.png`
        });
        downloadCount++;
      }
      continue;
    }

    // Pilih resolusi: 1K / 2K / 4K
    await sleep(400);
    const resBtn = [...document.querySelectorAll('li, [role="menuitem"], button, div')].find(el => {
      const t = el.textContent.trim();
      return t === resolution || t.startsWith(resolution);
    });

    if (resBtn) {
      resBtn.click();
      downloadCount++;
      await sleep(rand(800, 1200));
    } else {
      // Jika resolusi tidak ada, klik download apapun yang tersedia
      const anyDl = [...document.querySelectorAll('li, [role="menuitem"]')].find(el =>
        /\dK|download/i.test(el.textContent)
      );
      if (anyDl) { anyDl.click(); downloadCount++; }
      await sleep(800);
    }

    // Tutup menu jika masih terbuka
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    await sleep(500);
  }

  return downloadCount;
}

// ═══════════════════════════════════════════════════════
//  MAIN LOOP — IMAGE
// ═══════════════════════════════════════════════════════
async function runImage(config) {
  const { prompts, startFrom, model, orientation, count, waitTime, resolution } = config;
  let i = startFrom;
  imageRunning = true;

  // Setup sekali di awal: pilih mode Image
  try { await selectMode('Image'); } catch(e) {}

  while (imageRunning && i < prompts.length) {
    const pct = Math.round((i / prompts.length) * 100);
    const prompt = prompts[i];

    reportImage(
      `🖼️ Task ${i+1}/${prompts.length}`,
      `"${prompt.substring(0,50)}"`,
      pct, `Task ${i+1}: ${prompt.substring(0,40)}...`, 'info'
    );

    try {
      // Setiap task: set ulang semua setting
      await selectOrientation(orientation);     // Landscape / Portrait
      await selectCount(count);                 // x1 / x2 / x3 / x4
      await selectModel(model);                 // Nano Banana 2, dst
      await fillPrompt(prompt);

      reportImage(`⏳ Generating...`, `Model: ${model} | ${orientation} | ${count}`, pct);
      await clickGenerate();

      // Hitung berapa gambar yang di-generate
      const numImages = parseInt(count.replace('x','')) || 1;
      await waitForImages(numImages, waitTime);

      reportImage(`💾 Downloading...`, `Resolusi: ${resolution}`, pct);
      const downloaded = await downloadImages(numImages, resolution, i);

      reportImage(
        `✅ Task ${i+1} selesai! (${downloaded} gambar)`, '', pct,
        `✅ Task ${i+1}: ${downloaded} gambar ter-download (${resolution})`, 'ok'
      );
    } catch(err) {
      reportImage(
        `❌ Error task ${i+1}`, err.message, pct,
        `❌ Task ${i+1}: ${err.message}`, 'err'
      );
      console.error('[AutoFlow Image]', err);
    }

    i++;
    await sleep(rand(2000, 3500));
  }

  if (imageRunning) {
    reportImage('🎉 Semua task selesai!', '', 100, '🎉 All done!', 'ok');
  }
  imageRunning = false;
}

// ═══════════════════════════════════════════════════════
//  MAIN LOOP — VIDEO (unchanged structure)
// ═══════════════════════════════════════════════════════
async function runVideo(config) {
  const { prompts, startFrom, waitTime } = config;
  let i = startFrom;
  videoRunning = true;

  try { await selectMode('Video'); } catch(e) {}

  while (videoRunning && i < prompts.length) {
    const pct = Math.round((i / prompts.length) * 100);
    reportVideo(`✏️ Task ${i+1}/${prompts.length}`, `"${prompts[i].substring(0,50)}"`, pct);
    try {
      await fillPrompt(prompts[i]);
      await clickGenerate();
      reportVideo(`⏳ Rendering...`, `Est. ${waitTime/1000}s`, pct);
      await sleep(waitTime);
      reportVideo(`✅ Task ${i+1} selesai!`, '', pct);
    } catch(err) {
      reportVideo(`❌ Error task ${i+1}`, err.message, pct);
    }
    i++;
    await sleep(rand(2000, 3500));
  }

  if (videoRunning) reportVideo('🎉 Semua task selesai!', '', 100);
  videoRunning = false;
}

// ── Message Listener ───────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'START')        runImage(msg.config);
  if (msg.action === 'STOP')         imageRunning = false;
  if (msg.action === 'START_VIDEO')  runVideo(msg.config);
  if (msg.action === 'STOP_VIDEO')   videoRunning = false;
  sendResponse({ ok: true });
  return true;
});
