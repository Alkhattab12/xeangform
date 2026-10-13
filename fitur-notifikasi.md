FITUR BARU: SISTEM NOTIFIKASI TERINTEGRASI — XEANGFORM / SYAMIL FORM

1. TUJUAN UTAMA

Sekarang saya ingin kamu menambahkan menu Notifikasi (Notification Center) ke dalam aplikasi. Menu ini berfungsi sebagai pusat informasi yang menampilkan seluruh aktivitas penting, pembaruan fitur, respons formulir yang masuk, serta notifikasi sistem lainnya secara terstruktur, informatif, dan real-time jika infrastruktur aplikasi mendukungnya.

Fitur ini harus terintegrasi dengan sistem yang sudah ada, bukan sekadar elemen UI statis atau halaman dekoratif.

PENTING: Pertahankan identitas visual, desain, tema, warna, tipografi, gaya komponen, dan karakter UI/UX aplikasi saat ini. Jangan mengubah desain halaman lain yang tidak berkaitan dengan implementasi fitur ini.

Sebelum mulai mengerjakan, periksa struktur proyek, sistem navigasi, autentikasi, database, komponen UI, dan mekanisme penerimaan respons formulir yang sudah tersedia. Gunakan arsitektur dan pola kode yang konsisten dengan proyek saat ini.

2. MENU NOTIFIKASI DAN IKON LONCENG

Tambahkan menu notifikasi yang diakses melalui ikon lonceng (bell icon) pada posisi navigasi yang paling sesuai dengan struktur antarmuka aplikasi saat ini.

Ketentuan:

- Gunakan ikon lonceng yang konsisten dengan gaya ikon yang sudah digunakan aplikasi.
- Pertahankan ukuran, warna, ketebalan garis, jarak, dan posisi ikon agar menyatu dengan elemen navigasi lainnya.
- Ikon harus memiliki area interaksi yang nyaman digunakan pada perangkat desktop maupun mobile.
- Saat ditekan, ikon membuka pusat notifikasi dengan pola interaksi yang paling sesuai dengan desain aplikasi saat ini, misalnya dropdown, popover, panel, atau halaman khusus.
- Jangan memaksakan modal atau dropdown jika pola tersebut bertentangan dengan struktur UI yang sudah ada.
- Pastikan panel notifikasi tidak terpotong, tidak keluar dari viewport, dan tetap nyaman digunakan pada layar berukuran kecil.
- Sediakan tampilan yang jelas untuk judul, daftar notifikasi, status sudah dibaca, waktu kejadian, dan kondisi ketika belum ada notifikasi.

Jika ikon lonceng sudah tersedia di proyek, evaluasi dan gunakan kembali komponen tersebut daripada membuat duplikasi yang tidak diperlukan.

3. ANIMASI INTERAKSI IKON LONCENG — BUBBLE PRESS EFFECT

Tambahkan animasi interaksi berupa efek gelembung yang mengempis atau menekan (bubble press effect) ketika pengguna menekan ikon lonceng.

Animasi ini harus terasa halus, responsif, modern, dan konsisten dengan karakter desain aplikasi.

Detail perilaku yang diharapkan:

1. Ketika pengguna menekan ikon lonceng, tampilkan efek seolah-olah gelembung kecil yang elastis sedang ditekan.
2. Ikon atau area tombol sedikit mengecil saat ditekan, kemudian kembali ke ukuran normal menggunakan animasi spring atau easing yang halus.
3. Tambahkan efek visual pendukung yang subtil, misalnya lingkaran transparan yang mengembang, efek ripple, atau gelembung yang muncul sesaat di sekitar tombol.
4. Setelah animasi tekanan berlangsung, tampilkan panel atau halaman notifikasi tanpa jeda yang terasa mengganggu.
5. Hindari animasi yang terlalu besar, berlebihan, lambat, atau mengganggu keterbacaan.
6. Pastikan animasi tidak menyebabkan layout bergeser, ikon berpindah posisi, atau elemen lain berkedip.
7. Terapkan efek yang sesuai untuk interaksi mouse, sentuhan layar, dan keyboard.
8. Hormati preferensi aksesibilitas "prefers-reduced-motion". Jika pengguna memilih mengurangi animasi, sediakan versi animasi minimal.

Gunakan teknologi animasi yang sudah tersedia dalam proyek, seperti CSS transitions, keyframes, atau library animasi yang memang sudah digunakan. Jangan menambahkan dependency baru jika implementasi yang ada sudah mencukupi.

Target hasil: Ikon lonceng terasa interaktif dan premium, dengan sensasi seperti gelembung elastis yang ditekan, bukan sekadar tombol yang berubah warna.

4. JENIS NOTIFIKASI YANG WAJIB DIDUKUNG

Pusat notifikasi harus dirancang agar dapat menampilkan beberapa kategori berikut.

A. Respons formulir baru

Ketika seseorang mengirimkan respons pada formulir yang dibuat oleh pengguna, sistem harus menghasilkan notifikasi yang relevan bagi pemilik formulir.

Informasi yang dapat ditampilkan meliputi:

- Judul formulir yang menerima respons.
- Keterangan bahwa terdapat respons baru.
- Waktu respons diterima.
- Identitas responden jika memang tersedia dan diizinkan oleh konfigurasi formulir.
- Tautan atau aksi untuk membuka halaman respons formulir yang bersangkutan.

Ketentuan teknis:

- Notifikasi dibuat berdasarkan respons yang benar-benar berhasil disimpan ke database.
- Jangan membuat notifikasi jika pengiriman formulir gagal atau hanya terjadi pada sisi frontend.
- Hindari notifikasi ganda untuk satu peristiwa pengiriman yang sama.
- Pastikan notifikasi hanya diterima oleh pemilik formulir atau pengguna yang memiliki izin akses yang sesuai.
- Jangan tampilkan jawaban sensitif responden secara langsung di pratinjau notifikasi. Tampilkan informasi secukupnya dan arahkan pengguna ke halaman respons yang terlindungi.
- Jika sistem mendukung banyak formulir, setiap notifikasi harus terhubung dengan formulir yang benar.

B. Pembaruan fitur dan produk

Sediakan notifikasi untuk menginformasikan pembaruan aplikasi, misalnya:

- Fitur baru yang telah ditambahkan.
- Peningkatan atau penyempurnaan fitur yang sudah ada.
- Perubahan antarmuka yang relevan.
- Perbaikan bug.
- Peningkatan performa.
- Informasi penting mengenai layanan.

Setiap notifikasi pembaruan sebaiknya memiliki judul, ringkasan, waktu publikasi, kategori, serta tautan detail jika diperlukan.

Gunakan mekanisme pengelolaan pengumuman yang sesuai dengan arsitektur proyek. Jangan mengarang data pembaruan atau menampilkan pengumuman palsu sebagai informasi sistem yang nyata.

C. Notifikasi sistem

Sediakan fondasi untuk notifikasi penting lainnya, seperti:

- Status publikasi formulir.
- Informasi ketika formulir berhasil dipublikasikan.
- Pemberitahuan penting mengenai status formulir.
- Informasi kegagalan atau gangguan proses yang relevan.
- Pengumuman pemeliharaan layanan.
- Informasi penting lain yang memang dihasilkan oleh sistem.

Jangan membuat notifikasi untuk setiap aktivitas kecil yang tidak diperlukan. Prioritaskan informasi yang benar-benar bermanfaat bagi pengguna.

5. DESAIN ITEM NOTIFIKASI

Setiap item notifikasi harus mengikuti desain aplikasi yang sudah ada.

Komponen informasi yang direkomendasikan:

- Indikator visual kategori notifikasi.
- Judul singkat dan mudah dipahami.
- Deskripsi atau ringkasan.
- Waktu kejadian, misalnya beberapa menit yang lalu.
- Indikator status belum dibaca.
- Aksi untuk membuka detail atau menuju halaman terkait.

Aturan desain:

- Pertahankan palet warna, radius sudut, border, bayangan, tipografi, dan jarak yang konsisten dengan komponen aplikasi lainnya.
- Jika aplikasi menggunakan gaya neobrutalism, pertahankan karakter tersebut tanpa membuat pusat notifikasi terlihat seperti komponen dari aplikasi yang berbeda.
- Gunakan hierarki visual yang jelas untuk membedakan judul, deskripsi, waktu, dan status baca.
- Berikan hover, focus, pressed, dan active state yang sesuai dengan sistem desain.
- Gunakan ikon kategori yang konsisten dan mudah dikenali.
- Hindari penggunaan warna yang terlalu mencolok secara berlebihan.
- Pastikan teks panjang dapat dibaca dan tidak merusak tata letak.
- Gunakan format tanggal dan waktu yang konsisten dengan pengaturan aplikasi.

6. BADGE JUMLAH NOTIFIKASI BELUM DIBACA

Tambahkan indikator jumlah notifikasi yang belum dibaca pada ikon lonceng.

Ketentuan:

- Badge hanya menghitung notifikasi yang benar-benar berstatus belum dibaca.
- Badge diperbarui ketika notifikasi baru masuk, dibaca, atau dihapus sesuai kebijakan sistem.
- Gunakan indikator visual kecil yang menyatu dengan ikon lonceng.
- Jika jumlah notifikasi melebihi batas tampilan, gunakan format ringkas seperti "9+".
- Jika tidak ada notifikasi belum dibaca, sembunyikan angka atau tampilkan indikator kosong sesuai gaya desain aplikasi.
- Pastikan badge tidak menutupi ikon lonceng secara berlebihan.
- Jumlah notifikasi harus berasal dari data yang benar, bukan angka statis.

Jika memungkinkan, tampilkan indikator visual yang subtil ketika notifikasi baru masuk, tetapi hindari animasi yang terus berulang atau mengganggu pengguna.

7. STATUS BACA DAN PENGELOLAAN NOTIFIKASI

Setiap notifikasi harus memiliki status yang jelas, minimal:

- Belum dibaca.
- Sudah dibaca.

Tambahkan interaksi berikut jika sesuai dengan struktur aplikasi:

1. Menandai satu notifikasi sebagai sudah dibaca.
2. Menandai seluruh notifikasi sebagai sudah dibaca.
3. Membuka notifikasi dan langsung menuju halaman terkait.
4. Menampilkan notifikasi terbaru terlebih dahulu.
5. Menampilkan kondisi kosong ketika tidak ada notifikasi.
6. Memuat daftar secara bertahap jika jumlah notifikasi banyak.

Jangan mengubah status baca hanya berdasarkan hover atau tindakan yang tidak disengaja.

Perubahan status harus tersimpan secara persisten sehingga status baca tidak kembali seperti semula hanya karena halaman dimuat ulang atau pengguna masuk kembali ke akun.

Penghapusan notifikasi boleh ditambahkan jika sesuai dengan kebutuhan dan pola UI yang sudah ada, tetapi jangan menghapus data respons formulir atau data bisnis ketika pengguna menghapus sebuah notifikasi.

8. INTEGRASI BACKEND, DATABASE, DAN REAL-TIME

Implementasikan sistem notifikasi yang benar-benar berfungsi dengan backend proyek.

Sebelum membuat tabel, endpoint, subscription, atau mekanisme baru, periksa terlebih dahulu fasilitas yang sudah tersedia.

Jika proyek menggunakan Supabase:

- Evaluasi apakah diperlukan tabel notifikasi khusus.
- Simpan hubungan antara notifikasi dan pengguna penerima dengan skema yang jelas.
- Simpan kategori, judul, deskripsi, waktu kejadian, status baca, serta referensi ke entitas terkait jika diperlukan.
- Gunakan Row Level Security (RLS) agar setiap pengguna hanya dapat mengakses notifikasi miliknya.
- Pastikan kebijakan "SELECT", "INSERT", "UPDATE", dan operasi lainnya tidak memberi akses yang terlalu luas.
- Gunakan mekanisme server-side yang sesuai untuk membuat notifikasi dari peristiwa yang valid.
- Evaluasi Supabase Realtime jika aplikasi memerlukan pembaruan notifikasi secara langsung tanpa memuat ulang halaman.
- Tangani koneksi terputus dan sambungkan kembali subscription secara aman.
- Pastikan mekanisme real-time tidak menghasilkan listener ganda atau notifikasi duplikat.
- Hindari mengekspos service-role key atau kredensial backend di frontend.

Jika aplikasi menggunakan backend atau database berbeda, sesuaikan implementasinya dengan teknologi yang benar-benar digunakan proyek.

Jangan mengasumsikan bahwa seluruh fasilitas sudah tersedia hanya karena suatu layanan telah terhubung. Verifikasi konfigurasi, skema, izin, dan implementasi aktual terlebih dahulu.

9. KEAMANAN DAN KEPEMILIKAN DATA

Keamanan notifikasi merupakan bagian wajib dari implementasi.

Pastikan:

- Pengguna tidak dapat membaca notifikasi milik pengguna lain.
- Pengguna tidak dapat mengubah status baca notifikasi milik orang lain.
- Pengguna tidak dapat memalsukan notifikasi yang memiliki otoritas sistem melalui manipulasi frontend.
- Notifikasi respons formulir hanya diberikan kepada pemilik formulir atau pihak yang memiliki izin.
- Identitas responden hanya ditampilkan sesuai pengaturan privasi dan akses formulir.
- Referensi formulir atau respons tidak boleh menjadi jalan untuk melewati pemeriksaan otorisasi.
- Validasi dan operasi penting dilakukan di sisi server atau melalui kebijakan database yang sesuai.
- Pesan error tidak membocorkan detail internal atau informasi sensitif.

Jangan menurunkan keamanan yang sudah ada demi mempermudah implementasi fitur.

10. RESPONSIF DAN AKSESIBILITAS

Pastikan fitur berfungsi dengan baik pada:

- Ponsel Android dan iOS.
- Tablet.
- Laptop.
- Desktop dengan berbagai ukuran layar.

Perhatikan hal-hal berikut:

- Panel notifikasi menyesuaikan lebar viewport.
- Tombol dan item notifikasi nyaman disentuh.
- Navigasi keyboard dapat digunakan.
- Fokus terlihat dengan jelas.
- Ikon memiliki label aksesibel.
- Status notifikasi tidak hanya dibedakan berdasarkan warna.
- Kontras teks memadai.
- Animasi menghormati preferensi pengurangan gerakan.
- Penggunaan layar sentuh tidak memerlukan hover.

Jangan sampai panel notifikasi menghalangi seluruh antarmuka tanpa mekanisme penutupan yang jelas.

11. LOADING, EMPTY STATE, DAN ERROR STATE

Buat tampilan yang layak untuk seluruh kondisi sistem.

Loading state

- Tampilkan indikator loading atau skeleton yang sesuai dengan desain aplikasi.
- Hindari kedipan UI saat data dimuat.
- Jangan tampilkan data dummy seolah-olah merupakan data asli.

Empty state

- Tampilkan pesan yang ramah ketika belum ada notifikasi.
- Gunakan ilustrasi atau ikon hanya jika sesuai dengan gaya visual aplikasi.
- Jangan tampilkan badge angka jika memang tidak ada notifikasi yang belum dibaca.

Error state

- Tampilkan pesan yang dapat dipahami pengguna ketika notifikasi gagal dimuat.
- Sediakan mekanisme mencoba kembali jika diperlukan.
- Jangan menghapus data lokal atau mengubah status baca secara keliru ketika terjadi kegagalan.
- Catat error teknis melalui mekanisme logging yang sudah digunakan proyek.

12. PERFORMA DAN KUALITAS IMPLEMENTASI

Implementasikan fitur tanpa menurunkan performa aplikasi.

Ketentuan:

- Hindari query berulang yang tidak diperlukan.
- Gunakan pagination atau pemuatan bertahap jika jumlah notifikasi berpotensi besar.
- Hindari mengambil seluruh data respons formulir hanya untuk menampilkan daftar notifikasi.
- Gunakan indeks database yang relevan setelah memeriksa pola query dan skema.
- Hindari render ulang komponen secara berlebihan.
- Pastikan subscription real-time dibersihkan ketika komponen tidak lagi digunakan.
- Gunakan tipe data dan validasi yang konsisten.
- Hindari duplikasi komponen, fungsi, dan logika bisnis.
- Jangan menginstal library baru tanpa alasan teknis yang jelas.

13. KRITERIA PENGUJIAN DAN PENERIMAAN

Setelah implementasi, uji setidaknya skenario berikut:

1. Ikon lonceng muncul pada lokasi navigasi yang tepat.
2. Efek bubble press berjalan saat ikon ditekan.
3. Panel notifikasi dapat dibuka dan ditutup.
4. Daftar notifikasi ditampilkan dengan data yang benar.
5. Respons formulir yang berhasil disimpan menghasilkan notifikasi untuk penerima yang berwenang.
6. Pengiriman formulir yang gagal tidak menghasilkan notifikasi sukses palsu.
7. Notifikasi baru memperbarui badge jumlah belum dibaca.
8. Menandai notifikasi sebagai dibaca memperbarui badge dengan benar.
9. Status baca tetap tersimpan setelah halaman dimuat ulang.
10. Notifikasi pembaruan aplikasi dapat ditampilkan melalui mekanisme pengelolaan yang benar.
11. Pengguna tidak dapat melihat atau mengubah notifikasi milik pengguna lain.
12. Tampilan tetap rapi di perangkat mobile maupun desktop.
13. Loading, empty state, dan error state berfungsi dengan baik.
14. Tidak ada duplikasi notifikasi akibat retry, subscription ganda, atau pemrosesan peristiwa berulang.
15. Tidak ada regresi pada fitur formulir, autentikasi, publikasi, atau pengelolaan respons yang sudah ada.

Jalankan pemeriksaan dan pengujian yang sesuai dengan proyek, termasuk lint, type-check, build, serta tes yang sudah tersedia. Perbaiki error yang muncul akibat perubahan ini.

14. BATASAN PERUBAHAN

- Jangan merombak desain aplikasi secara keseluruhan.
- Jangan menghapus atau merusak fitur yang sudah berjalan.
- Jangan mengganti teknologi utama atau struktur arsitektur tanpa alasan yang kuat.
- Jangan menghapus data pengguna, formulir, maupun respons yang sudah tersimpan.
- Jangan mengubah konfigurasi produksi atau menjalankan migrasi database yang berisiko tanpa pemeriksaan dan persetujuan yang diperlukan.
- Jangan membuat data notifikasi palsu untuk menutupi backend yang belum berfungsi.
- Jangan menganggap fitur selesai hanya karena tampilannya sudah muncul.
- Jangan menambahkan dependency yang tidak diperlukan.

Utamakan perubahan yang minimal, terarah, aman, dan konsisten dengan pola implementasi proyek.

15. LAPORAN HASIL PEKERJAAN

Setelah selesai, berikan laporan ringkas tetapi jelas yang mencakup:

1. Fitur yang berhasil ditambahkan.
2. File atau komponen yang dibuat dan diubah.
3. Cara notifikasi respons formulir dihasilkan.
4. Struktur backend atau database yang digunakan, jika ada perubahan.
5. Implementasi status baca, badge, dan real-time.
6. Pengujian yang dijalankan beserta hasilnya.
7. Kendala atau pekerjaan yang belum selesai.
8. Apakah diperlukan migrasi database, konfigurasi tambahan, atau tindakan manual.

INSTRUKSI AKHIR: Kerjakan implementasi secara langsung pada kode proyek yang sedang terbuka. Jangan berhenti pada analisis, rekomendasi, contoh kode, atau mockup. Periksa implementasi yang ada, rencanakan perubahan seperlunya, lakukan modifikasi nyata, kemudian verifikasi hasilnya. Jika terdapat keputusan teknis yang belum pasti, periksa kode dan konfigurasi terlebih dahulu sebelum mengambil keputusan. Jangan mengklaim fitur berhasil jika belum benar-benar diimplementasikan dan diuji.
