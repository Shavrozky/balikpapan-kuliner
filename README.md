# 🍽️ BpnCulinaire — Arsip & Direktori Kuliner Balikpapan

[![React](https://img.shields.io/badge/React-19-blue.svg?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-purple.svg?logo=vite)](https://vite.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg?logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**BpnCulinaire** (Plate Diary Balikpapan) adalah aplikasi jurnal dan direktori kuliner modern khas Kota Balikpapan. Dibuat dengan antarmuka bergaya *dashboard foodcourt* 3-kolom yang interaktif, aplikasi ini memudahkan Anda mencatat momen kuliner, merencanakan rute jelajah makanan, mengestimasi budget santap, hingga memetakan lokasi kuliner favorit.

---

## ✨ Fitur Utama

### 1. 📋 Menu Katalog & Pencarian Cepat
- **Kategori Kuliner:** Filter instan untuk *Food*, *Drinks*, *Dessert & Lain (Others)*, dan *Notes*.
- **Pencarian Real-time:** Cari berdasarkan nama makanan, nama tempat makan, kawasan (misal: *Pasir Ridge, Kebun Sayur, Melawai, Kariangau*), atau catatan rasa.
- **Kartu Interaktif:** Menampilkan foto atau stiker glif dinamis, rating bintang, harga Rupiah, dan stepper porsi `[- 1 +]`.

### 2. 🛒 Rencana Kuliner & Estimasi Budget (Current Order Panel)
- Panel kanan adaptif untuk mengumpulkan makanan yang ingin dikunjungi atau dipesan.
- Kalkulasi otomatis **Subtotal**, **Estimasi Pajak (10%)**, dan **Total Budget**.
- Ekspor & Cetak daftar kuliner (*Print*) serta integrasi langsung ke rute peta.

### 3. 📅 Kalender Momen Kuliner (`MonthView`)
- Visualisasi riwayat makan harian dalam format kalender interaktif.
- Indikator stiker pada tanggal kunjungan untuk melacak jejak kuliner bulanan.

### 4. 🗺️ Peta Interaktif Balikpapan (`PlacesView`)
- Peta interaktif berbasis **Leaflet** yang memetakan titik koordinat warung, kafe, dan restoran di sekeliling Balikpapan.
- Pin kustom berbasis CSS tanpa ketergantungan aset gambar eksternal.

### 5. 📸 "What's on the Table?" & Tambah Kuliner
- **Add Moment Modal:** Input kuliner manual lengkap dengan rating bintang, harga, tagar, lokasi, dan foto.
- **Add Table Modal:** Fitur pencatatan multi-makanan dalam satu meja makan dengan efek *matte/sticker cut-out* otomatis.

### 6. 📊 Statistik & Rekap (`YouView`)
- Rangkuman total pengeluaran kuliner, rata-rata rating, frekuensi kategori favorit, serta direktori tempat yang paling sering dikunjungi.

### 7. 💾 Penyimpanan Lokal (Offline-first)
- Data tersimpan aman di browser melalui `localStorage` via `DiaryContext`.
- Dilengkapi dengan *seed data* kuliner autentik khas Balikpapan (seperti *Kepiting Kenari/Dandito, Soto Banjar Kuin Abdurrahim, Pisang Gapit Semayang, Salome Telur*, dsb.).

---

## 🛠️ Tech Stack

- **Frontend Framework:** [React 19](https://react.dev/)
- **Build Tool:** [Vite 8](https://vite.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) dengan plugin `@tailwindcss/vite`
- **UI Components:** [Radix UI Primitives](https://www.radix-ui.com/) & [Shadcn UI](https://ui.shadcn.com/) (`Card`, `Dialog`, `Tabs`, `Button`, `Badge`, `ScrollArea`, `Separator`)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Peta Interaktif:** [Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/)
- **Typography:** Geist Font (`@fontsource-variable/geist`)
- **Testing:** [Playwright](https://playwright.dev/) untuk *End-to-End Testing (E2E)*

---

## 📁 Struktur Direktori

```text
bpn-diary/
├── public/                     # Aset statis & foto kuliner Balikpapan
│   └── food/                   # Gambar makanan (.png)
├── scripts/                    # Script pengujian E2E (Playwright)
│   ├── e2e-moment-flow.mjs
│   ├── e2e-table-flow.mjs
│   ├── e2e-map-pins.mjs
│   └── check-matte.mjs
├── src/
│   ├── assets/                 # Logo SVG & aset visual
│   ├── components/
│   │   ├── layout/             # Header, BottomDock, navigasi
│   │   ├── shared/             # StickerImage, Modal Tambah, Rating, dsb.
│   │   ├── ui/                 # Shadcn UI primitives (Button, Card, Tabs, dll.)
│   │   └── views/              # Tampilan ListView, MonthView, PlacesView, YouView
│   ├── context/
│   │   ├── DiaryContext.jsx    # React Context provider & hooks
│   │   └── diaryStore.js       # Logika LocalStorage, normalisasi & seed
│   ├── data/
│   │   ├── areas.js            # Daftar kawasan di Balikpapan
│   │   ├── categories.js       # Definisi kategori (Food, Drinks, Others, Notes)
│   │   └── initialMoments.js   # Dataset awal kuliner khas Balikpapan
│   ├── lib/
│   │   ├── imageMatte.js       # Utilitas pemrosesan gambar
│   │   └── utils.js            # Formatter Rupiah, tanggal, kalkulasi rating
│   ├── App.jsx                 # Shell utama dashboard 3-kolom
│   ├── index.css               # Desain token, tema, & Tailwind CSS v4
│   └── main.jsx                # Entry point aplikasi React
├── package.json
└── vite.config.js              # Konfigurasi Vite & alias `@/`
```

---

## 🚀 Memulai Proyek

### Prasyarat
- [Node.js](https://nodejs.org/) versi **18.x** atau **20.x+** (disarankan Node v22)
- npm versi **9.x+**

### Instalasi

1. **Clone repositori:**
   ```bash
   git clone https://github.com/Shavrozky/balikpapan-kuliner.git
   cd balikpapan-kuliner
   ```

2. **Install dependensi:**
   ```bash
   npm install
   ```

3. **Jalankan development server:**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di [http://localhost:5180](http://localhost:5180) (atau port default Vite Anda).

4. **Build untuk produksi:**
   ```bash
   npm run build
   ```

5. **Preview hasil build produksi:**
   ```bash
   npm run preview
   ```

---

## 🧪 Menjalankan Pengujian E2E

Proyek ini dilengkapi dengan serangkaian script pengujian otomatis berbasis Playwright:

```bash
# Uji alur input momen kuliner
node scripts/e2e-moment-flow.mjs

# Uji fitur pencatatan multi-item meja makan
node scripts/e2e-table-flow.mjs

# Uji render pin peta Leaflet
node scripts/e2e-map-pins.mjs

# Uji pemrosesan matte gambar
node scripts/check-matte.mjs
```

---

## 🤝 Kontribusi

Kontribusi berupa penambahan tempat kuliner legendaris Balikpapan, perbaikan bug, atau fitur baru sangat disambut:

1. *Fork* repositori ini
2. Buat *feature branch* (`git checkout -b fitur/kuliner-baru`)
3. *Commit* perubahan Anda (`git commit -m 'Menambahkan kuliner khas Baru Tengah'`)
4. *Push* ke branch (`git push origin fitur/kuliner-baru`)
5. Buka *Pull Request*

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah lisensi **MIT**. Bebas digunakan dan dikembangkan untuk eksplorasi kuliner lokal.
