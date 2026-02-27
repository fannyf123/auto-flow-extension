# ⚡ Auto Flow DIY v2.0 — Chrome Extension

Chrome Extension dengan **Side Panel** untuk otomatisasi bulk generation di [Google Flow AI](https://labs.google/flow).

## ✨ Fitur

- 🎬 **Text to Video** — bulk generate video dengan Veo 3.1 / Veo 2
- 🖼️ **Text to Image** — bulk generate image dengan Nano Banana (Imagen 4)
- 📂 Load prompts dari file `.txt`
- 📊 Progress bar real-time
- 📋 Log panel untuk mode image
- ⏯️ Resume dari task tertentu
- ⏹️ Stop kapan saja
- 🔲 Side Panel (tidak menutup halaman)

## 🚀 Cara Install

1. Download / clone repo ini
2. Buka `chrome://extensions/`
3. Aktifkan **Developer Mode**
4. Klik **Load unpacked** → pilih folder ini
5. Buka [labs.google/flow](https://labs.google/flow)
6. Klik icon extension → **Buka Side Panel**

## 📁 Struktur

```
auto-flow-extension/
├── manifest.json
├── background.js
├── sidepanel.html   ← UI utama (Side Panel)
├── sidepanel.js     ← Logic side panel
├── content.js       ← Automation script
├── popup.html       ← Popup kecil (shortcut buka panel)
├── popup.js
└── README.md
```

## ⚠️ Troubleshooting Selector

Jika automation tidak berjalan, inspect elemen di halaman Flow:
1. `F12` → klik textarea prompt → copy selector
2. Update di `content.js` → fungsi `fillPrompt()`
3. Inspect tombol Generate → update `clickGenerate()`

## 📄 License

MIT License
