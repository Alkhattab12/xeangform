# MASTER IMPLEMENTATION PROMPT — ADVANCED BACKSOUND SYSTEM FOR FORM BUILDER

## 1. Role and Objective

Bertindaklah sebagai **Senior Full-Stack Engineer, Software Architect, UI/UX Designer, Audio Web Engineer, Database Engineer, dan QA Engineer** yang bertanggung jawab mengembangkan fitur backsound secara menyeluruh, profesional, stabil, aman, dan siap digunakan.

Saya ingin menambahkan fitur baru bernama **Advanced Backsound Studio** ke dalam aplikasi form builder yang sudah ada.

Fitur ini memungkinkan pemilik form mengunggah musik atau audio sendiri, mengatur berbagai parameter pemutaran, menyesuaikan tampilan audio player, dan menentukan perilaku backsound ketika responden membuka form yang sudah dipublikasikan.

### Tujuan utama

1. Pemilik form dapat mengunggah satu atau beberapa file audio saat membuat atau mengedit form.
2. Pemilik form memiliki kontrol kustomisasi backsound yang luas.
3. Konfigurasi backsound tersimpan secara persisten dan terhubung dengan form yang bersangkutan.
4. Ketika responden membuka URL form yang telah dipublikasikan, backsound yang dikonfigurasi pemilik form akan tersedia dan diputar secara otomatis apabila browser mengizinkannya.
5. Jika autoplay diblokir browser, sistem menyediakan mekanisme interaksi pengguna yang jelas untuk memulai pemutaran.
6. Backsound tidak mengganggu pengisian, validasi, navigasi, dan pengiriman jawaban form.
7. Seluruh fitur terintegrasi dengan arsitektur, autentikasi, database, sistem publikasi, serta desain aplikasi yang sudah ada.

**Penting:** Jangan hanya membuat UI upload musik. Semua kontrol harus mempunyai fungsi nyata, seluruh konfigurasi harus tersimpan, dan audio harus benar-benar dapat diputar pada halaman publik.

---

## 2. Wajib: Audit Proyek Sebelum Implementasi

Sebelum mengubah kode, periksa proyek secara menyeluruh.

Identifikasi dan pahami:

- Framework dan versi yang digunakan.
- Struktur direktori dan pola arsitektur aplikasi.
- Halaman pembuatan form, editor form, dan halaman publik.
- Mekanisme draft, penyimpanan, pembaruan, dan publikasi form.
- Skema database serta relasi antara pemilik form dan form.
- Sistem autentikasi dan otorisasi.
- Infrastruktur penyimpanan file yang tersedia.
- Konfigurasi environment lokal dan production.
- Komponen UI, design system, serta sistem tema yang sudah digunakan.
- Mekanisme routing, loading state, error handling, dan notifikasi.
- Cara halaman publik memperoleh konfigurasi form.
- Sistem deployment dan batasan platform hosting.

Jika proyek menggunakan Supabase, periksa integrasi Supabase yang sudah ada, termasuk PostgreSQL, Storage, RLS, dan autentikasi. Jika menggunakan layanan lain, manfaatkan infrastruktur yang sesuai dengan implementasi saat ini.

### Aturan perubahan

- Pertahankan seluruh fitur lama yang sudah berfungsi.
- Jangan melakukan rewrite besar-besaran tanpa alasan teknis yang kuat.
- Jangan membuat database, bucket, atau sistem autentikasi duplikat.
- Jangan mengganti konfigurasi production hanya untuk mempermudah implementasi.
- Jangan menampilkan kredensial atau secret ke frontend.
- Jangan mengasumsikan nama tabel, kolom, bucket, atau environment variable sebelum memeriksa kode aktual.
- Buat migrasi database jika memang diperlukan, tetapi jangan menjalankan migrasi yang mengubah production tanpa otorisasi yang sesuai.
- Gunakan pola coding, library, dan komponen yang konsisten dengan proyek.
- Jangan menghapus data pengguna, form, atau respons yang sudah ada.

Setelah audit, susun rencana implementasi singkat, kemudian lanjutkan implementasi sampai selesai tanpa berhenti hanya pada rekomendasi.

---

## 3. Fitur A — Advanced Backsound Studio

Tambahkan bagian khusus bernama **Backsound Studio** di editor pembuatan dan pengeditan form.

Lokasi fitur harus mengikuti struktur UI aplikasi yang ada. Bisa berupa panel pengaturan, tab khusus, sidebar, atau bagian lanjutan dari editor form.

Sediakan status yang informatif:

- Backsound belum dikonfigurasi.
- Audio sedang diunggah.
- Audio berhasil diproses.
- Audio siap digunakan.
- Audio sedang dipratinjau.
- Audio gagal dimuat.
- Perubahan belum disimpan.
- Konfigurasi berhasil disimpan.

Gunakan tampilan modern, intuitif, responsif, dan konsisten dengan design system aplikasi.

### 3.1 Upload audio

Izinkan pemilik form mengunggah file audio dari perangkatnya.

Format yang didukung sebaiknya meliputi:

- MP3.
- WAV.
- OGG.
- M4A/AAC jika kompatibel dengan browser dan backend.
- Format lain hanya jika benar-benar didukung oleh sistem pemutaran.

Fitur upload wajib meliputi:

- Tombol unggah file.
- Drag-and-drop jika cocok dengan UI.
- Pemilihan beberapa file untuk playlist.
- Nama file dan ukuran file.
- Status upload secara real-time.
- Progress bar.
- Pembatalan upload jika memungkinkan.
- Pesan kesalahan yang informatif.
- Validasi format, MIME type, ukuran file, dan hasil parsing audio.
- Penanganan koneksi terputus.
- Retry upload yang aman.
- Pencegahan unggahan duplikat yang tidak disengaja.
- Pratinjau audio sebelum menyimpan perubahan.
- Penghapusan audio yang tidak lagi digunakan.
- Penggantian file audio.
- Konfirmasi jika pengguna menghapus audio yang masih digunakan.

Batas ukuran file dan jumlah file harus mengikuti kapasitas layanan penyimpanan yang tersedia. Tetapkan batas yang realistis dan dapat dikonfigurasi, bukan angka yang tidak didukung infrastruktur.

Jangan menerima file hanya berdasarkan ekstensi nama file. Lakukan validasi server-side dan gunakan pendekatan yang sesuai untuk mendeteksi file yang tidak valid.

### 3.2 Informasi audio

Setelah file diunggah, tampilkan informasi yang tersedia, seperti:

- Nama lagu atau file.
- Durasi.
- Ukuran file.
- Format audio.
- Status pemrosesan.
- Status pemutaran.
- Urutan lagu dalam playlist.

Metadata seperti judul lagu, artis, album, atau artwork boleh ditampilkan jika tersedia. Jangan mengarang metadata yang tidak ada.

Sediakan kemampuan untuk mengubah nama tampilan lagu tanpa mengubah nama objek file yang sebenarnya.

### 3.3 Audio library

Buat daftar audio yang sudah diunggah dan dapat digunakan kembali oleh pemilik form apabila arsitektur aplikasi memungkinkan.

Fitur yang diharapkan:

- Melihat audio milik pengguna.
- Mencari berdasarkan nama.
- Mengurutkan berdasarkan tanggal unggah, nama, dan durasi.
- Memilih audio yang pernah diunggah.
- Melihat pratinjau.
- Menghapus audio yang tidak digunakan.
- Menampilkan informasi penggunaan audio.
- Membedakan audio yang sedang digunakan oleh form tertentu.

Jangan mengizinkan pengguna mengakses atau menghapus audio milik pengguna lain.

Jika audio library bersama belum sesuai dengan arsitektur aplikasi, prioritaskan pengelolaan audio per form terlebih dahulu tanpa membuat abstraksi berlebihan.

---

## 4. Fitur B — Kontrol Pemutaran Audio

Setiap form harus mempunyai konfigurasi pemutaran backsound sendiri.

### 4.1 Enable/disable

- Toggle untuk mengaktifkan backsound.
- Toggle untuk menonaktifkan backsound tanpa menghapus file.
- Jika dinonaktifkan, halaman publik tidak boleh memulai pemutaran audio.
- Status konfigurasi harus tersimpan setelah form disimpan.

### 4.2 Autoplay

Sediakan pilihan perilaku:

- Autoplay ketika halaman form dibuka.
- Mulai setelah responden melakukan interaksi pertama.
- Mulai ketika responden menekan tombol play.
- Mulai setelah intro atau layar pembuka selesai, jika fitur tersebut tersedia.

**Implementasi wajib mematuhi kebijakan autoplay browser.**

1. Coba autoplay secara aman sesuai konfigurasi.
2. Tangani Promise dari `HTMLMediaElement.play()`.
3. Jika browser menolak autoplay, jangan menganggap pemutaran berhasil.
4. Tampilkan tombol play atau prompt interaksi pengguna.
5. Jangan mencoba mengakali pembatasan browser.
6. Jangan meminta izin browser yang sebenarnya tidak tersedia untuk autoplay audio.
7. Jangan membuat halaman publik terus-menerus memaksa pemutaran ketika pengguna telah menghentikannya.

Jelaskan kepada pemilik form bahwa autoplay dengan suara tidak dapat dijamin pada semua browser dan perangkat.

### 4.3 Loop

Sediakan mode:

- Tidak mengulang.
- Mengulang satu lagu.
- Mengulang seluruh playlist.
- Mengulang segmen tertentu jika fitur tersebut diimplementasikan.

Untuk mode loop, pastikan tidak terjadi pemutaran ganda akibat event listener yang terpasang berulang kali.

Jika menggunakan playlist, bedakan dengan jelas antara repeat-one dan repeat-all.

### 4.4 Volume

Sediakan:

- Slider volume dari 0–100%.
- Tombol mute/unmute.
- Indikator volume.
- Pengaturan volume awal.
- Tombol pengembalian ke volume default.
- Penyimpanan volume sesuai konfigurasi form.

Nilai volume harus divalidasi dan dibatasi pada rentang yang diperbolehkan.

Jangan menganggap browser selalu mengizinkan perubahan volume perangkat melalui JavaScript. Gunakan kontrol audio yang didukung browser.

### 4.5 Fade in dan fade out

Sediakan opsi:

- Fade in ketika audio dimulai.
- Durasi fade in yang dapat diatur.
- Fade out sebelum audio dihentikan.
- Durasi fade out yang dapat diatur.
- Transisi volume yang halus saat berpindah lagu.

Gunakan Web Audio API hanya jika diperlukan dan kompatibel dengan browser. Jika tidak, gunakan pengaturan volume elemen audio dengan implementasi yang stabil.

Hindari interval, animation loop, atau event listener yang terus berjalan setelah komponen dilepas.

### 4.6 Pengaturan lanjutan

Jika didukung secara teknis, sediakan:

- Waktu mulai pemutaran.
- Waktu berhenti.
- Batas durasi pemutaran.
- Jeda otomatis ketika tab tidak aktif.
- Melanjutkan pemutaran setelah tab kembali aktif.
- Crossfade antar-lagu.
- Pengaturan jeda antar-lagu.
- Mode pemutaran acak.
- Pemutaran berdasarkan urutan playlist.
- Pilihan melanjutkan lagu dari posisi sebelumnya.

Semua opsi lanjutan harus mempunyai perilaku yang jelas dan tidak boleh merusak pemutaran standar.

Jangan menyimpan posisi atau preferensi responden dengan cara yang mengumpulkan data pribadi secara tidak perlu.

---

## 5. Fitur C — Playlist Multi-Audio

Izinkan pemilik form menambahkan lebih dari satu lagu dalam satu form.

Sediakan antarmuka playlist dengan:

- Tambah lagu.
- Hapus lagu.
- Ganti urutan lagu melalui drag-and-drop jika didukung.
- Tombol naik/turun sebagai alternatif aksesibel.
- Putar pratinjau lagu tertentu.
- Beralih ke lagu sebelumnya.
- Beralih ke lagu berikutnya.
- Informasi durasi setiap lagu.
- Indikator lagu aktif.
- Progress lagu aktif.
- Mode repeat-one.
- Mode repeat-all.
- Mode shuffle.
- Mode sequential.
- Pengaturan volume global.
- Penanganan lagu yang gagal dimuat.

Jika suatu lagu gagal dimuat, tampilkan informasi yang sesuai dan lanjutkan ke lagu berikutnya hanya apabila mode playlist dan konfigurasi pemutaran mengizinkannya.

Jangan membuat seluruh playlist gagal hanya karena satu file bermasalah.

Urutan lagu harus tersimpan secara persisten. Jangan mengandalkan urutan hasil query database yang tidak memiliki aturan pengurutan.

---

## 6. Fitur D — Custom Audio Player

Sediakan pengaturan tampilan pemutar audio untuk halaman publik.

### 6.1 Mode player

Minimal sediakan beberapa pilihan:

1. **Floating Mini Player** — pemutar kecil yang mengambang di sudut layar.
2. **Compact Player** — pemutar ringkas yang menyatu dengan halaman.
3. **Expanded Player** — pemutar dengan kontrol lengkap.
4. **Minimal Player** — tombol play/pause dan indikator sederhana.
5. **Custom Branding Player** — pemutar yang mengikuti identitas visual form.

Pemilik form dapat melihat pratinjau setiap mode sebelum menyimpan.

### 6.2 Kustomisasi visual

Sediakan opsi untuk mengatur:

- Posisi player.
- Warna latar.
- Warna teks.
- Warna tombol.
- Warna progress bar.
- Border dan radius.
- Ukuran player.
- Transparansi.
- Bayangan.
- Mode terang dan gelap.
- Ikon play, pause, mute, dan close.
- Ukuran artwork.
- Tampilan nama lagu.
- Tampilan nama artis jika tersedia.
- Tampilan durasi dan progress.
- Animasi visual yang sederhana.
- Tingkat kepadatan informasi.

Posisi player dapat mencakup sudut kiri atas, kanan atas, kiri bawah, atau kanan bawah selama tidak menutupi elemen penting form.

Hindari penggunaan animasi yang berlebihan. Hormati preferensi `prefers-reduced-motion`.

### 6.3 Kontrol visibilitas

Pemilik form dapat menentukan apakah responden melihat:

- Tombol play/pause.
- Slider volume.
- Tombol mute.
- Progress bar.
- Durasi lagu.
- Nama lagu.
- Artwork.
- Tombol playlist.
- Tombol tutup player.

**Jangan menyediakan konfigurasi yang memaksa audio tersembunyi terus bermain tanpa kontrol penghentian.**

Jika pemutar disembunyikan secara visual, tetap sediakan mekanisme yang jelas dan aksesibel bagi responden untuk menghentikan audio. Secara default, tampilkan kontrol pemutaran yang mudah ditemukan.

### 6.4 Branding

Jika relevan dengan desain aplikasi, izinkan:

- Artwork kustom.
- Warna yang menyesuaikan tema form.
- Penyesuaian tipografi melalui design token yang sudah ada.
- Mode transparan.
- Tampilan minimal yang tidak mengganggu pengalaman pengisian.

Jangan mengizinkan HTML atau JavaScript arbitrer dari pengguna untuk mengubah player. Gunakan opsi konfigurasi terstruktur yang aman.

---

## 7. Fitur E — Pengalaman Responden di Halaman Publik

Ini merupakan bagian paling penting.

Ketika pemilik form memublikasikan form dengan backsound aktif, konfigurasi backsound harus ikut tersedia pada halaman publik yang benar.

Alur yang diharapkan:

1. Pemilik membuka editor form.
2. Pemilik mengunggah atau memilih audio.
3. Pemilik mengatur playlist, volume, loop, autoplay, dan tampilan player.
4. Pemilik menyimpan konfigurasi.
5. Pemilik memublikasikan atau memperbarui publikasi form.
6. Responden membuka URL publik form.
7. Sistem memuat konfigurasi publik dan URL audio yang sah.
8. Player ditampilkan sesuai konfigurasi.
9. Sistem mencoba memulai pemutaran sesuai pengaturan dan kebijakan browser.
10. Jika autoplay diblokir, responden dapat menekan tombol play.
11. Responden mengisi dan mengirim form seperti biasa.

### Persyaratan halaman publik

- Audio hanya diputar pada form yang mengaktifkannya.
- Form tanpa backsound tetap berfungsi seperti sebelumnya.
- Form draft tidak boleh secara tidak sengaja menggunakan konfigurasi publik yang belum disetujui untuk dipublikasikan.
- Pembaruan konfigurasi harus mengikuti semantik publikasi yang sudah digunakan aplikasi.
- Halaman publik tidak boleh memerlukan sesi login pemilik.
- URL file audio harus dapat diakses oleh responden yang memang berhak melihat form.
- Jangan membocorkan data pribadi pemilik form.
- Jangan memuat file audio besar ke memori sekaligus jika streaming biasa sudah memadai.
- Hindari audio yang otomatis mulai ulang akibat re-render.
- Navigasi antarhalaman atau antarbagian form tidak boleh membuat player duplikat.
- Perubahan jawaban responden tidak boleh mereset audio tanpa alasan yang jelas.
- Pengiriman form tidak boleh gagal hanya karena audio tidak tersedia.

Jika form menggunakan beberapa halaman atau langkah, tentukan apakah backsound tetap berjalan ketika responden berpindah halaman. Default yang direkomendasikan: audio tetap berjalan selama responden berada dalam satu sesi form.

### Lifecycle audio

Pastikan implementasi menangani:

- `loadedmetadata`.
- `canplay`.
- `play`.
- `pause`.
- `ended`.
- `error`.
- `waiting`.
- `timeupdate`.
- Perubahan visibilitas dokumen.
- Komponen mount dan unmount.

Bersihkan event listener, timer, AudioContext, dan sumber audio sesuai lifecycle. Jangan membuat beberapa instance player untuk satu form tanpa kebutuhan yang jelas.

Jika responden menekan mute atau pause, hormati tindakan tersebut selama sesi berjalan.

---

## 8. Fitur F — Pratinjau Sebelum Publikasi

Tambahkan fitur **Preview Backsound** di editor.

Pemilik form harus dapat:

- Memutar audio yang dipilih.
- Menjeda dan melanjutkan audio.
- Menguji volume.
- Menguji loop.
- Menguji fade in/fade out.
- Mencoba pergantian lagu.
- Mencoba mode player.
- Melihat tampilan mobile.
- Melihat tampilan desktop.
- Menguji posisi player.
- Memeriksa konfigurasi sebelum dipublikasikan.

Pratinjau harus menggunakan komponen atau logika pemutaran yang konsisten dengan halaman publik.

Jangan menjalankan dua player sekaligus ketika berpindah dari preview ke editor.

Sediakan tombol berhenti dan hentikan preview ketika pemilik meninggalkan editor jika sesuai dengan perilaku aplikasi.

---

## 9. Fitur G — Penyimpanan Database dan File

Rancang penyimpanan berdasarkan infrastruktur aktual proyek.

Jika aplikasi menggunakan Supabase, pertimbangkan Supabase Storage untuk file audio dan PostgreSQL untuk metadata serta konfigurasi. Jangan membuat tabel atau bucket baru sebelum memeriksa struktur yang sudah ada.

### Contoh struktur konfigurasi konseptual

Gunakan contoh berikut sebagai acuan desain, bukan sebagai instruksi untuk membuat tabel dengan nama persis ini.

Konfigurasi backsound dapat mencakup:

- `enabled`
- `autoplay`
- `start_mode`
- `loop_mode`
- `playback_mode`
- `default_volume`
- `fade_in_enabled`
- `fade_in_duration`
- `fade_out_enabled`
- `fade_out_duration`
- `player_style`
- `player_position`
- `player_theme`
- `player_visibility`
- `playlist`
- `updated_at`

Metadata setiap audio dapat mencakup:

- ID audio.
- ID pemilik.
- ID form atau relasi penggunaan.
- Nama file asli.
- Nama tampilan.
- Storage key.
- MIME type.
- Ukuran file.
- Durasi jika tersedia.
- Waktu unggah.
- Status validasi.

Sesuaikan skema dengan pola data yang telah digunakan aplikasi.

### Persyaratan persistensi

- Simpan konfigurasi saat pengguna menekan tombol simpan atau mengikuti mekanisme autosave yang sudah ada.
- Tampilkan indikator perubahan belum disimpan.
- Jangan menghilangkan konfigurasi setelah halaman direfresh.
- Jangan menyimpan hanya di `localStorage` jika konfigurasi harus tersedia bagi semua responden.
- Jangan memasukkan data audio biner berukuran besar ke kolom JSON konfigurasi.
- Simpan referensi objek file, bukan menyalin seluruh file ke database.
- Pastikan urutan playlist stabil.
- Tangani konfigurasi lama yang belum mempunyai pengaturan backsound.
- Terapkan default yang aman untuk form yang dibuat sebelum fitur ini tersedia.

### Storage

Jika menggunakan Supabase Storage:

- Gunakan bucket privat atau publik sesuai kebutuhan akses yang telah dianalisis.
- Untuk audio form publik, gunakan strategi akses yang memungkinkan responden yang sah memuat file tanpa login, tetapi tidak memberikan akses yang tidak diperlukan ke file lain.
- Jika bucket privat digunakan, pertimbangkan signed URL dengan masa berlaku yang sesuai dan mekanisme pembaruan URL.
- Jangan mengandalkan signed URL yang sudah kedaluwarsa untuk pemutaran berdurasi panjang.
- Jangan mengubah bucket atau policy production secara langsung tanpa persetujuan yang sesuai.
- Pastikan operasi penghapusan tidak merusak form lain yang menggunakan file yang sama.
- Pertimbangkan aturan pembersihan file yang tidak lagi direferensikan.

Jika menggunakan penyimpanan lain, terapkan prinsip keamanan dan akses yang setara.

---

## 10. Fitur H — Keamanan dan Otorisasi

Fitur ini harus aman untuk penggunaan publik.

Implementasikan:

- Verifikasi kepemilikan form di server.
- Otorisasi unggah, penggantian, dan penghapusan audio.
- Validasi file di sisi server.
- Pembatasan ukuran dan jumlah file.
- Validasi tipe konten.
- Penanganan nama file yang aman.
- Penyimpanan file dengan identifier unik.
- Perlindungan terhadap akses lintas pengguna.
- Kebijakan akses yang sesuai dengan arsitektur aplikasi.
- Pembatasan penggunaan resource jika diperlukan.
- Penanganan kegagalan penyimpanan.
- Perlindungan terhadap URL atau objek file yang tidak sah.

Jangan mempercayai `user_id`, `form_id`, atau storage path yang dikirim frontend tanpa verifikasi server.

Jika menggunakan Supabase, tinjau RLS dan Storage policies. Jangan menonaktifkan RLS untuk mempermudah implementasi.

Jangan memberikan akses publik ke seluruh file privat pengguna hanya karena satu file harus dapat diputar di halaman publik.

Jangan menampilkan kredensial, signed URL rahasia, atau data internal pada log frontend.

Jangan menggunakan file audio dari URL eksternal yang diberikan pengguna tanpa validasi yang tepat. Untuk versi awal, prioritaskan upload file ke penyimpanan aplikasi sendiri.

---

## 11. Fitur I — UX, Aksesibilitas, dan Responsivitas

Seluruh komponen harus berfungsi pada:

- Desktop.
- Tablet.
- Ponsel Android.
- Ponsel iOS.
- Browser modern yang didukung aplikasi.

Pastikan:

- Kontrol cukup besar untuk layar sentuh.
- Player tidak menutupi tombol submit.
- Player tidak menutupi pertanyaan atau opsi jawaban.
- Pengaturan panjang dapat digulir dengan nyaman.
- Kontras teks memadai.
- Semua kontrol memiliki label aksesibel.
- Status upload dapat dipahami pembaca layar.
- Navigasi keyboard berfungsi.
- Ikon tidak menjadi satu-satunya petunjuk fungsi.
- Error state memiliki pesan yang jelas.
- Loading state tidak membuat layout berantakan.
- Animasi dapat dikurangi sesuai preferensi sistem.
- Penggunaan memori tetap wajar pada perangkat kelas bawah.

Jika ada pengaturan yang berpotensi mengganggu responden, sertakan tooltip atau deskripsi singkat yang menjelaskan efeknya.

Jangan membuat seluruh pengalaman bergantung pada hover karena pengguna ponsel tidak memiliki interaksi hover yang setara.

---

## 12. Fitur J — Pengaturan Default dan Preset

Sediakan preset yang membantu pemilik form mengonfigurasi backsound dengan cepat.

Contoh preset:

1. **Minimal** — player kecil dengan kontrol dasar.
2. **Ambient** — musik latar lembut dengan volume awal rendah.
3. **Focus** — kontrol minimal dan pemutaran berkelanjutan.
4. **Cinematic** — player dengan artwork dan transisi audio.
5. **Playlist** — beberapa lagu dengan mode repeat-all.
6. **Manual Start** — tidak mencoba autoplay; responden memulai audio sendiri.

Preset hanya berfungsi sebagai titik awal. Semua opsi tetap dapat dikustomisasi secara manual.

Jangan memaksa nilai volume tertentu sebagai standar universal. Gunakan nilai awal yang konservatif dan biarkan pemilik form menyesuaikannya.

Jika pemilik form mengganti preset, tampilkan konfirmasi jika pengaturan yang sudah dikustomisasi akan ditimpa.

---

## 13. Fitur K — Kegagalan dan Pemulihan

Implementasikan error handling yang mencakup:

- File tidak valid.
- File terlalu besar.
- Upload gagal.
- Koneksi terputus.
- Metadata audio tidak terbaca.
- Browser tidak mendukung format audio.
- Autoplay diblokir.
- File audio dihapus.
- File audio tidak ditemukan.
- Signed URL kedaluwarsa.
- Storage tidak tersedia.
- Konfigurasi gagal disimpan.
- Pengguna tidak memiliki izin.
- Playlist kosong.
- Lagu gagal dimainkan.
- Pengguna menutup player.
- Pengguna berpindah tab.
- Form dipublikasikan ketika file audio belum selesai diunggah.

Pesan error harus mudah dimengerti dan tidak memaparkan detail internal sistem.

Jangan membiarkan audio player merusak halaman publik ketika terjadi kegagalan. Form tetap harus dapat diisi dan dikirim.

Jika konfigurasi backsound tidak valid, nonaktifkan pemutaran yang bermasalah dan berikan fallback yang aman.

---

## 14. Fitur L — Performa dan Optimasi

Pastikan implementasi mempertimbangkan:

- Lazy loading audio ketika diperlukan.
- Streaming atau pemuatan progresif yang sesuai dengan format dan browser.
- Penggunaan HTTP Range Requests apabila didukung infrastruktur.
- Cache yang sesuai untuk aset audio.
- Ukuran file dan bandwidth.
- Penghindaran download ulang yang tidak perlu.
- Pemutaran yang tidak dimulai berulang kali.
- Pembersihan resource.
- Penggunaan komponen yang efisien.
- Penanganan audio ketika halaman tidak lagi aktif.
- Batas jumlah lagu yang masuk akal.
- Penggunaan signed URL tanpa membuat URL kedaluwarsa menjadi sumber kegagalan permanen.

Jangan melakukan preload semua lagu dalam playlist secara penuh hanya untuk mempercepat pergantian lagu.

Gunakan preload yang sesuai dengan kebutuhan, seperti `metadata` atau `none`, dan muat audio berdasarkan perilaku pemutaran.

Jangan menggunakan Web Audio API untuk semua kasus apabila elemen audio HTML biasa sudah memadai.

---

## 15. Fitur M — Integrasi dengan Sistem Form

Pastikan backsound terintegrasi dengan fitur yang sudah ada.

Periksa dampaknya terhadap:

- Membuat form baru.
- Mengedit form.
- Menyimpan draft.
- Membuka draft lama.
- Mempublikasikan form.
- Memperbarui form yang sudah dipublikasikan.
- Membagikan URL form.
- Membuka form tanpa login.
- Mengisi jawaban.
- Validasi jawaban.
- Navigasi multi-step.
- Pengiriman jawaban.
- Penyimpanan respons.
- Ekspor respons.
- Duplikasi form.
- Penghapusan form.
- Hak akses pemilik form.

Tentukan aturan ketika form diduplikasi: konfigurasi backsound boleh disalin, tetapi perilaku referensi file harus mengikuti aturan kepemilikan dan penyimpanan yang aman.

Jika form dihapus, jangan langsung menghapus file audio bersama yang masih digunakan form lain.

Jangan mengubah struktur jawaban responden hanya untuk menyimpan status player. Konfigurasi backsound sebaiknya terpisah dari data jawaban, kecuali memang terdapat kebutuhan produk yang jelas.

---

## 16. Fitur N — Analytics dan Privasi

Jika aplikasi memiliki sistem analytics, integrasikan secara minimal dan opsional.

Informasi yang dapat dipertimbangkan:

- Jumlah pemutaran berhasil.
- Jumlah kegagalan autoplay.
- Jumlah klik play.
- Error pemuatan audio.
- Penggunaan mode player.

Jangan mengumpulkan data pribadi atau membuat pelacakan responden lintas situs hanya untuk fitur backsound.

Jangan mengirim analytics sebelum memperhatikan mekanisme consent dan kebijakan privasi aplikasi.

Jika aplikasi belum mempunyai sistem analytics, jangan membangun platform analytics baru hanya untuk fitur ini. Fokus pada pemutaran audio yang stabil.

---

## 17. Fitur O — Pengujian Wajib

Buat atau perbarui automated tests sesuai framework yang sudah tersedia.

### Pengujian upload

- File audio valid berhasil diunggah.
- File tidak valid ditolak.
- File yang melebihi batas ditolak.
- Pengguna tidak dapat menghapus file milik pengguna lain.
- Kegagalan upload tidak merusak konfigurasi lama.

### Pengujian konfigurasi

- Backsound dapat diaktifkan dan dinonaktifkan.
- Volume tersimpan dengan benar.
- Mode loop tersimpan dengan benar.
- Playlist dan urutannya tersimpan.
- Pengaturan player tersimpan.
- Refresh halaman tidak menghapus konfigurasi.
- Form lama tetap berfungsi dengan default yang aman.

### Pengujian publikasi

- Form dengan backsound aktif menampilkan player.
- Form dengan backsound nonaktif tidak memulai audio.
- Konfigurasi yang disimpan muncul pada halaman publik sesuai aturan publikasi.
- Halaman publik dapat memuat audio tanpa login pemilik.
- Autoplay yang ditolak browser ditangani dengan benar.
- Tombol play memulai audio setelah interaksi pengguna.
- Player tidak muncul dua kali.
- Pengiriman form tetap berfungsi saat audio gagal.
- File privat tidak dapat diakses tanpa otorisasi yang sesuai.

### Pengujian perangkat

Uji pada browser desktop dan perangkat mobile yang tersedia.

Perhatikan secara khusus Safari iOS, Chrome Android, dan browser desktop karena kebijakan autoplay dan dukungan codec dapat berbeda.

Gunakan unit tests, integration tests, dan end-to-end tests jika sudah tersedia. Jangan mengklaim suatu skenario telah diuji apabila pengujian sebenarnya belum dilakukan.

---

## 18. Kriteria Penerimaan

Fitur dianggap selesai hanya jika seluruh poin inti berikut terpenuhi:

- [ ] Pengguna dapat mengunggah audio.
- [ ] Pengguna dapat memilih atau mengelola audio.
- [ ] Pengguna dapat mengatur volume.
- [ ] Pengguna dapat mengaktifkan loop.
- [ ] Pengguna dapat membuat playlist jika fitur playlist telah diimplementasikan.
- [ ] Pengguna dapat mengubah tampilan player.
- [ ] Pengguna dapat melihat pratinjau sebelum publikasi.
- [ ] Konfigurasi tersimpan secara persisten.
- [ ] File audio tersimpan pada penyimpanan yang sesuai.
- [ ] Konfigurasi terhubung dengan form yang benar.
- [ ] Halaman publik memuat backsound sesuai konfigurasi.
- [ ] Autoplay mengikuti kebijakan browser.
- [ ] Pengguna dapat memulai atau menghentikan audio.
- [ ] Pengiriman form tetap berjalan ketika audio gagal.
- [ ] Hak akses dan penyimpanan file aman.
- [ ] Tampilan responsif pada perangkat mobile.
- [ ] Fitur lama tetap berfungsi.
- [ ] Tidak terdapat tombol dekoratif yang seolah-olah berfungsi.
- [ ] Tidak terdapat error kritis yang diketahui dan dibiarkan tanpa penanganan.

---

## 19. Aturan Implementasi untuk AI Coding Agent

Kerjakan fitur ini secara bertahap tetapi tuntaskan sampai terintegrasi.

### Tahap 1 — Audit

- Identifikasi komponen, halaman, tabel, storage, API, dan alur publikasi yang relevan.
- Catat risiko kompatibilitas.

### Tahap 2 — Desain teknis

- Tentukan struktur konfigurasi.
- Tentukan mekanisme penyimpanan audio.
- Tentukan cara halaman publik memperoleh konfigurasi.
- Tentukan strategi autoplay dan fallback.
- Tentukan integrasi UI.

### Tahap 3 — Implementasi inti

- Upload dan validasi audio.
- Persistensi konfigurasi.
- Integrasi editor.
- Player publik.
- Kontrol playback.

### Tahap 4 — Implementasi lanjutan

- Playlist.
- Fade in/fade out.
- Kustomisasi player.
- Preview.
- Preset.
- Error handling.

### Tahap 5 — Keamanan dan kualitas

- Validasi server.
- Pemeriksaan otorisasi.
- Pemeriksaan policy penyimpanan.
- Performa dan aksesibilitas.
- Pengujian regresi.

### Tahap 6 — Verifikasi

- Jalankan lint, type-check, automated tests, dan build yang tersedia.
- Perbaiki error yang disebabkan perubahan ini.
- Periksa diff dan pastikan tidak ada perubahan yang tidak relevan.
- Laporkan keterbatasan yang belum dapat diverifikasi.

Jangan mengimplementasikan seluruh fitur dengan satu komponen besar yang sulit dipelihara. Pisahkan tanggung jawab berdasarkan arsitektur aplikasi.

Hindari duplikasi state, event listener, player instance, dan mekanisme upload.

Jangan memasang dependensi baru apabila fitur dapat dibuat secara stabil dengan dependensi yang sudah tersedia. Jika dependensi baru diperlukan, jelaskan alasan teknisnya dan gunakan versi yang kompatibel.

Jika ada keputusan teknis yang belum pasti, periksa implementasi aktual terlebih dahulu. Jangan menebak struktur proyek.

---

## 20. Batasan Operasional dan Production

Sebelum melakukan perubahan yang berdampak pada production:

- Identifikasi apakah perubahan hanya pada kode atau juga memerlukan migrasi database.
- Periksa apakah bucket dan policy yang diperlukan sudah tersedia.
- Periksa environment variable yang benar-benar diperlukan.
- Jangan mencetak secret ke log atau output.
- Jangan menjalankan migrasi production tanpa otorisasi yang sesuai.
- Jangan menghapus data lama.
- Jangan mengubah domain, autentikasi, atau konfigurasi deployment yang tidak berkaitan.
- Jangan melakukan deployment production tanpa izin jika tindakan tersebut tidak secara eksplisit menjadi bagian dari tugas yang diotorisasi.

Jika terdapat konfigurasi infrastruktur yang belum tersedia, implementasikan bagian kode yang aman terlebih dahulu, kemudian berikan instruksi setup yang tepat dan spesifik.

Jangan mengklaim fitur siap production apabila integrasi storage, database, atau konfigurasi yang diperlukan masih belum tersedia.

---

## 21. Laporan Akhir

Setelah implementasi, berikan laporan yang berisi:

1. Ringkasan fitur yang berhasil dibuat.
2. Daftar file yang dibuat atau diubah.
3. Penjelasan alur upload audio.
4. Penjelasan penyimpanan konfigurasi.
5. Penjelasan alur pemutaran backsound pada form publik.
6. Penjelasan mekanisme autoplay dan fallback.
7. Perubahan database atau migrasi yang disiapkan.
8. Perubahan storage dan policy yang diperlukan.
9. Environment variable baru jika memang dibutuhkan, tanpa membocorkan nilainya.
10. Hasil lint, type-check, test, dan build.
11. Keterbatasan yang masih ada.
12. Langkah manual yang masih harus dilakukan.
13. Risiko yang belum terselesaikan.

Bedakan dengan jelas antara pekerjaan yang sudah selesai, perubahan yang hanya disiapkan, dan pekerjaan yang masih memerlukan tindakan manual.

---

## Instruksi Final

Mulai dengan memeriksa kode proyek yang sedang terbuka. Gunakan hasil audit sebagai dasar implementasi. Setelah itu, implementasikan Advanced Backsound Studio secara nyata, aman, modular, dan konsisten dengan arsitektur aplikasi yang ada.

Prioritaskan alur inti berikut agar benar-benar bekerja:

**Upload audio → konfigurasi backsound → simpan → publikasikan form → responden membuka URL → player muncul → audio diputar sesuai kebijakan browser → responden mengisi dan mengirim form.**

Jangan berhenti setelah membuat mockup, dokumentasi, atau daftar rencana. Kerjakan kode aktual, verifikasi integrasinya, perbaiki masalah yang ditemukan, dan berikan laporan akhir yang jujur serta dapat diverifikasi.

Pertahankan semua fitur aplikasi yang sudah ada dan jangan melakukan perubahan destruktif pada data atau production.
