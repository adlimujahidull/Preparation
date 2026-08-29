# Persiapan Sertifikasi Microsoft AI-200 (Azure AI Cloud Developer Associate)

Aplikasi web statis serverless untuk mendampingi persiapan sertifikasi Azure AI-200. Aplikasi ini berjalan langsung di browser via GitHub Pages dan menggunakan repositori ini sebagai database melalui GitHub REST API.

---

## 1. Cara Mengaktifkan GitHub Pages

1. Buka repositori ini di GitHub melalui browser.
2. Masuk ke tab **Settings** > menu samping **Pages** (di bawah bagian *Code and automation*).
3. Pada bagian **Build and deployment**:
   - **Source**: Pilih `Deploy from a branch`.
   - **Branch**: Pilih `main` (atau branch utama Anda), lalu pada dropdown folder pilih `/docs`.
4. Klik **Save**.
5. Tunggu sekitar 1–2 menit hingga tautan GitHub Pages aktif (misalnya `https://<username>.github.io/<repo-name>/`).

---

## 2. Cara Membuat Fine-Grained Personal Access Token (PAT)

Aplikasi membutuhkan GitHub Token untuk membaca dan menulis data progress, catatan, dan kartu belajar langsung ke repo ini.

1. Buka GitHub > klik foto profil di kanan atas > **Settings**.
2. Gulir ke bawah di sidebar kiri, pilih **Developer Settings** > **Personal access tokens** > **Fine-grained tokens**.
3. Klik **Generate new token**.
4. Isi informasi token:
   - **Token name**: `ai-200-study-app`
   - **Expiration**: Pilih **90 days** (atau sesuai kebutuhan).
   - **Repository access**: Pilih **Only select repositories**, lalu pilih repositori `ai-200-prep` ini.
   - **Repository permissions**:
     - Cari **Contents** > ubah access level menjadi **Read and write**.
5. Klik **Generate token** di bagian bawah, lalu **salin token** (`github_pat_...`).

> **PENTING**: Jangan pernah membagikan atau meng-commit token ini ke dalam file apa pun di repositori.

---

## 3. Cara Setup di Perangkat Baru

1. Buka URL GitHub Pages aplikasi di browser (laptop kerja, laptop pribadi, maupun HP).
2. Pada kunjungan pertama, layar **Setup Konfigurasi GitHub** akan otomatis muncul.
3. Masukkan data:
   - **Owner**: Username GitHub Anda (misal: `octocat`).
   - **Repo**: Nama repositori ini (misal: `ai-200-prep`).
   - **Branch**: `main`.
   - **GitHub Personal Access Token**: Tempelkan token fine-grained PAT yang telah dibuat.
4. Klik **Simpan & Hubungkan**.
5. Aplikasi akan memvalidasi koneksi ke GitHub API, memuat seluruh data belajar, dan Anda siap belajar!

---

## 4. Cara Menghapus Token dari Perangkat

Jika Anda menggunakan laptop kantor atau perangkat bersama dan ingin membersihkan kredensial:

1. Buka menu **Pengaturan** (`#settings`) di aplikasi.
2. Di bagian atas halaman pengaturan, klik tombol merah **"Hapus token dari perangkat ini"**.
3. Konfirmasi penghapusan. Seluruh konfigurasi dan token di `localStorage` perangkat tersebut akan dihapus seketika, dan aplikasi akan kembali ke layar setup awal.

---

## 5. Penjelasan File di Direktori `data/`

| File | Deskripsi |
|---|---|
| `data/config.json` | Konfigurasi global belajar: target tanggal ujian (`examDate`) dan nilai kelulusan (`passingScore: 700`). |
| `data/plan.json` | Struktur kurikulum 6 minggu beserta seluruh task checklist hasil parse `rencana-belajar-ai-200.md`. |
| `data/resources.json` | Perpustakaan sumber belajar (25 lab resmi MS Learn, video, dokumentasi resmi, status, dan rating). |
| `data/cards.json` | Kartu flashcard (recall dan decision) untuk persiapan ujian. |
| `data/progress.json` | State Spaced Repetition System (SRS) Leitner per kartu (box 1–5, tanggal terakhir, jumlah benar/salah). |
| `data/labs.json` | Log riwayat pengerjaan lab, blocker, takeaway, dan status penghapusan Resource Group Azure (`deleted: true/false`). |
| `data/decisions.json` | Tabel keputusan arsitektur cloud (misal: ACA vs AKS vs App Service) beserta skenario pemicunya. |
| `data/exams/*.json` | Kumpulan paket soal ujian latihan (misal: `contoh.json`). |
| `data/exam-history.json` | Rekam jejak skor ujian latihan, tanggal pengerjaan, durasi, dan domain yang perlu diperbaiki. |

---

## Shortcut Keyboard Global

- `Alt + L` : Buka modal **Catat Lab Cepat** (nama lab, durasi, Resource Group, blocker, takeaway).
- `Alt + N` : Buka modal **Tambah Kartu Cepat** (domain, tipe, pertanyaan, jawaban).
- `Esc` : Menutup modal yang sedang aktif.
