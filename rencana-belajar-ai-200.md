# Rencana Belajar AI-200 — 6 Minggu

**Asumsi:** ujian pertengahan Oktober 2026, mulai 29 Agustus, komitmen 10–12 jam/minggu.
Kalau ujianmu awal Oktober, pangkas Minggu 6 dan gabungkan ke Minggu 5. Kalau akhir Oktober, tambahkan satu minggu pengulangan lab.

**Target:** 700/1000. Ujian 120 menit, bahasa Inggris saja, proctored.

---

## Prinsip yang menentukan lulus atau tidak

1. **Lab lebih penting daripada bacaan.** Ujian ini menguji keputusan implementasi, bukan definisi.
2. **Bangun tabel keputusanmu sendiri** sambil jalan. Soal ujian sering bergantung pada satu detail requirement: kapan pakai Container Apps vs AKS vs App Service, kapan Cosmos DB vs PostgreSQL vs Redis, kapan Service Bus vs Event Grid. Tabel ini adalah aset belajar paling berharga yang kamu buat.
3. **Belajar dengan istilah Inggris.** Ujiannya hanya tersedia dalam bahasa Inggris.
4. **Hapus resource Azure setelah tiap lab.** AKS, Cosmos DB, dan PostgreSQL menagih per jam. Ini jebakan biaya paling umum.

---

## Minggu 1 (29 Agu – 6 Sep) — Fondasi container, belum sentuh Azure

Domain tersulit buatmu adalah container dan Kubernetes, karena paling jauh dari dunia analisis data. Kerjakan duluan selagi energi masih penuh.

**Jangan aktifkan kredit Azure minggu ini.** Kredit gratis hanya berlaku 30 hari — simpan untuk minggu lab.

- [ ] Cetak study guide resmi AI-200, jadikan checklist utama
- [ ] Install Docker di laptop. Pahami: image, layer, Dockerfile, tag, registry
- [ ] Build dan jalankan satu container Python sederhana secara lokal
- [ ] Konsep Kubernetes (belum praktik): pod, deployment, service, manifest YAML, readiness/liveness probe
- [ ] Tonton bagian compute dari study cram AZ-204 (masih relevan)
- [ ] Buat file catatan kosong berjudul "Tabel Keputusan" — mulai isi minggu depan

---

## Minggu 2 (7–13 Sep) — Container di Azure — AKTIFKAN KREDIT AZURE

Sekarang aktifkan Azure free account. Jam kredit mulai berjalan, jadi minggu 2–5 harus padat.

Domain 1: Develop containerized solutions (20–25%)

- [ ] Lab: Build and run a container image with ACR Tasks
- [ ] Lab: Deploy a container to Azure App Service
- [ ] Lab: Deploy an AI API with a local model-serving sidecar
- [ ] Lab: Deploy a containerized backend API to Container Apps
- [ ] Lab: Diagnose and fix a failing deployment
- [ ] Lab: Configure autoscaling for an API using KEDA
- [ ] Lab: Deploy an AI inference API to Azure Kubernetes Service
- [ ] Lab: Configure apps on Azure Kubernetes Service
- [ ] Lab: Troubleshoot apps on AKS

**Isi Tabel Keputusan:** App Service vs Container Apps vs AKS — apa pemicu masing-masing? (scale-to-zero, GPU inference, kontrol penuh orchestration, kesederhanaan)

---

## Minggu 3 (14–20 Sep) — Cosmos DB

Domain 2 adalah yang terbesar (25–30%). Bagian ini paling ramah buat kamu: query, indexing, dan schema adalah wilayah SQL.

- [ ] Modul: Cosmos DB for NoSQL — koneksi via Python SDK, menjalankan query
- [ ] Pahami Request Units (RU): apa yang membuatnya mahal, cara menekannya
- [ ] Indexing policy dan consistency level — hafal trade-off tiap level
- [ ] Change feed processor: kapan dipakai, cara kerjanya
- [ ] Lab: Build a RAG document store on Cosmos DB for NoSQL
- [ ] Lab: Build a semantic search application with Cosmos DB
- [ ] Lab: Optimize query performance with vector indexes

**Cek pertengahan September:** practice assessment resmi Microsoft mungkin sudah rilis (biasanya 8 minggu setelah GA). Kalau ada, itu prediktor kesiapan terbaikmu.

---

## Minggu 4 (21–27 Sep) — PostgreSQL + Redis

- [ ] pgvector: cara kerja, tipe index (HNSW vs IVFFlat), kapan pilih yang mana
- [ ] Sizing compute/memory/storage untuk beban vector
- [ ] Connection pooling dan optimasi throughput
- [ ] Pola RAG dengan metadata filtering
- [ ] Lab: Build an agent tool backend on Azure Database for PostgreSQL
- [ ] Lab: Implement vector search on Azure Database for PostgreSQL
- [ ] Lab: Optimize vector search performance
- [ ] Azure Managed Redis: caching, expiration, invalidation
- [ ] Lab: Perform data operations in Azure Managed Redis
- [ ] Lab: Publish and subscribe to events in Azure Managed Redis
- [ ] Lab: Implement semantic search in Azure Managed Redis

**Isi Tabel Keputusan:** Cosmos DB vs PostgreSQL/pgvector vs Redis untuk vector search — pemicunya apa? (distribusi global, latensi, biaya, volume, kebutuhan cache)

---

## Minggu 5 (28 Sep – 4 Okt) — Integrasi, keamanan, observability

Dua domain sekaligus, masing-masing 20–25%. Padat tapi materinya lebih ringan dari container.

Domain 3: Connect to and consume Azure services

- [ ] Service Bus: queue, topic, subscription, dead-letter queue
- [ ] Event Grid: filter, custom event, retry policy
- [ ] Azure Functions: trigger dan binding, deploy function app
- [ ] Lab: Process messages with Azure Service Bus
- [ ] Lab: Publish and receive events with Azure Event Grid
- [ ] Lab: Create an MCP server with Azure Functions

Domain 4: Secure, monitor, troubleshoot

- [ ] Key Vault: penyimpanan, retrieval, rotation
- [ ] App Configuration: setting dinamis, refresh
- [ ] OpenTelemetry: span, atribut, export ke Application Insights
- [ ] KQL: query requests, exceptions, dependencies
- [ ] Lab: Manage secrets with Azure Key Vault
- [ ] Lab: Retrieve settings and secrets from Azure App Configuration
- [ ] Lab: Instrument an app with the OpenTelemetry SDK
- [ ] Lab: Query logs with KQL

**Isi Tabel Keputusan:** Service Bus vs Event Grid — kapan message-based, kapan event-based?

---

## Minggu 6 (5–11 Okt) — Konsolidasi

Tidak ada materi baru. Minggu ini murni pemantapan.

- [ ] Coba exam sandbox Microsoft untuk membiasakan antarmuka dan tipe soal
- [ ] Ulangi 3 lab tersulit **tanpa membuka instruksi** — ini tes kesiapan sesungguhnya
- [ ] Kerjakan bank soal, tapi fokus pada *alasan* jawaban salah, bukan menghafal
- [ ] Baca ulang Tabel Keputusanmu sampai refleks
- [ ] Latih membaca soal skenario: identifikasi constraint mana yang menentukan (biaya? latensi? throughput? skala?)
- [ ] Hapus semua resource Azure yang tersisa

**Beberapa hari terakhir:** jangan belajar materi baru. Tidur cukup. Ujian 120 menit butuh stamina fokus.

---

## Kalau tertinggal jadwal

Prioritas pemotongan, dari yang paling aman dibuang:

1. Lab pub/sub Redis dan MCP server Functions — nilai per jam paling rendah
2. Optimasi mendalam (RU tuning, parameter tuning pgvector) — pahami konsepnya saja
3. **Jangan pernah potong:** lab AKS troubleshooting dan lab vector search. Dua ini inti ujian.

## Kalau lebih cepat dari jadwal

Bangun satu proyek kecil yang menyambung semua domain: API Python dalam container, deploy ke Container Apps, simpan embedding di Cosmos DB, antrian via Service Bus, secret di Key Vault, tracing dengan OpenTelemetry. Satu proyek utuh mengunci pemahaman lebih baik daripada sepuluh lab terpisah — dan bisa masuk portofolio GitHub-mu.
