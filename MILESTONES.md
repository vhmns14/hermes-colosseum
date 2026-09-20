# Hermes Colosseum — Project Milestones & Roadmap 🏛️

Dokumentasi capaian, status arsitektur, dan rencana pengembangan lanjutan **Hermes Colosseum: Multi-Agent Social Deduction & Theory of Mind Arena**.

---

## 🏆 Status Pencapaian (Completed Milestones)

### Phase 1: Core Engine & Dual-Layer Reasoning Architecture ✅
- [x] **Discrete Game Loop**: Implementasi siklus permainan Werewolf/Mafia (Night Actions ➔ Day Discussion ➔ Voting ➔ Victory Evaluation).
- [x] **Dual-Layer Cognitive Loop**:
  - *Layer 1 (Private Inner Monologue)*: Pemikiran taktis tanpa filter (`inner_thought`), kalkulasi risiko, dan pemilihan manuver psikologis (`tactic`).
  - *Layer 2 (Public Utterance)*: Retorika diplomatis yang dipublikasikan ke forum desa (`public_utterance`).
- [x] **Dynamic Trust Matrix**: Sistem memori persisten tiap agen dengan matriks kepercayaan matematis (0% - 100%) yang beradaptasi terhadap ucapan dan tuduhan agen lain.
- [x] **Analytics & Forensic Reporter**:
  - Kalkulasi *Deception Score* (% keberhasilan menyembunyikan peran).
  - Kalkulasi *Influence Index* (jumlah suara pemain lain yang berhasil digiring/disway).
  - Generator laporan otomatis: Markdown (`reports/*.md`) dan Interactive HTML visualizer (`reports/*.html`).
- [x] **100% Unit Test Pass**: Validasi aturan game, pembagian peran, matriks kepercayaan, dan kondisi kemenangan via `bun test`.

---

### Phase 2: Live Multi-LLM Arena & VansRouter Integration ✅
- [x] **VansRouter SSE Streaming Adapter**:
  - Integrasi HTTP client dengan streaming Server-Sent Events (SSE) untuk model reasoning generasi terbaru (`cx/gpt-5.6-terra`, `cx/gpt-5.5`, `cx/gpt-5.6-luna`, dll.).
- [x] **Heterogeneous Multi-Model Roster**:
  - Konfigurasi 6 pemain independen dengan model berbeda di port `20128`:
    - `Antigravity (Mastermind)`: `cx/gpt-5.6-terra`
    - `Hermes`: `cx/gpt-5.5`
    - `Luna`: `cx/gpt-5.6-luna`
    - `Terra`: `cx/gpt-5.6-terra-review`
    - `Sol`: `cx/gpt-5.5-review`
    - `Astra`: `cx/gpt-5.6-luna-review`
- [x] **Mastermind Persona (Antigravity/Hermes)**:
  - Kemampuan manipulasi sosial tingkat tinggi untuk mengeksploitasi kepolosan LLM lain yang terlalu terpaku pada gaya bicara sopan dan prosedural.

---

### Phase 3: Information Theory & Balance Overhaul ✅
- [x] **Pemberantasan Seer Amnesia**:
  - Menginjeksikan *Private Seer Vision Ground Truth* langsung ke memori Seer (`🚨 WEREWOLF` / `✅ INNOCENT`), sehingga Seer memiliki data faktual untuk memimpin desa.
- [x] **Doctor Tactical Protection & Priority Shield**:
  - Doctor tidak lagi memilih target proteksi secara acak, melainkan memprioritaskan Seer yang terkonfirmasi atau sekutu terpercaya.
- [x] **Doctor Survival Role-Claim Mechanic**:
  - Jika Doctor menghadapi ancaman gantung (*mislynch*), Doctor wajib mendeklarasikan perannya secara terbuka dan memaparkan log medis untuk menyelamatkan desa.
- [x] **Dynamic Uninspected Candidate Pool**:
  - Seer secara cerdas mengarahkan investigasi ke kandidat baru yang belum terverifikasi tiap malamnya.
- [x] **Kemenangan Pertama Villagers di Live Arena (`match-1789926126108`)**:
  - Ronde 1: Antigravity (Seer) menggagalkan mislynch dan mengeksekusi Astra (Werewolf).
  - Ronde 2: Doctor Sol menahan serangan serigala terhadap Seer.
  - Ronde 3 (Final 3): Sol meluncurkan klaim darurat, membongkar kepalsuan klaim Doctor tandingan Terra (Werewolf), dan Hermes membalikkan suara untuk mengeksekusi serigala terakhir!

---

## 🚀 Rencana Pengembangan Selanjutnya (Next Milestones / Improvements)

### Milestone 4: Web Visual Spectator Dashboard 🎨
- [ ] **Modern Campfire Web UI**:
  - Tampilan visual meja bundar api unggun (web/browser view) dengan avatar tiap agen.
  - Balon dialog real-time yang membedakan *Public Speech* (di atas meja) dan *Inner Monologue* (bisikan batin di samping avatar).
- [ ] **Live Trust Graph Visualization**:
  - Diagram relasi dinamis (Force-directed graph / Chord diagram) yang memperlihatkan bagaimana garis kepercayaan antar LLM berubah setiap kali ada pemain yang berbicara.

### Milestone 5: Persona Psikologis & Gaslighting Archetypes 🧠
- [ ] **Behavioral Archetypes**:
  - *The Inquisitor*: Agresif menekan kontradiksi waktu dan inkonsistensi kata.
  - *The Quiet Observer*: Berpura-pura pasif lalu meluncurkan serangan deduktif mematikan di akhir.
  - *The Sympathetic Ally*: Membangun persekutuan palsu untuk dijadikan tumbal di ronde krusial.
- [ ] **Exploitation of Cognitive Biases**:
  - Prompting khusus untuk memicu *Bandwagon Effect*, *Sunk Cost Fallacy*, dan *False Dilemma* pada LLM lawan.

### Milestone 6: Perluasan Peran Kompleks (Chaos Edition) 🎭
- [ ] **The Jester / Fool**: Menang sendirian jika berhasil meyakinkan desa untuk menggantung dirinya!
- [ ] **The Medium**: Dapat berkomunikasi dengan arwah pemain yang sudah mati di fase malam.
- [ ] **The Alpha Werewolf**: Serigala khusus yang terlihat *Innocent* saat diterawang oleh Seer.

### Milestone 7: Automated Tournament & Model Benchmark Ladder 📊
- [ ] **Batch Tournament Runner**:
  - Menjalankan 50-100 pertandingan otomatis untuk menguji win-rate antar keluarga model (GPT vs Claude vs Gemini vs DeepSeek).
- [ ] **Elo Rating System**:
  - Menghitung ranking kecerdasan sosial (*Social IQ Elo*) berdasarkan akurasi deduksi dan efektivitas manipulasi.

### Milestone 8: Human-in-the-Loop Playable Mode 🎮
- [ ] Mode interaktif di mana pengguna manusia bisa duduk di salah satu kursi, berdebat langsung dengan 5 AI, atau menjadi "bisikan rahasia" di telinga Mastermind Hermes.

---
*Last Updated: 2026-09-21*
