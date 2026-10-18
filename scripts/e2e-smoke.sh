#!/usr/bin/env bash
# Uji asap tanpa backend Supabase sungguhan: build -> start -> curl. Jalankan dari akar proyek setelah `next build`.
# Backend sengaja tidak terjangkau (127.0.0.1:9), jadi ini juga menguji perilaku saat layanan autentikasi down.
set -u
B=http://localhost:3111; FAIL=0
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy SUPABASE_SERVICE_ROLE_KEY=dummy NEXT_TELEMETRY_DISABLED=1
npx next start -p 3111 >/tmp/next-smoke.log 2>&1 & PID=$!
trap 'kill $PID 2>/dev/null' EXIT
for i in $(seq 1 40); do curl -s -o /dev/null $B/ && break; sleep 1; done
ok(){ if [ "$2" = 0 ]; then echo "  LULUS  $1"; else echo "  GAGAL  $1"; FAIL=1; fi; }
has(){ curl -s "$B$1" | grep -q -- "$2"; ok "$3" $?; }
hasnt(){ curl -s "$B$1" | grep -q -- "$2"; [ $? -ne 0 ]; ok "$3" $?; }
hdr(){ curl -sI "$B$1" | grep -qi -- "$2"; ok "$3" $?; }
nohdr(){ curl -sI "$B$1" | grep -qi -- "$2"; [ $? -ne 0 ]; ok "$3" $?; }
status(){ c=$(curl -s -o /dev/null -w '%{http_code}' "$B$1"); [ "$c" = "$2" ]; ok "$1 -> HTTP $c" $?; }
redir(){ r=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "$B$1"); [ "$r" = "$2" ]; ok "$1 -> $r" $?; }

echo "[background]"
has / 'data-bg-motion' "skrip init ada di <head>"
has / 'class="xf-bg"' "lapisan .xf-bg dirender"
has / 'Animasi latar' "tombol mode ada (landing)"
has /masuk 'Animasi latar' "tombol mode ada (auth)"
echo "[halaman auth]"
for p in /masuk /daftar /cek-email /lupa-password; do c=$(curl -s -o /dev/null -w '%{http_code}' $B$p); [ "$c" = 200 ]; ok "GET $p -> $c" $?; done
has "/masuk?error=kedaluwarsa" kedaluwarsa "pesan tautan kedaluwarsa"
has "/masuk?error=kode" 'browser atau perangkat' "pesan lintas-perangkat"
has "/masuk?error=layanan" bermasalah "pesan layanan down"
has /cek-email 'Kirim Ulang Email Konfirmasi' "tombol kirim ulang"
has /cek-email 'Email yang didaftarkan' "tanpa cookie: minta email"
has /cek-email -i spam "petunjuk folder spam"
has "/cek-email?error=kedaluwarsa" kedaluwarsa "pesan kedaluwarsa"
echo "[halaman sukses tidak boleh berbohong]"
has /auth/terverifikasi 'Belum terverifikasi' "tanpa sesi: tampil 'Belum terverifikasi'"
hasnt /auth/terverifikasi 'Email terverifikasi' "tanpa sesi: tidak ada klaim sukses (isi maupun judul tab)"
echo "[proteksi rute]"
redir /dashboard "307 $B/masuk?next=%2Fdashboard"
redir /dashboard/akun "307 $B/masuk?next=%2Fdashboard%2Fakun"
redir /dashboard/notifications "307 $B/masuk?next=%2Fdashboard%2Fnotifications"
redir /dashboard/forms/x/export "307 $B/masuk?next=%2Fdashboard%2Fforms%2Fx%2Fexport"
echo "[callback]"
redir "/auth/callback?error_code=otp_expired&flow=signup" "307 $B/cek-email?error=kedaluwarsa"
redir "/auth/callback?error_code=otp_expired&flow=recovery" "307 $B/lupa-password?error=kedaluwarsa"
redir "/auth/callback" "307 $B/masuk?error=tautan"
redir "/auth/callback?token_hash=x&type=hack" "307 $B/masuk?error=tautan"
r=$(curl -s -o /dev/null -w '%{redirect_url}' "$B/auth/callback?code=abc&flow=signup&next=//evil.com"); case "$r" in $B/*) ok "next=//evil.com tidak keluar domain ($r)" 0;; *) ok "open redirect! $r" 1;; esac
echo "[metadata pratinjau tautan]"
has / 'property="og:title"' "og:title ada"
has / 'property="og:image"' "og:image ada"
has / 'og.png' "og:image menunjuk /og.png"
has / 'name="twitter:card" content="summary_large_image"' "twitter:card = summary_large_image"
has / 'property="og:site_name"' "og:site_name ada"
r=$(curl -s -o /dev/null -w '%{http_code} %{content_type}' "$B/og.png"); [ "$r" = "200 image/png" ]; ok "/og.png -> $r" $?
echo "[404 bermerek]"
status /halaman-acak 404
has /halaman-acak 'Halaman tidak ketemu' "404 global memakai halaman kustom"
has /halaman-acak 'Kembali ke beranda' "404 punya tombol kembali"
# backend sengaja mati: form publik harus gagal sebagai error sementara (500 + halaman bermerek), BUKAN 404 palsu "form tidak ada"
status /f/slug-salah 500
echo "[header keamanan]"
hdr / 'x-frame-options: SAMEORIGIN' "/ : X-Frame-Options SAMEORIGIN"
hdr / 'x-content-type-options: nosniff' "/ : nosniff"
hdr / 'strict-transport-security: max-age=63072000' "/ : HSTS"
hdr / 'referrer-policy: strict-origin-when-cross-origin' "/ : Referrer-Policy"
hdr / 'permissions-policy: camera=()' "/ : Permissions-Policy"
hdr / "frame-ancestors 'self'" "/ : CSP frame-ancestors"
hdr /dashboard 'x-frame-options: SAMEORIGIN' "/dashboard (redirect) juga dibingkai-aman"
hdr /masuk 'x-frame-options: SAMEORIGIN' "/masuk tidak boleh dibingkai situs lain"
nohdr /f/slug-salah 'x-frame-options' "/f/... tetap boleh disematkan (tanpa X-Frame-Options)"
nohdr /f/slug-salah 'frame-ancestors' "/f/... tanpa frame-ancestors"
hdr /f/slug-salah 'x-content-type-options: nosniff' "/f/... tetap nosniff"
nohdr / 'x-powered-by' "tidak membocorkan X-Powered-By"
echo; [ $FAIL = 0 ] && echo "SEMUA LULUS" || echo "ADA YANG GAGAL"; exit $FAIL
