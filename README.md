<div align="center">
  <img src="https://win98icons.alexmeub.com/icons/png/computer_explorer-5.png" alt="Retro Desktop Icon" width="100"/>
  <h1>vonearr</h1>
  <p>
    Sebuah portofolio kreatif yang dirancang sebagai pengalaman sistem operasi desktop retro. Jelajahi proyek, mainkan game, dan tinggalkan jejak Anda di saran!
  </p>

  <!-- Badges/Shields -->
  <p>
    <a href="https://github.com/0x41726469/vonearr/blob/main/LICENSE"><img src="https://img.shields.io/github/license/0x41726469/vonearr?style=for-the-badge" alt="License Badge"/></a>
    <img src="https://img.shields.io/github/languages/top/0x41726469/vonearr?style=for-the-badge" alt="Top Language Badge"/>
    <img src="https://img.shields.io/github/last-commit/0x41726469/vonearr?style=for-the-badge&color=blue" alt="Last Commit Badge"/>
  </p>

  <a href="LINK_DEPLOY_VERCEL_ANDA" target="_blank">
    <img src="https://img.shields.io/badge/Lihat_Live_Demo-22a5b3?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo"/>
  </a>
</div>

---

## 🚀 Tentang Proyek Ini

Selamat datang di portofolio saya! Proyek ini bukan sekadar daftar riwayat hidup biasa. Saya mengubahnya menjadi sebuah "sistem operasi" interaktif yang terinspirasi dari era Windows 98. Tujuannya adalah untuk menampilkan kemampuan teknis saya dalam pengembangan web sambil memberikan pengalaman yang unik dan menyenangkan bagi pengunjung.

Anda bisa membuka "aplikasi", melihat proyek, bermain game klasik, dan bahkan berinteraksi dengan terminal kustom.

### 📸 Pratinjau

<div align="center">
  <img src="/assets/HOME.png" alt="Tangkapan layar dari portfolio OS retro" width="700"/>
  <p><i>Tampilan desktop utama</i></p>
</div>


---

## ✨ Fitur Utama

Proyek ini dikemas dengan berbagai fitur interaktif:

*   **🖥️ Antarmuka Desktop Retro:** Pengalaman pengguna yang meniru OS klasik, lengkap dengan ikon, jendela, taskbar, dan start menu.
*   **🪟 Manajemen Jendela:** Jendela aplikasi dapat digeser (*drag* ), diubah ukurannya (*resize*), diminimalkan (*minimize*), dan dimaksimalkan (*maximize*).
*   **📂 Proyek & Recycle Bin:** Sistem manajemen file sederhana di mana admin dapat mengunggah proyek baru dan memindahkannya ke Recycle Bin.
*   **✍️ Kotak Saran Interaktif:** Pengunjung dapat meninggalkan saran atau masukan yang disimpan secara permanen menggunakan Supabase.
*   **🕹️ Game Klasik:** Mainkan Snake dan 2048 langsung di dalam "OS" tanpa meninggalkan halaman.
*   **⌨️ Terminal Kustom:** Sebuah terminal dengan beberapa perintah dasar seperti `help`, `echo`, dan `clear`.
*   **🔐 Fungsionalitas Admin:** Area terproteksi kata sandi untuk mengelola konten proyek dan saran.
*   **📱 Desain Responsif:** Tampilan dioptimalkan untuk perangkat mobile, di mana jendela akan otomatis *fullscreen* dan kontrol sentuh untuk game diaktifkan.

---

## 🛠️ Teknologi yang Digunakan

Proyek ini dibangun dari dasar menggunakan teknologi web fundamental, dengan sedikit bantuan dari backend untuk persistensi data.

*   **Frontend:**
    *   <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5"/>
    *   <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3"/>
    *   <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript"/>
*   **Backend & Database:**
    *   <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase"/></a>
*   **Deployment:**
    *   <a href="https://vercel.com/"><img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel"/></a>
*   **Aset & Library Eksternal:**
    *   **CryptoJS:** Untuk hashing kata sandi admin di sisi klien.
    *   **Win98 Icons:** Ikon-ikon retro otentik oleh [Alex Meub](https://win98icons.alexmeub.com/ ).
    *   **AI & Social Icons:** Ikon-ikon AI modern dari [LobeHub](https://github.com/lobehub/lobe-icons).

---

## 🚀 Cara Menjalankan Proyek Ini Secara Lokal

Jika Anda ingin mencoba atau memodifikasi proyek ini di komputer Anda, ikuti langkah-langkah berikut:

1.  **Clone repositori ini:**
    ```bash
    git clone https://github.com/0x41726469/vonearr.git
    ```

2.  **Buka direktori proyek:**
    ```bash
    cd vonearr
    ```

3.  **Buka file `index.html` di browser Anda.**
    *   Anda bisa langsung membukanya atau menggunakan ekstensi seperti "Live Server" di VS Code untuk pengalaman pengembangan yang lebih baik.

4.  **(Opsional ) Konfigurasi Supabase:**
    *   Fitur "Suggestions" dan "Projects" memerlukan koneksi ke Supabase.
    *   Buat proyek Anda sendiri di [Supabase](https://supabase.com/ ).
    *   Buat tabel `suggestions` dan `projects` sesuai skema di `script.js`.
    *   Untuk menjalankan secara lokal dengan kunci API, Anda perlu membuat file `.env.local` dan mengaturnya jika menggunakan *build tool*, atau memasukkannya sementara di `script.js` (jangan di-commit!).

---

## 💡 Kontak

Jika Anda tertarik untuk berdiskusi, berkolaborasi, atau sekadar menyapa, jangan ragu untuk menghubungi saya!

<p>
  <a href="https://github.com/0x41726469" target="_blank"><img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/></a>
  <a href="https://www.linkedin.com/in/0x41726469/" target="_blank"><img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/></a>
  <a href="mailto:ardikingsblue33@gmail.com"><img src="https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white" alt="Email"/></a>
</p>
<a href="https://www.instagram.com/0x41726469.sys/" target="_blank"><img src="https://img.shields.io/badge/-Instagram-E4405F?style=flat&logo=instagram&logoColor=white" alt="Instagram"/></a>

