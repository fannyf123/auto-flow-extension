# ⚡ Auto Flow DIY — Chrome Extension

Chrome Extension untuk **otomatisasi bulk video generation** di [Google Flow AI](https://labs.google/flow), powered by Veo 3.1 & Nano Banana.

> Terinspirasi dari extension [Auto Flow - Auto Veo & Nano Banana Pro](https://chromewebstore.google.com/detail/auto-flow-auto-veo-nano-b/lhcmnhdbddgagibbbgppakocflbnknoa)

---

## ✨ Fitur

- ✅ Bulk video generation dari daftar prompts
- ✅ Load prompts dari file `.txt` (satu baris = satu task)
- ✅ Pilihan model: Veo 3.1 Fast / Quality / Veo 2
- ✅ Pilihan Aspect Ratio: 16:9 / 9:16
- ✅ Resume dari task tertentu (jika terhenti di tengah)
- ✅ Auto-download video hasil ke folder `AutoFlow/`
- ✅ Real-time status & progress di popup
- ✅ Stop kapan saja

---

## 📁 Struktur File

```
auto-flow-extension/
├── manifest.json    # Konfigurasi extension (Manifest V3)
├── popup.html       # UI extension
├── popup.js         # Logic popup (input, start, stop)
├── content.js       # Automation script (inject ke Google Flow)
├── background.js    # Service worker (handle download)
└── README.md
```

---

## 🚀 Cara Install

1. **Clone / Download** repo ini
   ```bash
   git clone https://github.com/fannyf123/auto-flow-extension.git
   ```

2. Buka Chrome → ketik di address bar:
   ```
   chrome://extensions/
   ```

3. Aktifkan **Developer Mode** (toggle kanan atas)

4. Klik **"Load unpacked"** → pilih folder `auto-flow-extension/`

5. Buka **[labs.google/flow](https://labs.google/flow)** di browser

6. Klik icon extension ⚡ di toolbar Chrome

---

## 📖 Cara Pakai

1. Buka Google Flow di browser
2. Klik icon extension → masukkan prompts (satu baris = satu video)
3. Atau klik **Load dari .txt** untuk import file prompt
4. Pilih **Model**, **Aspect Ratio**, dan **Wait Time** (default: 90 detik)
5. Klik **▶ Start Automation**
6. Video otomatis ter-download ke folder `AutoFlow/` di Downloads

---

## ⚙️ Tips Selector Troubleshooting

Google Flow sering update UI-nya. Jika automation tidak berjalan:

1. Buka DevTools (`F12`) di halaman Flow
2. Inspect elemen textarea prompt → copy selector-nya
3. Update selector di `content.js` pada fungsi `fillPrompt()`
4. Inspect tombol Generate → update selector di `clickGenerate()`

---

## ⚠️ Catatan

| Hal | Keterangan |
|---|---|
| **Selector UI** | Mungkin perlu update jika Google Flow mengubah tampilan |
| **Wait Time** | Set lebih tinggi (120-180s) untuk model Quality |
| **Blob URL** | Jika video tidak ter-download, src mungkin blob — butuh workaround |
| **Anti-bot** | Tambahkan random delay jika Google memblokir request |

---

## 📄 License

MIT License — bebas digunakan, dimodifikasi, dan didistribusikan.
