PENGEMBANGAN FITUR ANTI-CHEATING, TAB LOCK, DAN SISTEM PELANGGARAN PADA XEANGFORM

1. Tujuan Pengembangan

Saya ingin mengembangkan fitur keamanan Anti-Cheating & Tab Lock System pada Xean Digital Form untuk mencegah atau mengurangi kecurangan selama peserta mengerjakan form, terutama untuk kebutuhan ujian online, kuis, tes seleksi, dan evaluasi.

Fitur ini harus memberikan kontrol kepada pembuat form untuk mengaktifkan sistem pengawasan. Ketika fitur diaktifkan, sistem harus memantau aktivitas peserta yang dapat dideteksi oleh browser, menampilkan peringatan ketika terjadi pelanggaran, mengirimkan notifikasi kepada pembuat form, serta mencatat seluruh pelanggaran dalam riwayat yang dapat diperiksa.

Aturan utama: apabila peserta melakukan tiga kali pelanggaran yang valid, peserta harus otomatis dikeluarkan dari sesi pengerjaan dan tidak dapat melanjutkan atau memasuki kembali form tersebut menggunakan sesi yang sama.

Implementasikan fitur ini secara nyata pada aplikasi, bukan sekadar membuat tampilan UI. Seluruh pengaturan, pemantauan, notifikasi, pencatatan pelanggaran, dan pemblokiran harus terintegrasi dengan backend serta database yang digunakan proyek.

2. Pengaturan Keamanan di Sisi Pembuat Form

Tambahkan bagian pengaturan bernama Security & Anti-Cheating pada halaman pembuatan atau pengeditan form.

Pembuat form harus memiliki kontrol berikut.

A. Enable Anti-Cheating Mode

- Sakelar untuk mengaktifkan atau menonaktifkan sistem anti-cheating.
- Jika dinonaktifkan, peserta dapat mengerjakan form secara normal tanpa aturan tambahan dari fitur ini.
- Jika diaktifkan, sistem mulai menerapkan aturan keamanan yang dipilih ketika peserta memulai pengerjaan.
- Pengaturan harus tersimpan di database dan tetap berlaku setelah halaman dimuat ulang.
- Tampilkan deskripsi singkat mengenai jenis aktivitas yang dipantau dan konsekuensi pelanggarannya.

B. Tab Lock / Focus Protection

Sediakan opsi pengawasan berikut yang dapat diatur oleh pembuat form:

- Detect Tab Switching: mendeteksi ketika peserta berpindah ke tab browser lain sehingga tab form tidak lagi terlihat.
- Detect Window Focus Loss: mendeteksi ketika jendela browser kehilangan fokus.
- Require Fullscreen Mode: meminta peserta memasuki mode layar penuh selama pengerjaan.
- Detect Fullscreen Exit: mencatat ketika peserta keluar dari mode layar penuh setelah memulai pengerjaan.
- Detect Page Navigation: mendeteksi ketika peserta mencoba meninggalkan halaman pengerjaan atau melakukan navigasi keluar dari form, sejauh dapat diketahui oleh browser.
- Restrict Copy and Paste: jika diperlukan, membatasi aktivitas salin-tempel melalui mekanisme yang sesuai dengan kemampuan browser.
- Violation Limit: tetapkan batas maksimal tiga pelanggaran sebagai nilai default dan jangan mengizinkan perubahan aturan secara sepihak oleh peserta selama pengerjaan berlangsung.

Setiap pengaturan harus memiliki deskripsi, status aktif/nonaktif, dan penjelasan mengenai keterbatasan deteksi.

C. Aturan Peringatan

Pembuat form dapat menggunakan aturan default:

- Pelanggaran pertama: tampilkan peringatan pertama.
- Pelanggaran kedua: tampilkan peringatan terakhir sebelum pembatasan otomatis.
- Pelanggaran ketiga: hentikan sesi pengerjaan dan blokir percobaan tersebut.

Batas tiga pelanggaran menjadi aturan utama sistem, kecuali pembuat form diberi kontrol resmi untuk mengubahnya sebelum peserta memulai ujian.

3. Sistem Deteksi Pelanggaran di Sisi Peserta

Ketika peserta membuka form yang mengaktifkan Anti-Cheating Mode, sistem harus memulai sesi pengawasan setelah peserta memberikan persetujuan dan menekan tombol untuk memulai pengerjaan.

Tampilkan pemberitahuan sebelum sesi dimulai bahwa aktivitas perpindahan tab, kehilangan fokus, keluar dari fullscreen, dan aktivitas lain yang diaktifkan oleh pembuat form dapat dicatat sebagai pelanggaran.

A. Deteksi Perpindahan Tab

Gunakan mekanisme browser yang sesuai, seperti Page Visibility API, untuk mendeteksi ketika halaman form berubah menjadi tidak terlihat.

Contoh alur:

1. Peserta sedang mengerjakan form.
2. Peserta berpindah ke tab lain.
3. Sistem mencatat kejadian tersebut sebagai potensi pelanggaran.
4. Setelah kejadian terverifikasi sesuai aturan sistem, jumlah pelanggaran bertambah.
5. Peringatan muncul ketika peserta kembali melihat halaman form.

Pelanggaran harus tetap tercatat meskipun peserta baru kembali beberapa saat kemudian.

B. Deteksi Berpindah Aplikasi atau Jendela

Ketika peserta berpindah dari browser ke aplikasi lain, sistem dapat mendeteksi perubahan visibilitas atau hilangnya fokus apabila browser menyediakan sinyal tersebut.

Sistem harus membedakan antara:

- Perpindahan tab browser.
- Kehilangan fokus jendela.
- Keluar dari fullscreen.
- Upaya navigasi keluar dari halaman.

Hindari menghitung satu kejadian sebagai beberapa pelanggaran hanya karena beberapa event browser terpicu bersamaan.

C. Aktivitas AI dan Ekstensi Browser

Saya ingin sistem membantu mengurangi kemungkinan peserta menggunakan AI, ekstensi browser, atau alat bantu lain yang tidak diizinkan selama pengerjaan.

Implementasikan deteksi secara realistis sesuai kemampuan browser. Browser web biasa tidak dapat secara andal mengetahui seluruh aplikasi lain yang sedang dibuka, memastikan peserta menggunakan AI eksternal, atau mendeteksi semua ekstensi yang terpasang.

Karena itu:

- Gunakan perubahan visibilitas, kehilangan fokus, keluar dari fullscreen, dan sinyal browser relevan lainnya sebagai indikator yang dapat dicatat.
- Jangan mengklaim bahwa peserta menggunakan AI hanya berdasarkan kehilangan fokus atau perpindahan tab.
- Jangan mengklaim dapat mendeteksi seluruh ekstensi browser melalui JavaScript biasa.
- Jika terdapat pemeriksaan tambahan yang benar-benar didukung browser, implementasikan secara terbatas, transparan, dan sesuai privasi.
- Berikan informasi kepada pembuat form tentang jenis kejadian yang benar-benar terdeteksi, bukan dugaan yang disajikan sebagai fakta.

Tujuannya adalah menciptakan pengawasan yang efektif tanpa memberikan klaim keamanan palsu.

4. Sistem Peringatan Otomatis kepada Peserta

Setiap pelanggaran yang valid harus menghasilkan peringatan yang jelas, langsung terlihat, dan tidak mudah terlewatkan.

Pelanggaran pertama

Tampilkan dialog peringatan:

PERINGATAN 1/3 — AKTIVITAS TIDAK DIIZINKAN

Anda terdeteksi melakukan aktivitas yang melanggar aturan keamanan form, seperti berpindah tab atau meninggalkan mode pengerjaan.

Harap kembali fokus pada form dan jangan mengulangi aktivitas tersebut. Pelanggaran berikutnya akan dicatat oleh sistem.

Pelanggaran kedua

Tampilkan dialog peringatan:

PERINGATAN TERAKHIR 2/3 — RISIKO PEMBLOKIRAN

Sistem telah mencatat dua pelanggaran selama pengerjaan Anda. Apabila terjadi satu pelanggaran valid lagi, sesi pengerjaan akan dihentikan secara otomatis dan Anda tidak dapat melanjutkan form menggunakan percobaan ini.

Pelanggaran ketiga

Tampilkan pemberitahuan:

SESI DIHENTIKAN — BATAS PELANGGARAN TERCAPAI

Anda telah mencapai batas tiga pelanggaran yang ditetapkan oleh pembuat form. Sesi pengerjaan Anda dihentikan dan akses ke percobaan ini telah diblokir.

Periksa instruksi dari penyelenggara apabila Anda merasa terjadi kesalahan atau membutuhkan peninjauan.

Setelah pelanggaran ketiga, jangan sekadar menyembunyikan form dari tampilan. Backend harus menandai percobaan sebagai dihentikan atau diblokir sehingga peserta tidak dapat melanjutkan dengan memuat ulang halaman.

5. Dashboard Pelanggaran untuk Pembuat Form

Tambahkan bagian Violation Monitor pada dashboard pembuat form.

Bagian ini harus menampilkan informasi pelanggaran secara real-time apabila infrastruktur aplikasi mendukungnya. Gunakan mekanisme komunikasi yang sesuai, seperti WebSocket, Server-Sent Events, atau mekanisme pembaruan lainnya.

Informasi yang ditampilkan:

- Nama peserta.
- Identitas peserta sesuai data yang tersedia dalam form.
- Nama atau judul form.
- Waktu mulai pengerjaan.
- Waktu setiap pelanggaran.
- Jenis aktivitas yang terdeteksi.
- Jumlah pelanggaran, misalnya 1/3, 2/3, atau 3/3.
- Status pengerjaan: berlangsung, selesai, dihentikan, atau diblokir.
- Riwayat peringatan yang telah dikirimkan.
- Informasi teknis relevan yang tersedia untuk membantu pemeriksaan.

Setiap pelanggaran baru harus muncul pada daftar tanpa mengharuskan pembuat form memuat ulang halaman secara manual.

Tambahkan indikator visual yang membedakan:

- Pelanggaran pertama.
- Pelanggaran kedua.
- Pelanggaran ketiga atau sesi yang dihentikan.

Gunakan label status yang jelas dan mudah dibaca.

6. Sistem Notifikasi Real-Time

Setiap kali peserta melakukan pelanggaran yang valid, kirimkan notifikasi kepada pembuat form yang berwenang.

Contoh notifikasi:

Pelanggaran Baru Terdeteksi

Peserta: [Nama Peserta]

Form: [Judul Form]

Jenis: [Perpindahan Tab]

Pelanggaran: [1/3]

Waktu: [Tanggal dan Waktu]

Status: [Sedang Mengerjakan]

Ketika peserta mencapai tiga pelanggaran, kirim notifikasi prioritas:

PESERTA DIBLOKIR OTOMATIS

Peserta: [Nama Peserta]

Form: [Judul Form]

Total Pelanggaran: 3/3

Status: Sesi Dihentikan

Notifikasi harus disimpan di database dan tetap dapat dilihat meskipun pembuat form sedang offline atau membuka dashboard di kemudian hari.

Apabila sistem notifikasi real-time mengalami gangguan, kejadian yang berhasil diterima backend tetap harus tersimpan dan ditampilkan saat dashboard dimuat ulang.

Jangan mengandalkan notifikasi di frontend saja sebagai bukti bahwa pelanggaran telah tersimpan.

7. Mekanisme Pencatatan Pelanggaran

Buat sistem pencatatan pelanggaran yang terstruktur dan dapat diaudit.

Setiap catatan minimal memuat:

- ID pelanggaran unik.
- ID form.
- ID percobaan pengerjaan.
- ID peserta atau identitas peserta yang tersedia.
- Jenis pelanggaran.
- Waktu kejadian.
- Nomor pelanggaran.
- Status validasi kejadian.
- Status penanganan.
- Informasi tambahan yang relevan dan tidak berlebihan.

Simpan catatan secara permanen sesuai kebijakan retensi data aplikasi, sehingga tidak hilang saat peserta menyegarkan halaman, memutuskan koneksi, atau membuka ulang dashboard.

Cegah pelanggaran ganda akibat satu aksi yang menghasilkan beberapa event browser. Terapkan deduplikasi, aturan jeda yang wajar, dan validasi event sebelum menambah penghitung.

8. Sistem Pemblokiran Otomatis Setelah Tiga Pelanggaran

Ini merupakan aturan inti dan wajib diimplementasikan pada backend.

Ketika jumlah pelanggaran valid mencapai tiga:

1. Ubah status percobaan menjadi "blocked" atau status terminal setara.
2. Hentikan penerimaan jawaban baru dari percobaan tersebut.
3. Simpan jumlah pelanggaran akhir dan riwayat kejadian.
4. Tampilkan halaman atau dialog bahwa sesi telah dihentikan.
5. Kirimkan notifikasi kepada pembuat form.
6. Tolak permintaan melanjutkan pengerjaan dari percobaan yang sama.
7. Pastikan pemuatan ulang halaman tidak menghapus status pemblokiran.
8. Pastikan manipulasi penghitung pelanggaran melalui frontend tidak dapat menghindari aturan backend.

Pembatasan diterapkan pada percobaan pengerjaan yang bersangkutan dan harus konsisten dengan identitas atau mekanisme autentikasi yang benar-benar tersedia dalam aplikasi.

Jangan menjanjikan bahwa peserta pasti tidak dapat masuk kembali melalui akun lain, perangkat lain, atau identitas baru apabila aplikasi belum memiliki mekanisme identitas yang mampu mencegah hal tersebut.

Apabila jawaban telah disimpan sebelum sesi dihentikan, pertahankan data yang sah sesuai kebijakan form. Jangan menghapus seluruh jawaban secara otomatis tanpa aturan yang eksplisit dari pembuat form.

9. Ketahanan terhadap Manipulasi

Pastikan sistem tidak hanya mengandalkan pemeriksaan di sisi frontend.

Terapkan hal-hal berikut:

- Validasi status sesi pada backend.
- Validasi hak akses peserta dan pembuat form.
- Penyimpanan penghitung pelanggaran secara otoritatif di backend.
- Penolakan pengiriman jawaban setelah percobaan diblokir.
- Penanganan refresh, reconnect, dan duplikasi event.
- Pemulihan status sesi ketika koneksi kembali.
- Pengamanan endpoint pencatatan pelanggaran.
- Penggunaan waktu server sebagai acuan pencatatan apabila memungkinkan.
- Pencegahan perubahan langsung pada status atau penghitung melalui request klien yang tidak sah.

Jika peserta memutus koneksi, sistem tidak boleh langsung menganggapnya sebagai pelanggaran kecuali perilaku tersebut memang terdeteksi dan tercakup dalam aturan yang diumumkan sebelumnya. Catat gangguan koneksi secara terpisah bila diperlukan.

Jika backend tidak menerima event karena peserta offline atau perangkat terputus, jangan mengarang bahwa kejadian tersebut telah terdeteksi. Tangani statusnya berdasarkan data yang tersedia dan kemampuan implementasi.

10. Perlindungan terhadap Kesalahan Deteksi

Sistem harus meminimalkan false positive atau pelanggaran yang tercatat secara keliru.

Perhatikan kasus seperti:

- Peserta menggunakan perangkat seluler dengan perilaku perpindahan aplikasi yang berbeda.
- Notifikasi sistem operasi muncul.
- Peserta menerima panggilan.
- Browser menampilkan dialog izin.
- Perangkat mengalami lag atau gangguan koneksi.
- Event "blur", "visibilitychange", dan "fullscreenchange" terjadi secara berdekatan.

Jangan menghitung beberapa event dari satu kejadian sebagai beberapa pelanggaran jika semuanya merupakan akibat dari aktivitas yang sama.

Terapkan aturan validasi dan deduplikasi dengan pendekatan yang dapat dikonfigurasi. Dokumentasikan keterbatasan deteksi kepada pembuat form.

Berikan mekanisme peninjauan oleh pembuat form atau administrator apabila terdapat keberatan atas pemblokiran. Jika pembuat form diberi opsi membuka blokir, catat perubahan tersebut dalam audit log dan jangan menghapus riwayat pelanggaran aslinya.

11. Pengalaman Pengguna dan Antarmuka

Rancang antarmuka yang konsisten dengan desain Xean Digital Form saat ini.

Pastikan:

- Pengaturan keamanan mudah ditemukan saat membuat form.
- Peserta menerima penjelasan sebelum pengawasan dimulai.
- Peringatan terlihat jelas dan tidak membingungkan.
- Penghitung pelanggaran mudah dipahami.
- Dashboard pembuat form menampilkan aktivitas tanpa berlebihan.
- Tampilan tetap responsif pada desktop, tablet, dan perangkat seluler.
- Status pengerjaan dan pemblokiran dapat dibedakan dengan jelas.
- Peserta tidak terkena aturan keamanan dari form lain yang tidak mengaktifkan fitur tersebut.

Jangan merusak desain, komponen, sistem autentikasi, atau alur pengerjaan form yang sudah ada.

12. Integrasi dengan Arsitektur Proyek

Sebelum mengimplementasikan perubahan:

1. Audit struktur proyek dan identifikasi framework frontend serta backend yang digunakan.
2. Periksa sistem autentikasi, penyimpanan form, model peserta, mekanisme pengerjaan, dan database yang sudah ada.
3. Identifikasi halaman pembuatan form, halaman pengerjaan peserta, dashboard pembuat form, dan API terkait.
4. Gunakan arsitektur dan pola kode yang telah diterapkan dalam proyek.
5. Tambahkan perubahan skema database atau migrasi hanya jika diperlukan.
6. Integrasikan fitur melalui komponen dan layanan yang sesuai, tanpa membuat sistem paralel yang tidak dibutuhkan.
7. Jangan mengganti teknologi inti, merombak seluruh aplikasi, atau menghapus fungsionalitas lama tanpa alasan teknis yang jelas.

Jangan membuat implementasi dummy yang hanya menampilkan jumlah pelanggaran secara visual. Penghitungan, penyimpanan, notifikasi, dan pemblokiran harus benar-benar berfungsi.

13. Skenario Pengujian Wajib

Setelah implementasi, uji skenario berikut.

Skenario 1 — Fitur dinonaktifkan

Peserta mengerjakan form seperti biasa. Aktivitas yang diawasi oleh fitur ini tidak menyebabkan pemblokiran ketika Anti-Cheating Mode tidak diaktifkan.

Skenario 2 — Pelanggaran pertama

Peserta berpindah tab. Sistem mencatat satu pelanggaran valid, menampilkan peringatan 1/3, dan mengirimkan notifikasi kepada pembuat form.

Skenario 3 — Pelanggaran kedua

Peserta melakukan pelanggaran valid berikutnya. Sistem menaikkan penghitung menjadi 2/3 dan menampilkan peringatan terakhir.

Skenario 4 — Pelanggaran ketiga

Peserta melakukan pelanggaran valid ketiga. Backend mengubah status percobaan menjadi diblokir, menghentikan pengiriman jawaban baru, menampilkan pemberitahuan, dan mengirimkan notifikasi prioritas kepada pembuat form.

Skenario 5 — Refresh setelah diblokir

Peserta memuat ulang halaman. Sistem tetap menolak kelanjutan sesi yang sudah diblokir.

Skenario 6 — Event ganda

Satu aksi menghasilkan beberapa event browser. Sistem tidak menambah jumlah pelanggaran berkali-kali akibat satu kejadian yang sama.

Skenario 7 — Pembuat form offline

Pelanggaran tersimpan di database. Ketika pembuat form kembali membuka dashboard, riwayat dan status peserta tetap tersedia.

Skenario 8 — Manipulasi frontend

Peserta mencoba mengubah penghitung atau status sesi melalui developer tools maupun request klien. Backend tetap mempertahankan status dan aturan yang sah.

Skenario 9 — Perangkat seluler

Uji perpindahan aplikasi, notifikasi sistem, perubahan fokus, dan mode fullscreen pada browser seluler yang didukung. Pastikan perilaku yang tidak dapat dideteksi tidak dilaporkan sebagai fakta.

Skenario 10 — Pemulihan sesi

Uji refresh dan gangguan jaringan ketika sesi masih berlangsung. Pastikan status dan jumlah pelanggaran tidak hilang atau bertambah secara keliru.

14. Kriteria Keberhasilan

Fitur dinyatakan selesai apabila:

- Pembuat form dapat mengaktifkan dan menonaktifkan pengawasan.
- Sistem dapat mendeteksi dan mencatat jenis aktivitas yang memang didukung browser.
- Peserta menerima peringatan sesuai urutan 1/3, 2/3, dan 3/3.
- Pelanggaran valid tersimpan di backend dan database.
- Pembuat form memperoleh notifikasi serta riwayat pelanggaran.
- Peserta otomatis kehilangan akses ke percobaan setelah tiga pelanggaran valid.
- Status blokir tidak dapat dihapus hanya dengan refresh atau manipulasi frontend.
- Sistem tidak menghitung satu kejadian sebagai beberapa pelanggaran.
- Fitur berjalan pada perangkat dan browser yang didukung.
- Fitur tidak merusak fungsionalitas Xean Digital Form yang sudah ada.

15. Instruksi Pelaksanaan untuk AI Coding Agent

Lakukan audit proyek terlebih dahulu sebelum mengubah kode.

Kemudian implementasikan fitur secara end-to-end, mulai dari pengaturan pembuat form, pemantauan sisi peserta, validasi backend, pencatatan database, notifikasi real-time, hingga pemblokiran otomatis.

Prioritaskan keamanan, akurasi deteksi, konsistensi data, dan kompatibilitas dengan arsitektur yang sudah tersedia.

Jangan berhenti setelah membuat rancangan atau tampilan. Kerjakan perubahan pada file dan modul yang benar-benar diperlukan, jalankan pengujian yang tersedia, perbaiki error yang muncul, lalu laporkan:

- Fitur yang telah berhasil diimplementasikan.
- File atau modul yang diubah.
- Perubahan database atau migrasi yang dibuat.
- Skenario pengujian beserta hasilnya.
- Keterbatasan browser yang masih ada.
- Bagian yang belum selesai atau membutuhkan konfigurasi tambahan.

Catatan penting: Jangan mengklaim sistem dapat sepenuhnya mengunci browser atau mendeteksi semua AI, aplikasi eksternal, dan ekstensi. Buat perlindungan sekuat mungkin sesuai kemampuan web, dan pastikan seluruh pelanggaran serta pemblokiran yang berhasil dideteksi diproses secara konsisten oleh backend.