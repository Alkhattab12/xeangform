INSTRUKSI PENGEMBANGAN XEANGFORM

Sistem Autentikasi Email, Manajemen Akun, dan Background Animasi Interaktif

Target proyek: Xeangform
Jenis pekerjaan: Pengembangan fitur, integrasi backend, peningkatan UX/UI, pengujian menyeluruh, dan perbaikan bug.
Lingkungan proyek: Repository GitHub, deployment Vercel, dan backend Supabase yang sudah digunakan proyek.
Prinsip utama: Implementasikan fitur secara menyeluruh, aman, konsisten, responsif, dan stabil tanpa merusak fitur, data, desain, maupun konfigurasi yang sudah ada.

---

1. ATURAN WAJIB SEBELUM MEMULAI

Sebelum menulis atau mengubah kode, lakukan pemeriksaan menyeluruh terhadap struktur proyek Xeangform.

Periksa setidaknya:

- Struktur direktori dan arsitektur aplikasi.
- Framework, bahasa pemrograman, package manager, dan dependensi yang digunakan.
- Implementasi autentikasi, registrasi, login, logout, serta pengelolaan sesi yang sudah tersedia.
- Konfigurasi Supabase Auth, database, tabel profil, Row Level Security (RLS), dan kebijakan akses.
- Konfigurasi variabel lingkungan yang diperlukan.
- Integrasi deployment Vercel dan konfigurasi URL aplikasi.
- Sistem routing, middleware, proteksi halaman, serta penanganan redirect.
- Komponen UI, sistem tema, background, animasi, dan desain responsif.
- Fitur yang sudah ada dan kemungkinan dampak perubahan terhadap fitur tersebut.

Gunakan arsitektur, komponen, dan konvensi kode yang sudah digunakan proyek jika masih layak.

Larangan penting:

1. Jangan membuat ulang aplikasi dari awal hanya untuk menambahkan fitur ini.
2. Jangan menghapus, mengganti, atau merombak fitur lama yang tidak berkaitan.
3. Jangan mengganti desain keseluruhan aplikasi tanpa kebutuhan yang jelas.
4. Jangan menonaktifkan RLS, melemahkan validasi, atau menghilangkan proteksi keamanan demi mempermudah implementasi.
5. Jangan mengekspos service role key, access token, refresh token, password, atau kredensial sensitif ke frontend, log, maupun repository.
6. Jangan melakukan reset database, penghapusan data, atau migrasi destruktif.
7. Jangan menganggap fitur selesai hanya karena berhasil dikompilasi. Semua alur harus diuji.
8. Jangan menyembunyikan error dengan mengabaikannya atau menampilkan pesan sukses palsu.

Buat rencana perubahan terlebih dahulu, identifikasi file yang terdampak, lalu implementasikan secara bertahap. Pertahankan perubahan sekecil mungkin tanpa mengorbankan kelengkapan fitur.

2. SISTEM REGISTRASI DENGAN KONFIRMASI EMAIL WAJIB

Saya ingin sistem registrasi Xeangform menggunakan konfirmasi email sungguhan melalui Supabase Auth atau sistem autentikasi yang sudah digunakan proyek.

Konfirmasi email harus menjadi persyaratan wajib untuk mengaktifkan akses akun baru. Jangan hanya membuat tampilan konfirmasi email tanpa validasi autentikasi di backend.

2.1. Alur pendaftaran

Ketika pengguna mendaftar, sistem harus:

1. Meminta informasi yang diperlukan, minimal email dan password. Jika username/nama diperlukan, sediakan kolom tersebut.
2. Memvalidasi seluruh input di frontend dan memastikan validasi penting tetap dilakukan di backend.
3. Memastikan format email valid dan password memenuhi persyaratan keamanan yang diterapkan.
4. Mengirim permintaan registrasi melalui mekanisme autentikasi resmi yang digunakan proyek.
5. Mengirim email konfirmasi yang berisi tautan verifikasi unik dan aman.
6. Menampilkan informasi yang jelas bahwa pengguna harus membuka email dan menyelesaikan konfirmasi sebelum dapat menggunakan akun.
7. Menampilkan alamat email tujuan agar pengguna dapat memeriksa kotak masuk yang benar.
8. Menyediakan tindakan untuk mengirim ulang email konfirmasi dengan pembatasan frekuensi yang wajar.
9. Menangani kemungkinan email terlambat, masuk ke folder spam, gagal dikirim, atau terjadi kesalahan jaringan.
10. Mencegah registrasi ganda yang tidak perlu serta menangani respons backend secara aman tanpa membocorkan informasi akun sensitif.

Jangan menganggap permintaan registrasi berhasil hanya karena tombol telah ditekan. Tampilkan status berdasarkan hasil operasi autentikasi yang sebenarnya.

2.2. Konfirmasi email wajib sebelum login

Terapkan aturan berikut secara konsisten di frontend dan backend:

- Akun yang belum terkonfirmasi tidak boleh memperoleh akses ke halaman privat atau fitur yang membutuhkan autentikasi terverifikasi.
- Jika pengguna mencoba login sebelum mengonfirmasi email, tampilkan pesan bahwa email belum diverifikasi.
- Sediakan tindakan untuk mengirim ulang tautan konfirmasi.
- Jangan membuat sesi yang memberikan akses ke aplikasi privat bagi akun yang belum terverifikasi.
- Jangan mengandalkan pemeriksaan frontend saja. Semua endpoint, server action, API, dan operasi data privat harus tetap memvalidasi status autentikasi yang sah.
- Jika sesi sementara terbentuk karena perilaku library autentikasi, pastikan sesi tersebut tidak dapat digunakan untuk melewati pemeriksaan verifikasi.

Gunakan status verifikasi resmi dari penyedia autentikasi, misalnya "email_confirmed_at" pada Supabase Auth apabila sesuai dengan versi dan implementasi yang digunakan. Jangan membuat status verifikasi buatan di tabel profil yang dapat dimanipulasi pengguna.

2.3. Setelah email berhasil dikonfirmasi

Ini adalah persyaratan utama yang harus dipertahankan.

Jika pengguna sudah mengklik tautan konfirmasi yang valid dan status emailnya berhasil diverifikasi:

- Akun harus dikenali sebagai akun terverifikasi secara permanen sampai ada perubahan status yang sah dari penyedia autentikasi.
- Pengguna tidak perlu mengonfirmasi email lagi setiap kali login.
- Pengguna dapat login menggunakan kredensial yang benar tanpa menerima email konfirmasi baru.
- Login berikutnya tidak boleh mengirim email verifikasi berulang kali.
- Status verifikasi harus tetap dikenali setelah logout, refresh halaman, browser ditutup, atau pengguna kembali di kemudian hari.
- Pengguna yang sudah terverifikasi tetap harus melewati autentikasi normal, termasuk pemeriksaan password atau metode login yang berlaku.
- Tautan konfirmasi yang sudah digunakan tidak perlu digunakan kembali untuk login biasa.

Pastikan alur callback konfirmasi menangani token yang valid, token kedaluwarsa, token tidak valid, tautan yang sudah digunakan, dan kegagalan pertukaran kode dengan benar.

2.4. Halaman dan pengalaman konfirmasi email

Buat atau sempurnakan halaman yang diperlukan sesuai sistem routing proyek, meliputi:

- Informasi setelah registrasi berhasil.
- Petunjuk memeriksa kotak masuk dan folder spam.
- Tombol kirim ulang konfirmasi.
- Indikator loading ketika permintaan sedang diproses.
- Pesan sukses setelah konfirmasi benar-benar berhasil.
- Pesan kesalahan yang dapat dipahami pengguna.
- Penanganan tautan kedaluwarsa dan opsi meminta tautan baru.
- Penanganan jika pengguna membuka halaman konfirmasi saat sudah login.
- Redirect yang aman menuju halaman aplikasi yang semestinya setelah verifikasi.

Pastikan URL redirect sesuai dengan domain yang diizinkan dan konfigurasi Supabase. Jangan menggunakan redirect URL sembarang yang dapat membuka celah open redirect.

Jangan menampilkan halaman sukses jika status verifikasi belum benar-benar dikonfirmasi oleh backend.

2.5. Login, logout, dan pemulihan sesi

Periksa dan sempurnakan:

- Login dengan email dan password.
- Pesan khusus untuk email yang belum diverifikasi.
- Validasi kredensial salah dan penanganan error autentikasi.
- Logout yang benar dan penghapusan sesi sesuai mekanisme autentikasi.
- Pemulihan sesi setelah refresh.
- Persistensi sesi sesuai perilaku aman library yang digunakan.
- Proteksi halaman privat dan dashboard.
- Redirect setelah login serta pencegahan redirect berulang.
- Penanganan sesi kedaluwarsa dan refresh token.
- Pemisahan yang benar antara status login dan status verifikasi email.

Jangan mengimplementasikan sistem penyimpanan password sendiri. Password harus ditangani oleh penyedia autentikasi resmi.

3. MENU AKUN DAN MANAJEMEN PROFIL

Tambahkan menu Akun yang terintegrasi dengan desain navigasi Xeangform yang sudah ada.

Menu ini harus menjadi halaman pengelolaan akun yang berfungsi sungguhan, bukan sekadar halaman statis atau kumpulan input tanpa integrasi backend.

3.1. Informasi yang ditampilkan

Tampilkan informasi berikut:

A. Username/Nama

- Menampilkan nama atau username pengguna.
- Memungkinkan pengguna mengubah nama atau username jika aturan aplikasi mengizinkannya.
- Melakukan validasi panjang karakter, karakter yang diizinkan, dan format input.
- Menangani username unik jika proyek memang menerapkan username unik.
- Menyimpan perubahan ke sumber data yang benar.
- Memastikan perubahan tetap tersedia setelah halaman dimuat ulang.

B. Email

- Menampilkan email akun yang sedang digunakan.
- Memberikan tindakan untuk mengganti email jika didukung.
- Untuk pergantian email, ikuti mekanisme verifikasi email baru yang disediakan oleh penyedia autentikasi.
- Jangan langsung menganggap email baru sudah terverifikasi sebelum proses yang diwajibkan selesai.
- Tampilkan status email terverifikasi atau belum terverifikasi jika relevan.
- Tangani perubahan email yang tertunda, gagal, atau membutuhkan konfirmasi tambahan.

C. Password

- Jangan pernah menampilkan password lama dalam bentuk teks.
- Jangan mengambil atau menyimpan password dalam tabel profil.
- Tampilkan informasi bahwa password dapat diubah.
- Sediakan formulir ubah password yang aman.

3.2. Fitur ubah password

Implementasikan proses penggantian password dengan ketentuan:

1. Sediakan kolom password baru dan konfirmasi password baru.
2. Sediakan tombol untuk memperlihatkan atau menyembunyikan input password.
3. Validasi persyaratan password sebelum mengirim permintaan.
4. Pastikan kedua kolom password baru cocok.
5. Gunakan API resmi penyedia autentikasi untuk memperbarui password.
6. Jika autentikasi ulang atau konfirmasi identitas diperlukan, ikuti kebijakan keamanan penyedia.
7. Jangan mengirim password melalui URL, query string, atau log.
8. Kosongkan input password setelah operasi selesai.
9. Tampilkan pesan sukses hanya setelah backend memastikan perubahan berhasil.
10. Tangani kegagalan tanpa membuat pengguna kehilangan sesi secara tidak terduga.

Tambahkan perlindungan agar formulir tidak dapat dikirim berkali-kali ketika permintaan pertama masih berjalan.

3.3. Integrasi profil dengan database

Periksa apakah proyek sudah memiliki tabel profil pengguna.

Jika sudah ada, gunakan dan sesuaikan tabel tersebut daripada membuat duplikasi data. Jika belum ada, buat rancangan minimal yang sesuai dengan arsitektur proyek.

Ketentuan:

- Hubungkan profil dengan ID pengguna autentikasi yang benar.
- Jangan menjadikan email atau username sebagai satu-satunya identitas relasi akun.
- Terapkan RLS dan kebijakan akses yang membatasi setiap pengguna untuk membaca atau mengubah profil miliknya sendiri.
- Validasi perubahan sensitif melalui mekanisme backend yang tepat.
- Cegah pengguna mengubah "user_id", status verifikasi, peran administratif, atau kolom internal yang tidak boleh diubah.
- Tangani kondisi profil belum terbentuk, data tidak lengkap, dan kegagalan sinkronisasi.
- Pastikan pembuatan profil tidak menghasilkan duplikasi saat callback atau permintaan diproses lebih dari sekali.
- Pertahankan kompatibilitas dengan data akun yang sudah ada.

Jangan mengubah skema database produksi secara langsung tanpa memeriksa migrasi, dependensi, dan dampaknya terlebih dahulu. Jika perubahan skema diperlukan, gunakan migrasi yang dapat ditinjau, aman, dan sebisa mungkin kompatibel dengan data lama.

3.4. Desain halaman Akun

Buat halaman yang terlihat profesional dan menyatu dengan UI Xeangform.

Halaman dapat memiliki bagian:

- Informasi profil.
- Informasi email dan status verifikasi.
- Pengaturan keamanan.
- Formulir perubahan nama atau username.
- Formulir pergantian email.
- Formulir ubah password.
- Indikator penyimpanan dan status pembaruan.

Gunakan tata letak yang jelas, jarak antarelemen yang konsisten, label input yang mudah dipahami, ikon yang relevan, serta notifikasi keberhasilan dan kegagalan.

Pada perangkat seluler, pastikan formulir tidak terpotong, keyboard tidak menutupi seluruh kontrol penting, dan tombol tetap mudah dijangkau.

4. SISTEM BACKGROUND ANIMASI GLOBAL

Saya ingin background Xeangform terasa hidup, modern, halus, dan interaktif. Namun, pengguna juga harus bisa memilih untuk menonaktifkan gerakan.

Terapkan sistem background animasi yang konsisten di seluruh halaman yang relevan, bukan hanya pada satu halaman tertentu.

4.1. Mode background

Sediakan dua mode utama:

Mode Gerak

- Background menampilkan animasi halus dan berkelanjutan.
- Gerakan dapat berupa gradasi dinamis, pergeseran cahaya, partikel dekoratif ringan, atau efek visual lain yang sesuai dengan desain Xeangform.
- Animasi harus terasa elegan, tidak berlebihan, dan tidak mengganggu pembacaan teks.
- Gerakan tidak boleh menyebabkan kedipan, perubahan warna ekstrem, atau pergerakan elemen UI yang mengganggu.
- Efek harus tetap stabil ketika halaman digulir, dibuka ulang, atau berpindah rute.

Mode Diam

- Background tetap ditampilkan dengan komposisi visual yang menarik.
- Semua animasi background nonesensial dihentikan atau diganti dengan tampilan statis yang setara.
- Tidak boleh ada animasi yang tetap berjalan diam-diam setelah pengguna memilih mode diam.
- Konten, navigasi, tombol, formulir, dan interaksi aplikasi tetap berfungsi normal.

Nama, posisi, dan tampilan kontrol pemilihan mode harus mengikuti sistem desain yang telah ada.

4.2. Pengaturan global

Buat satu sumber pengaturan background yang dapat digunakan oleh seluruh halaman.

Ketentuan:

- Mode yang dipilih diterapkan secara konsisten ke seluruh halaman yang mendukung background global.
- Perubahan mode berlaku tanpa perlu memuat ulang halaman.
- Jangan membuat state mode terpisah yang saling bertentangan di setiap komponen.
- Jika pengguna memilih mode diam, hentikan animasi yang relevan dengan benar.
- Pastikan pergantian rute tidak membuat animasi bertumpuk atau menghasilkan instance yang tidak dibersihkan.
- Jika aplikasi sudah mempunyai sistem tema atau preferensi tampilan, integrasikan fitur ini tanpa merusaknya.

4.3. Persistensi preferensi

Pilihan mode harus tetap tersimpan ketika pengguna:

- Berpindah halaman.
- Memuat ulang aplikasi.
- Menutup dan membuka browser kembali.
- Login atau logout, sesuai kebijakan preferensi aplikasi.

Untuk pengguna yang belum login, gunakan penyimpanan preferensi lokal yang sesuai. Jika pengguna login dan arsitektur aplikasi mendukung preferensi tersinkronisasi, simpan preferensi tersebut pada profil atau mekanisme pengaturan pengguna yang aman.

Jika penyimpanan gagal, aplikasi tetap harus dapat digunakan dengan nilai default yang wajar.

Hindari hydration mismatch apabila proyek menggunakan server-side rendering. Jangan membaca browser-only storage secara tidak aman pada proses rendering server.

4.4. Smooth animation dan performa

Prioritaskan animasi yang ringan dan efisien.

- Gunakan CSS animation, transform, opacity, atau teknik lain yang sesuai dengan framework proyek.
- Hindari animasi layout berat yang memicu penghitungan ulang tata letak terus-menerus.
- Jangan membuat loop JavaScript yang berjalan tanpa kebutuhan.
- Hindari penggunaan partikel dalam jumlah berlebihan.
- Jika menggunakan Canvas atau WebGL, pastikan ada pengelolaan lifecycle dan pembersihan resource yang benar.
- Hentikan atau kurangi animasi saat halaman tidak aktif jika sesuai dengan implementasi.
- Pertimbangkan "prefers-reduced-motion" sebagai preferensi aksesibilitas sistem.
- Jangan memaksa animasi berat pada perangkat dengan keterbatasan performa.
- Pastikan animasi tidak menyebabkan scroll horizontal atau menghalangi klik pada elemen UI.
- Background harus berada pada lapisan visual yang benar dan tidak menutupi konten.

Mode diam harus benar-benar menghentikan animasi nonesensial, bukan sekadar mengurangi kecepatannya.

4.5. Interaksi visual

Jika sesuai dengan desain Xeangform, background boleh memiliki respons interaktif yang halus, misalnya perubahan intensitas cahaya atau gradasi saat pointer bergerak.

Namun:

- Interaksi pointer bersifat dekoratif dan tidak wajib.
- Jangan mengharuskan pointer untuk mengoperasikan aplikasi.
- Jangan mengganggu scrolling, pemilihan teks, atau input formulir.
- Pada perangkat sentuh, jangan mensyaratkan hover.
- Pada mode diam, nonaktifkan respons gerakan dekoratif yang bertentangan dengan mode tersebut.
- Hormati preferensi reduced motion.
- Jangan menambahkan efek visual baru yang bertentangan dengan identitas desain Xeangform.

5. DESAIN DAN KONSISTENSI UI/UX

Semua fitur baru harus mengikuti desain Xeangform yang sudah ada.

Sebelum mengubah tampilan, pelajari komponen, warna, tipografi, radius, bayangan, ikon, pola tombol, dan sistem spacing yang sudah digunakan.

Ketentuan:

- Pertahankan identitas visual dan struktur navigasi yang sudah ada.
- Gunakan kembali komponen UI yang relevan.
- Hindari duplikasi komponen yang memiliki fungsi serupa.
- Pertahankan konsistensi pada halaman login, registrasi, konfirmasi email, akun, dan pengaturan.
- Gunakan transisi halus yang tidak mengganggu.
- Tambahkan indikator loading pada operasi jaringan.
- Nonaktifkan tombol yang relevan saat operasi sedang berlangsung.
- Sediakan feedback yang jelas setelah tindakan pengguna.
- Gunakan dialog konfirmasi hanya untuk tindakan yang memang memerlukannya.
- Pastikan fokus keyboard dan indikator fokus terlihat.
- Gunakan label dan pesan kesalahan yang dapat dipahami.
- Jangan menggunakan alert browser sebagai solusi utama jika aplikasi sudah memiliki sistem notifikasi sendiri.
- Hindari perubahan tata letak mendadak saat data dimuat.

Semua halaman wajib responsif untuk ponsel Android, tablet, dan desktop.

6. KEAMANAN DAN PERLINDUNGAN DATA

Lakukan audit keamanan terhadap bagian yang terdampak.

Pastikan:

- Status verifikasi email berasal dari sumber autentikasi tepercaya.
- Halaman privat tidak hanya dilindungi melalui pemeriksaan UI.
- Operasi database mengikuti RLS dan kebijakan akses yang benar.
- Password tidak disimpan dalam tabel profil.
- Kredensial sensitif tidak terekspos ke frontend.
- Validasi penting tidak hanya bergantung pada JavaScript di browser.
- Callback autentikasi tidak menerima redirect sembarang.
- Pesan kesalahan tidak membocorkan informasi internal atau rahasia.
- Pengiriman ulang email memiliki pembatasan yang wajar.
- Perubahan email dan password mengikuti mekanisme keamanan resmi.
- Perubahan profil tidak memungkinkan eskalasi hak akses.
- Penanganan sesi sesuai dengan arsitektur autentikasi yang digunakan.
- Logging dan monitoring tidak menyimpan password, token, atau data autentikasi sensitif.

Jangan menonaktifkan proteksi keamanan yang sudah ada hanya agar alur pengujian berhasil.

7. KONFIGURASI SUPABASE DAN VERCEL

Periksa konfigurasi yang diperlukan untuk mengaktifkan seluruh fitur.

Untuk Supabase, verifikasi:

- Pengaturan konfirmasi email.
- URL situs dan daftar redirect URL yang diizinkan.
- Template email konfirmasi dan tautan callback.
- Alur pertukaran kode atau verifikasi token yang sesuai dengan implementasi proyek.
- Fungsi registrasi dan login.
- Fungsi pemulihan serta pembaruan sesi.
- Struktur tabel profil.
- RLS dan kebijakan database.
- Migrasi yang diperlukan.
- Pengaturan pengiriman email yang digunakan oleh proyek.

Untuk Vercel, verifikasi:

- Environment variables yang diperlukan.
- URL deployment dan domain produksi.
- Redirect callback yang sesuai.
- Perbedaan konfigurasi development, preview, dan production.
- Tidak adanya kredensial sensitif di kode frontend.
- Kompatibilitas implementasi dengan lingkungan build dan runtime deployment.

Jangan menganggap variabel lingkungan lokal otomatis tersedia di seluruh lingkungan deployment. Periksa konfigurasi aktual melalui mekanisme yang aman.

Jangan mencetak nilai rahasia ke log atau laporan.

Jika konfigurasi eksternal memerlukan akses dashboard, kredensial, DNS, template email, atau tindakan manual yang tidak tersedia dari lingkungan kerja, identifikasi dengan jelas apa yang belum dapat diselesaikan. Jangan mengklaim bahwa konfigurasi sudah berhasil diubah jika belum diverifikasi.

Jangan mengubah konfigurasi produksi atau menjalankan migrasi produksi yang berisiko tanpa pemeriksaan dampak dan otorisasi yang sesuai.

8. PENGUJIAN WAJIB

Setelah implementasi, jalankan pengujian bertahap dan dokumentasikan hasil aktualnya.

8.1. Pengujian autentikasi

Uji seluruh skenario berikut:

1. Registrasi menggunakan email baru.
2. Email konfirmasi benar-benar dikirim melalui mekanisme yang dikonfigurasi.
3. Pengguna belum mengonfirmasi email lalu mencoba login.
4. Pengguna belum terverifikasi mencoba mengakses halaman privat secara langsung.
5. Pengguna menerima email dan membuka tautan konfirmasi yang valid.
6. Konfirmasi berhasil dan status terverifikasi dikenali oleh aplikasi.
7. Pengguna yang sudah terverifikasi logout lalu login kembali tanpa konfirmasi ulang.
8. Pengguna yang sudah terverifikasi memuat ulang halaman.
9. Pengguna membuka tautan yang kedaluwarsa.
10. Pengguna membuka tautan yang tidak valid atau sudah digunakan.
11. Pengguna meminta pengiriman ulang email.
12. Password salah atau format input tidak valid.
13. Sesi kedaluwarsa dan pemulihan sesi.
14. Redirect callback dan navigasi setelah login.
15. Penanganan error jaringan dan kegagalan layanan autentikasi.

8.2. Pengujian menu akun

Uji:

- Data akun ditampilkan dengan benar.
- Nama atau username dapat diperbarui.
- Perubahan profil tersimpan dan tetap ada setelah refresh.
- Email ditampilkan dengan benar.
- Pergantian email mengikuti prosedur verifikasi.
- Password dapat diubah melalui API autentikasi resmi.
- Password baru yang tidak cocok ditolak.
- Password tidak muncul dalam log maupun tampilan profil.
- Kegagalan penyimpanan ditangani dengan baik.
- Pengguna tidak dapat membaca atau mengubah profil milik pengguna lain.
- Formulir tidak mengirim permintaan ganda saat loading.

8.3. Pengujian background

Uji:

- Mode gerak berfungsi.
- Mode diam benar-benar menghentikan animasi nonesensial.
- Pergantian mode berlangsung tanpa reload.
- Preferensi tetap tersimpan setelah refresh.
- Preferensi konsisten saat berpindah halaman.
- Tidak ada animasi ganda setelah navigasi.
- Tidak ada kebocoran event listener atau resource.
- Tidak ada kedipan atau pergeseran layout yang mengganggu.
- Animasi tidak menghalangi klik, scroll, atau interaksi formulir.
- Preferensi reduced motion dihormati.
- Background berfungsi pada layar kecil dan besar.
- Performa tetap memadai pada perangkat dengan kemampuan terbatas.

8.4. Pengujian regresi

Pastikan fitur lama tetap berfungsi.

Periksa sekurang-kurangnya:

- Navigasi dan routing.
- Dashboard dan halaman privat.
- Pembuatan serta pengelolaan form.
- Publikasi dan akses form publik.
- Penyimpanan dan pengambilan data.
- Fitur yang bergantung pada autentikasi.
- Komponen notifikasi dan pengaturan jika tersedia.
- Responsivitas halaman.
- Tidak adanya error baru pada console, server log, build, atau deployment.

Jangan menganggap pengujian berhasil jika hanya memeriksa satu halaman.

9. METODE PELAKSANAAN

Kerjakan menggunakan urutan berikut.

Tahap 1 — Audit

Pahami implementasi autentikasi, profil, desain, background, database, dan deployment yang sudah ada.

Tahap 2 — Rencana teknis

Identifikasi file yang perlu diubah, perubahan database, integrasi layanan, risiko regresi, dan strategi pengujian.

Tahap 3 — Implementasi autentikasi

Selesaikan registrasi, konfirmasi email, callback, login, proteksi halaman, dan pemulihan sesi terlebih dahulu.

Tahap 4 — Implementasi menu akun

Integrasikan data profil, pengubahan nama, pergantian email, dan perubahan password dengan backend yang benar.

Tahap 5 — Implementasi background

Buat pengaturan mode gerak/diam yang global, persisten, ringan, dan konsisten.

Tahap 6 — Integrasi dan pengujian

Jalankan pemeriksaan kode, lint, type-check jika tersedia, build, pengujian otomatis, serta pengujian alur aplikasi yang dapat dilakukan.

Tahap 7 — Verifikasi deployment

Periksa hasil deployment dan integrasi layanan. Jika akses ke lingkungan produksi tidak tersedia, nyatakan keterbatasan tersebut secara eksplisit.

Tahap 8 — Laporan akhir

Berikan laporan faktual tentang perubahan, hasil pengujian, risiko yang tersisa, serta tindakan yang masih memerlukan konfigurasi manual.

Jangan berhenti setelah menulis rencana. Lanjutkan implementasi secara nyata selama akses dan kondisi lingkungan memungkinkan.

Jika menemukan error, perbaiki penyebabnya, kemudian ulangi pengujian terkait. Jangan hanya menghapus pesan error tanpa menyelesaikan masalah dasarnya.

10. KRITERIA SELESAI

Pekerjaan baru dianggap selesai jika:

- Registrasi benar-benar menggunakan konfirmasi email.
- Akun yang belum terverifikasi tidak bisa mengakses fitur privat.
- Akun yang sudah terverifikasi bisa login kembali tanpa konfirmasi ulang.
- Callback konfirmasi bekerja dengan aman.
- Menu akun terintegrasi dengan backend.
- Perubahan profil dan password bekerja sesuai ketentuan keamanan.
- Pergantian email mengikuti proses verifikasi yang benar.
- Mode background gerak dan diam tersedia serta berfungsi secara global.
- Preferensi background tersimpan sesuai mekanisme yang dipilih.
- Animasi tidak mengganggu performa, aksesibilitas, atau interaksi.
- UI konsisten dengan desain Xeangform.
- Build dan pemeriksaan kode berhasil, atau setiap kegagalan dijelaskan secara akurat.
- Pengujian yang dapat dilakukan sudah dijalankan dan hasilnya terdokumentasi.
- Tidak ada regresi yang diketahui dan dibiarkan tanpa penjelasan.
- Perubahan database dan konfigurasi deployment terdokumentasi.
- Tidak ada klaim keberhasilan yang tidak didukung hasil verifikasi.

11. FORMAT LAPORAN AKHIR

Setelah menyelesaikan pekerjaan, berikan laporan yang mencakup:

1. Ringkasan implementasi: fitur yang berhasil dibuat atau diperbaiki.
2. Daftar file: file yang ditambah, diubah, atau dihapus beserta alasannya.
3. Autentikasi: penjelasan alur registrasi, verifikasi, login, dan pemulihan sesi.
4. Menu akun: fitur profil, pergantian email, dan perubahan password.
5. Background: cara kerja mode gerak/diam, penyimpanan preferensi, dan optimasi performa.
6. Database: perubahan skema, migrasi, RLS, dan kebijakan akses yang terdampak.
7. Supabase dan Vercel: konfigurasi yang diperiksa dan status aktualnya.
8. Pengujian: perintah dan skenario yang dijalankan serta hasilnya.
9. Status deployment: apakah perubahan sudah ter-deploy dan diverifikasi atau baru tersedia di lingkungan lokal.
10. Kendala: masalah yang belum selesai, penyebab, dan langkah perbaikannya.
11. Tindakan manual: konfigurasi yang masih perlu dilakukan melalui dashboard jika ada.

Bedakan secara tegas antara:

- Berhasil diimplementasikan.
- Berhasil diuji secara lokal.
- Berhasil diuji dengan layanan backend.
- Berhasil diuji pada deployment.
- Belum diuji atau memerlukan tindakan manual.

Jangan menulis “semua berhasil” apabila masih ada bagian yang belum diuji.

INSTRUKSI PENUTUP:

Implementasikan seluruh fitur di atas secara nyata pada proyek Xeangform yang sedang terbuka. Utamakan keamanan autentikasi, integritas data, konsistensi UI, performa animasi, dan kompatibilitas dengan fitur lama. Lakukan pemeriksaan sebelum dan sesudah perubahan, perbaiki bug yang ditemukan, dan laporkan hasil berdasarkan bukti pengujian yang benar-benar diperoleh. Jangan mengarang hasil, jangan mengubah bagian yang tidak diperlukan, dan jangan mengorbankan keamanan demi menyelesaikan pekerjaan lebih cepat.