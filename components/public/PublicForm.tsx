"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { submitResponse, type QuizResult } from "@/app/actions/submit";
import { useBusyOverlay } from "@/components/ui/LoadingProvider";
import { firstErrorFieldId, pageIndexOf, splitPages } from "@/lib/forms/pages";
import { isInputType, parseSettings, resolveTimeLimit, resolveShuffle, type FormField, type FormSettings } from "@/lib/forms/schema";
import { DEFAULT_PROCTORING_SETTINGS } from "@/lib/forms/schema";
import { formatClock } from "@/lib/forms/time-limit";
import { shufflePages, optionsForDisplay } from "@/lib/forms/shuffle";
import { fieldStyleVars, labelSizeClass } from "@/lib/forms/theme";
import { OTHER, validateAnswers } from "@/lib/forms/validate";
import { MiniAudioPlayer } from "./MiniAudioPlayer";
import { playTactileSfx } from "@/lib/audio/engine";
import type { ThemePreset } from "@/lib/forms/schema";
import { GateCard } from "./GateCard";
import { FileUploadField } from "./FileUploadField";
import type { UploadedFile } from "@/lib/forms/files";
import { ShieldAlert, AlertTriangle, Maximize2, Clock } from "lucide-react";
import { initProctoringSession, recordProctoringViolation } from "@/app/actions/proctoring";

type Props = {
  slug: string;
  title: string;
  description: string;
  fields: FormField[];
  settings: FormSettings;
  themePreset?: ThemePreset | null;
};
type ChoiceAnswer = { optionId?: string; other?: string };
type MultiAnswer = { optionIds?: string[]; other?: string };
type Status = "idle" | "submitting" | "done" | "already" | "login" | "blocked";

const TEXT_INPUTS: Record<string, { type: string; inputMode?: "text" | "decimal" | "email" | "tel" | "url"; autoComplete?: string }> = {
  short_text: { type: "text" },
  email: { type: "email", inputMode: "email", autoComplete: "email" },
  phone: { type: "tel", inputMode: "tel", autoComplete: "tel" },
  url: { type: "url", inputMode: "url" },
  date: { type: "date" },
  time: { type: "time" },
  number: { type: "number", inputMode: "decimal" },
};

// Jarak: kartu soal berpadding lega; jarak antar kartu 24px (HP) / 32px (layar lebar)
const card = "nb-panel nb-panel-strong scroll-mt-24 p-5 sm:p-7";
const errRing = "outline-4 outline-solid outline-offset-2 outline-[color:var(--danger)]";
const choice = "flex min-h-11 cursor-pointer items-center gap-3";
const box = "h-5 w-5 shrink-0 accent-[#3457ff]";
const chip =
  "flex h-12 min-w-12 items-center justify-center border-2 border-line bg-surface px-2 font-display font-bold peer-checked:bg-accent peer-checked:text-[color:var(--on-accent)] peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-solid peer-focus-visible:outline-cobalt";
const groupCls = "m-0 min-w-0 border-0 p-0";

const prefersReduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Perangkat sentuh (HP/tablet): perangkat input utamanya jari, bukan mouse/trackpad. */
const isTouchDevice = () => typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;

/** Menggulir ke kartu soal lalu memberi fokus ke kontrolnya. */
function focusField(fid: string) {
  const cardEl = document.getElementById(`card-${fid}`);
  const el = document.getElementById(`q-${fid}`);
  (cardEl ?? el)?.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "center" });
  el?.focus({ preventScroll: true });
}

export function PublicForm({ slug, title, description, fields, settings: rawSettings, themePreset }: Props) {
  // Satu sumber kebenaran pengawasan: allowTabSwitch = false (versi lama) otomatis berarti proctoring aktif
  const settings = useMemo(() => parseSettings(rawSettings), [rawSettings]);
  const proctoring = settings.proctoring ?? DEFAULT_PROCTORING_SETTINGS;
  const isProctoring = Boolean(proctoring.enabled);
  const timeLimit = useMemo(() => resolveTimeLimit(settings), [settings]);
  const isTimeLimit = Boolean(timeLimit.enabled);
  const isProtectedExam = isProctoring || isTimeLimit;

  const [sessionKey, setSessionKey] = useState<string>("");
  const keyRef = useRef<string | null>(null);

  const shuffleOn = Boolean(settings.shuffle?.questions || settings.shuffle?.options);
  const orderReady = !shuffleOn || sessionKey !== "";

  // Pengacakan deterministik (seeded): urutan konsisten per peserta meski halaman di-refresh
  const shuffleSeed = useMemo(() => `${slug}:${sessionKey || "init"}`, [slug, sessionKey]);
  const rawPages = useMemo(() => splitPages(fields), [fields]);
  const pages = useMemo(() => {
    if (!settings.shuffle?.questions) return rawPages;
    return shufflePages(rawPages, shuffleSeed);
  }, [rawPages, shuffleSeed, settings.shuffle?.questions]);

  const [pageIdx, setPageIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState("");
  const [hp, setHp] = useState("");
  const [result, setResult] = useState<QuizResult | null>(null);
  const pendingFocus = useRef<string | null>(null);
  const firstRender = useRef(true);
  useBusyOverlay(status === "submitting");

  const isLast = pageIdx >= pages.length - 1;
  const current = pages[Math.min(pageIdx, pages.length - 1)];

  // Sesi ujian & pengawasan
  const [examStarted, setExamStarted] = useState(!isProtectedExam);
  const [vCount, setVCount] = useState(0);
  const [warningModal, setWarningModal] = useState<{
    show: boolean;
    count: number;
    max: number;
    title: string;
    message: string;
  } | null>(null);
  const [procError, setProcError] = useState("");
  const [starting, setStarting] = useState(false);
  const countRef = useRef(0);
  const lastAt = useRef(0);
  const okRef = useRef<HTMLButtonElement>(null);
  const answersRef = useRef<Record<string, unknown>>({});
  const autoSubmitRef = useRef(false);

  // Batas waktu pengerjaan (Countdown Timer)
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const [timeExpiredNotice, setTimeExpiredNotice] = useState(false);
  const timeExpiredRef = useRef(false);

  // Jawaban terbaru disimpan di ref agar bisa dikirim otomatis saat peserta didiskualifikasi / waktu habis
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Pengiriman otomatis saat batas waktu habis
  const submitTimeExpired = useCallback(async () => {
    if (timeExpiredRef.current || autoSubmitRef.current || !keyRef.current) return;
    timeExpiredRef.current = true;
    autoSubmitRef.current = true;
    setStatus("submitting");
    try {
      const res = await submitResponse(slug, {
        answers: answersRef.current,
        clientKey: keyRef.current,
        timeUp: true,
        website: hp,
      });
      if (res.ok) {
        if (settings.audio?.sfxEnabled) playTactileSfx("success");
        setResult(res.result ?? null);
      }
      setTimeExpiredNotice(true);
      setStatus("done");
    } catch (err) {
      console.error("time_limit_auto_submit_failed", err);
      setTimeExpiredNotice(true);
      setStatus("done");
    }
  }, [slug, hp, settings.audio?.sfxEnabled]);

  // Interval penghitung mundur real-time
  useEffect(() => {
    if (!isTimeLimit || !examStarted || status === "done" || status === "blocked") return;

    const tick = () => {
      if (deadlineRef.current === null) return;
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((deadlineRef.current - now) / 1000));
      setRemainingSeconds(diff);
      if (diff <= 0) {
        void submitTimeExpired();
      }
    };

    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [isTimeLimit, examStarted, status, submitTimeExpired]);

  // Inisialisasi session key peserta & verifikasi status awal dari server
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storageKey = `xean_session_${slug}`;
    let k = sessionStorage.getItem(storageKey);
    if (!k) {
      k = crypto.randomUUID();
      sessionStorage.setItem(storageKey, k);
    }
    keyRef.current = k;
    setSessionKey(k);

    if (isProtectedExam) {
      const startedKey = `xean_started_${slug}`;
      const alreadyStarted = sessionStorage.getItem(startedKey) === "true";
      if (alreadyStarted) setExamStarted(true);

      // Sesi yang gagal diverifikasi tidak boleh berjalan tanpa pengawasan (fail-closed).
      // Jika belum dimulai, startExam akan memverifikasi ulang dan menampilkan galatnya.
      const failClosed = (message: string) => {
        if (!alreadyStarted) return;
        sessionStorage.removeItem(startedKey);
        setExamStarted(false);
        setProcError(message);
      };

      initProctoringSession(slug, k, undefined, false)
        .then((res) => {
          if (!res.ok) {
            failClosed(res.error);
            return;
          }
          if (res.enabled) {
            if (res.isBlocked) {
              setStatus("blocked");
              setVCount(res.violationCount ?? res.maxViolations ?? 3);
            } else if (typeof res.violationCount === "number") {
              setVCount(res.violationCount);
              countRef.current = res.violationCount;
            }
            if (typeof res.remainingMs === "number") {
              deadlineRef.current = Date.now() + res.remainingMs;
              const s = Math.max(0, Math.ceil(res.remainingMs / 1000));
              setRemainingSeconds(s);
              if (res.remainingMs <= 0 && alreadyStarted) {
                void submitTimeExpired();
              }
            }
          }
        })
        .catch(() => failClosed("Koneksi ke server ujian bermasalah. Coba lagi."));
    }
  }, [slug, isProtectedExam, submitTimeExpired]);

  // Jika pemilik form mengaktifkan "kirim otomatis saat diskualifikasi", jawaban parsial dikirim sekali
  const submitDisqualified = useCallback(async () => {
    if (autoSubmitRef.current || !proctoring.autoSubmitOnDisqualify || !keyRef.current) return;
    autoSubmitRef.current = true;
    try {
      await submitResponse(slug, {
        answers: answersRef.current,
        clientKey: keyRef.current,
        disqualified: true,
      });
    } catch (err) {
      console.error("proctoring_auto_submit_failed", err);
    }
  }, [slug, proctoring.autoSubmitOnDisqualify]);

  // Melaporkan pelanggaran secara otoritatif ke backend dengan deduplikasi (cooldown 3 detik)
  const reportViolation = useCallback(
    async (type: string, description: string) => {
      if (!isProctoring || !examStarted || status === "done" || status === "blocked") return;
      const now = Date.now();
      if (now - lastAt.current < 3000) return; // Cooldown 3 detik: cegah event ganda dari 1 aksi fisik
      lastAt.current = now;

      const currentKey = keyRef.current || crypto.randomUUID();
      keyRef.current = currentKey;

      try {
        let res = await recordProctoringViolation(slug, currentKey, type, description);

        // Sesi belum terdaftar di server (mis. inisialisasi gagal): daftarkan ulang lalu coba sekali lagi
        if (!res.ok && !res.blocked) {
          const re = await initProctoringSession(slug, currentKey);
          if (re.ok && re.enabled && re.isBlocked) {
            setStatus("blocked");
            setWarningModal(null);
            void submitDisqualified();
            return;
          }
          if (re.ok && re.enabled) {
            res = await recordProctoringViolation(slug, currentKey, type, description);
          }
        }

        if (res.ok) {
          const c = res.violationCount;
          const max = res.maxViolations;
          countRef.current = c;
          setVCount(c);

          if (res.isBlocked) {
            setStatus("blocked");
            setWarningModal(null);
            void submitDisqualified();
          } else {
            const title =
              c === 1
                ? `PERINGATAN 1/${max} — AKTIVITAS TIDAK DIIZINKAN`
                : `PERINGATAN TERAKHIR ${c}/${max} — RISIKO PEMBLOKIRAN`;
            const msg =
              c === 1
                ? "Anda terdeteksi melakukan aktivitas yang melanggar aturan keamanan form, seperti berpindah tab atau meninggalkan mode pengerjaan. Harap kembali fokus pada form dan jangan mengulangi aktivitas tersebut. Pelanggaran berikutnya akan dicatat oleh sistem."
                : `Sistem telah mencatat dua pelanggaran selama pengerjaan Anda. Apabila terjadi satu pelanggaran valid lagi, sesi pengerjaan akan dihentikan secara otomatis dan Anda tidak dapat melanjutkan form menggunakan percobaan ini.`;

            setWarningModal({ show: true, count: c, max, title, message: msg });
          }
        } else if (res.blocked) {
          setStatus("blocked");
          setWarningModal(null);
          void submitDisqualified();
        } else {
          console.error("proctoring_client_report_failed", res.error);
        }
      } catch (err) {
        console.error("proctoring_client_report_failed", err);
      }
    },
    [isProctoring, examStarted, status, slug, submitDisqualified]
  );

  // Event listener pengawasan browser (Tab switch, window blur, fullscreen exit, navigasi, copy/paste)
  useEffect(() => {
    if (!isProctoring || !examStarted || status === "done" || status === "blocked") return;

    const touch = isTouchDevice();

    const onVisibility = () => {
      if (!document.hidden) return;
      // Di HP, berpindah aplikasi hanya terlihat lewat visibilitychange, jadi pengaturan "blur"
      // juga dipetakan ke sini agar pemilik form yang mengaktifkannya tetap terlindungi.
      if (proctoring.detectTabSwitch || (touch && proctoring.detectWindowBlur)) {
        void reportViolation("tab_switch", touch ? "Berpindah ke tab atau aplikasi lain" : "Berpindah ke tab browser lain");
      }
    };

    const onBlur = () => {
      if (!proctoring.detectWindowBlur) return;
      // Di perangkat sentuh, blur terpicu keyboard layar, bilah notifikasi, dan gestur sistem (false positive).
      if (touch) return;
      // Fokus pindah ke iframe di halaman ini (mis. pemutar tersemat), bukan keluar dari jendela.
      if (document.activeElement?.tagName === "IFRAME") return;
      void reportViolation("window_blur", "Jendela browser kehilangan fokus aktif");
    };

    const onFullscreenChange = () => {
      if (proctoring.requireFullscreen && proctoring.detectFullscreenExit) {
        if (!document.fullscreenElement) {
          void reportViolation("fullscreen_exit", "Keluar dari mode layar penuh (fullscreen)");
        }
      }
    };

    const preventClipboard = (e: Event) => {
      if (proctoring.restrictCopyPaste) {
        e.preventDefault();
      }
    };

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (proctoring.detectNavigation) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("beforeunload", onBeforeUnload);

    if (proctoring.restrictCopyPaste) {
      document.addEventListener("copy", preventClipboard);
      document.addEventListener("cut", preventClipboard);
      document.addEventListener("paste", preventClipboard);
      document.addEventListener("contextmenu", preventClipboard);
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("beforeunload", onBeforeUnload);

      if (proctoring.restrictCopyPaste) {
        document.removeEventListener("copy", preventClipboard);
        document.removeEventListener("cut", preventClipboard);
        document.removeEventListener("paste", preventClipboard);
        document.removeEventListener("contextmenu", preventClipboard);
      }
    };
  }, [isProctoring, examStarted, status, proctoring, reportViolation]);

  useEffect(() => {
    if (warningModal?.show) okRef.current?.focus();
  }, [warningModal]);

  const leaveFullscreen = () => {
    if (typeof document !== "undefined" && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
  };

  const startExam = async () => {
    if (starting) return;
    setStarting(true);
    setProcError("");
    try {
      // Fullscreen harus diminta langsung dari gestur klik, sebelum menunggu server
      if (proctoring.requireFullscreen && typeof document !== "undefined") {
        try {
          await document.documentElement.requestFullscreen();
        } catch {
          // Abaikan jika browser membatasi permintaan fullscreen
        }
      }
      const currentKey = keyRef.current || crypto.randomUUID();
      keyRef.current = currentKey;
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`xean_session_${slug}`, currentKey);
      }

      // Fail-closed: pengerjaan hanya dimulai jika sesi ujian terdaftar di server
      // begin = true mencap started_at SEKALI di server untuk batas waktu
      const res = await initProctoringSession(slug, currentKey, undefined, true);
      if (!res.ok) {
        leaveFullscreen();
        setProcError(res.error);
        return;
      }
      if (res.enabled && res.isBlocked) {
        leaveFullscreen();
        setVCount(res.violationCount ?? res.maxViolations ?? proctoring.maxViolations);
        setStatus("blocked");
        return;
      }
      if (res.enabled && typeof res.violationCount === "number") {
        countRef.current = res.violationCount;
        setVCount(res.violationCount);
      }
      if (typeof res.remainingMs === "number") {
        deadlineRef.current = Date.now() + res.remainingMs;
        setRemainingSeconds(Math.max(0, Math.ceil(res.remainingMs / 1000)));
      }
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`xean_started_${slug}`, "true");
      }
      setExamStarted(true);
    } catch {
      leaveFullscreen();
      setProcError("Koneksi bermasalah. Sesi ujian belum bisa dimulai, coba lagi.");
    } finally {
      setStarting(false);
    }
  };

  // Setelah pindah halaman: fokus ke soal bermasalah (jika ada), kalau tidak gulir ke atas
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const target = pendingFocus.current;
    pendingFocus.current = null;
    const raf = requestAnimationFrame(() => {
      if (target) focusField(target);
      else window.scrollTo({ top: 0, behavior: prefersReduced() ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [pageIdx]);

  const set = (id: string, value: unknown) => {
    if (settings.audio?.sfxEnabled) playTactileSfx("click");
    setAnswers((p) => ({ ...p, [id]: value }));
    setErrors((p) => {
      if (!p[id]) return p;
      const n = { ...p };
      delete n[id];
      return n;
    });
  };

  /** Tampilkan error dan arahkan ke soal pertama yang bermasalah (pindah halaman jika perlu). */
  function revealErrors(errs: Record<string, string>, scope: FormField[]) {
    setErrors(errs);
    const id = firstErrorFieldId(scope, errs);
    if (!id) return;
    const pi = pageIndexOf(pages, id);
    if (pi >= 0 && pi !== pageIdx) {
      pendingFocus.current = id;
      setPageIdx(pi);
    } else {
      requestAnimationFrame(() => focusField(id));
    }
  }

  function jumpTo(fid: string) {
    const pi = pageIndexOf(pages, fid);
    if (pi >= 0 && pi !== pageIdx) {
      pendingFocus.current = fid;
      setPageIdx(pi);
    } else {
      focusField(fid);
    }
  }

  function goNext() {
    const r = validateAnswers(current.fields, answers);
    if (!r.ok) {
      if (settings.audio?.sfxEnabled) playTactileSfx("warn");
      revealErrors(r.errors, current.fields);
      return;
    }
    if (settings.audio?.sfxEnabled) playTactileSfx("page");
    setErrors({});
    setPageIdx((i) => Math.min(i + 1, pages.length - 1));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return; // cegah kirim ganda
    setFormError("");
    if (!isLast) {
      goNext(); // Enter di halaman tengah = Lanjut, bukan kirim
      return;
    }

    // Semua halaman divalidasi ulang: soal wajib tidak boleh terlewat
    const check = validateAnswers(fields, answers);
    if (!check.ok) {
      revealErrors(check.errors, fields);
      return;
    }
    setErrors({});
    setStatus("submitting");
    if (!keyRef.current) keyRef.current = crypto.randomUUID(); // kunci tetap sama saat kirim ulang

    try {
      // Data pelanggaran tidak dikirim dari klien: server membacanya dari sesi dan log proctoring
      const res = await submitResponse(slug, {
        answers,
        clientKey: keyRef.current,
        website: hp,
      });
      if (res.ok) {
        if (settings.audio?.sfxEnabled) playTactileSfx("success");
        setResult(res.result ?? null);
        setStatus("done");
        return;
      }
      if (res.blocked) {
        setStatus("blocked");
        return;
      }
      if (res.alreadySubmitted) {
        setStatus("already");
        return;
      }
      if (res.needsLogin) {
        setStatus("login");
        return;
      }
      setStatus("idle");
      if (res.fieldErrors) {
        if (settings.audio?.sfxEnabled) playTactileSfx("warn");
        revealErrors(res.fieldErrors, fields);
      }
      if (res.error) setFormError(res.error);
    } catch {
      setStatus("idle");
      setFormError("Koneksi bermasalah. Jawabanmu belum terkirim. Coba kirim lagi, isianmu masih ada.");
    }
  }

  function again() {
    setAnswers({});
    setErrors({});
    setFormError("");
    setResult(null);
    setTimeExpiredNotice(false);
    setRemainingSeconds(null);
    deadlineRef.current = null;
    timeExpiredRef.current = false;
    autoSubmitRef.current = false;

    // Respons berikutnya memakai kunci sesi baru. Pada form ber-proctoring atau berbatas waktu,
    // peserta kembali ke briefing sehingga startExam mendaftarkan sesi baru di server sebelum pengerjaan dimulai.
    const nk = crypto.randomUUID();
    keyRef.current = nk;
    setSessionKey(nk);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`xean_session_${slug}`, nk);
      sessionStorage.removeItem(`xean_started_${slug}`);
    }
    countRef.current = 0;
    setVCount(0);
    setProcError("");
    setExamStarted(!isProtectedExam);
    setPageIdx(0);
    setStatus("idle");
  }

  if (status === "blocked") {
    return (
      <GateCard
        kind="blocked"
        slug={slug}
        title={title}
        violationCount={vCount}
        maxViolations={proctoring.maxViolations}
      />
    );
  }
  if (status === "already") return <GateCard kind="done" slug={slug} title={title} score={null} />;
  if (status === "login") return <GateCard kind="login" slug={slug} title={title} />;

  // Layar Briefing / Persetujuan Ujian sebelum pengerjaan dimulai
  if (isProtectedExam && !examStarted) {
    return (
      <div className="nb-panel nb-panel-strong nb-shadow space-y-6 p-6 sm:p-8">
        <div className="flex items-center gap-3 text-orange">
          {isProctoring ? (
            <ShieldAlert size={32} strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <Clock size={32} strokeWidth={2.5} className="text-cobalt" aria-hidden="true" />
          )}
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">
            {isProctoring ? "Pengawasan Ujian & Anti-Cheating" : "Ujian Berbatas Waktu"}
          </h1>
        </div>
        <div className={`border-l-4 ${isProctoring ? "border-orange" : "border-cobalt"} pl-4 space-y-2 text-ink`}>
          <p className="font-bold">Formulir &quot;{title}&quot; {isProctoring ? "mengaktifkan sistem pengawasan keamanan." : `memiliki batas waktu pengerjaan selama ${timeLimit.minutes} menit.`}</p>
          <p className="text-sm leading-relaxed text-ink/80">
            {isProctoring
              ? "Sistem memantau aktivitas pengerjaan Anda dan otomatis mendiskualifikasi sesi jika terdeteksi aktivitas kecurangan berulang."
              : `Waktu pengerjaan akan dihitung secara real-time dari server begitu Anda menekan tombol Mulai di bawah. Jika waktu mencapai 00:00, jawaban terakhir akan otomatis dikirim.`}
          </p>
        </div>

        <div className="nb-panel p-4 bg-paper/60 space-y-3">
          <p className="nb-mono text-xs uppercase tracking-wider font-bold">Aturan Selama Pengerjaan Ujian:</p>
          <ul className="space-y-2 text-sm text-ink">
            {isTimeLimit && (
              <li className="flex items-start gap-2">
                <span className="text-orange font-bold">•</span>
                <span><strong>Batas Waktu {timeLimit.minutes} Menit</strong>: Waktu mulai berjalan begitu tombol Mulai ditekan. Memuat ulang (refresh) halaman tidak me-reset waktu. Saat waktu habis, jawaban otomatis dikirimkan.</span>
              </li>
            )}
            {isProctoring && proctoring.detectTabSwitch && (
              <li className="flex items-start gap-2">
                <span className="text-orange font-bold">•</span>
                <span><strong>Dilarang berpindah tab browser</strong>: Meninggalkan tab ujian akan dicatat sebagai pelanggaran.</span>
              </li>
            )}
            {isProctoring && proctoring.detectWindowBlur && (
              <li className="flex items-start gap-2">
                <span className="text-orange font-bold">•</span>
                <span><strong>Fokus jendela penuh</strong>: Dilarang beralih ke aplikasi lain (Alt-Tab atau meminimalkan jendela).</span>
              </li>
            )}
            {isProctoring && proctoring.requireFullscreen && (
              <li className="flex items-start gap-2">
                <span className="text-orange font-bold">•</span>
                <span><strong>Mode layar penuh wajib</strong>: Menekan tombol Esc atau keluar dari fullscreen akan dicatat.</span>
              </li>
            )}
            {isProctoring && proctoring.restrictCopyPaste && (
              <li className="flex items-start gap-2">
                <span className="text-orange font-bold">•</span>
                <span><strong>Salin-tempel dibatasi</strong>: Aksi copy, paste, dan klik kanan dinonaktifkan di area pengerjaan.</span>
              </li>
            )}
            {isProctoring && (
              <li className="flex items-start gap-2 pt-2 border-t border-line/30">
                <span className="text-[#c62f00] font-bold">⚠</span>
                <span className="font-bold text-[#c62f00]">
                  Batas Pelanggaran: Maksimal {proctoring.maxViolations} kali pelanggaran valid sebelum akses Anda diblokir otomatis.
                </span>
              </li>
            )}
          </ul>
        </div>

        {procError && (
          <div role="alert" className="nb-panel border-[3px] bg-orange p-4 font-bold text-ink">{procError}</div>
        )}

        <div className="pt-2">
          <button
            type="button"
            onClick={startExam}
            disabled={starting}
            className="nb-btn nb-btn-lg w-full flex items-center justify-center gap-2"
          >
            {starting ? (
              <>Memverifikasi sesi…</>
            ) : isProctoring && proctoring.requireFullscreen ? (
              <>
                <Maximize2 size={18} aria-hidden="true" /> Masuk Layar Penuh & Mulai Ujian
              </>
            ) : (
              <>Saya Mengerti & Mulai Pengerjaan →</>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (status === "done") {
    return (
      <>
        <div className="nb-panel nb-panel-strong nb-shadow bg-accent p-6 text-[color:var(--on-accent)] sm:p-8" role="status">
          <p className="nb-mono mb-3">{timeExpiredNotice ? "Waktu Habis" : "Terkirim"}</p>
          <h1 className="font-display text-4xl font-bold">{timeExpiredNotice ? "Waktu Ujian Berakhir" : "Terima kasih!"}</h1>
          <p className="mt-5 leading-relaxed">
            {timeExpiredNotice
              ? `Batas waktu pengerjaan untuk "${title}" telah habis. Jawaban yang sempat Anda isi sudah tersimpan otomatis di server.`
              : `Jawabanmu untuk "${title}" sudah tersimpan.`}
          </p>
          {result && result.total > 0 && (
            <p className="mt-8 border-t-[3px] border-current pt-6 font-display text-4xl font-bold">
              Benar {result.correct} dari {result.total} soal
            </p>
          )}
          {!settings.oneResponsePerAccount && (
            <button type="button" onClick={again} className="nb-btn nb-btn-ink mt-8">Kirim respons lain</button>
          )}
        </div>
        {settings.audio?.enabled && (
          <MiniAudioPlayer
            audioSettings={settings.audio}
            themePreset={themePreset}
            formSubmitted={true}
          />
        )}
      </>
    );
  }

  if (!orderReady) return <div className="nb-panel nb-panel-strong p-6" role="status" aria-busy="true">Menyiapkan formulir…</div>;

  const reqMark = (f: FormField) =>
    f.required ? (
      <>
        <span aria-hidden="true"> *</span>
        <span className="sr-only"> (wajib)</span>
      </>
    ) : null;

  const errorFields = fields.filter((f) => isInputType(f.type) && errors[f.id]);

  function renderField(f: FormField) {
    const styleVars = fieldStyleVars(f.style);
    if (f.type === "divider") return <hr key={f.id} className="my-1 border-t-[3px] border-line sm:my-2" />;
    if (f.type === "section") {
      return (
        <div key={f.id} className={`px-1 pt-4 sm:pt-6 ${f.style?.bg ? "nb-panel p-5" : ""}`} style={styleVars}>
          <h2 className="font-display text-3xl font-bold">{f.label}</h2>
          {f.description && <p className="mt-3 leading-relaxed">{f.description}</p>}
        </div>
      );
    }
    if (f.type === "paragraph") {
      return (
        <p key={f.id} className={`whitespace-pre-wrap px-1 leading-relaxed ${f.style?.bg ? "nb-panel p-5" : ""}`} style={styleVars}>
          {f.label}
        </p>
      );
    }

    const id = `q-${f.id}`;
    const err = errors[f.id];
    const describedBy = [f.description ? `${id}-desc` : null, err ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
    const invalid = err ? true : undefined;
    const lblCls = `mb-3 block font-display font-bold ${labelSizeClass(f.style?.labelSize)}`;
    const wrap = (content: React.ReactNode) => (
      <div key={f.id} id={`card-${f.id}`} className={`${card} ${err ? errRing : ""}`} style={styleVars}>
        {content}
      </div>
    );
    const desc = f.description ? <p id={`${id}-desc`} className="-mt-1 mb-4 text-sm leading-relaxed">{f.description}</p> : null;
    const errEl = err ? (
      <p id={`${id}-error`} role="alert" className="mt-4 flex items-start gap-2 font-bold text-[color:var(--danger)]">
        <span aria-hidden="true">⚠</span>
        <span>{err}</span>
      </p>
    ) : null;

    if (f.type === "radio") {
      const v = (answers[f.id] as ChoiceAnswer | undefined) ?? {};
      const displayOpts = optionsForDisplay(f, shuffleSeed, Boolean(settings.shuffle?.options));
      return wrap(
        <fieldset id={id} tabIndex={-1} aria-describedby={describedBy} aria-invalid={invalid} className={groupCls}>
          <legend className={`${lblCls} p-0`}>{f.label}{reqMark(f)}</legend>
          {desc}
          <div className="space-y-1">
            {displayOpts.map((o) => (
              <label key={o.id} className={choice}>
                <input type="radio" name={f.id} className={box} checked={v.optionId === o.id} onChange={() => set(f.id, { ...v, optionId: o.id })} />
                {o.label}
              </label>
            ))}
            {f.allowOther && (
              <div className="flex flex-wrap items-center gap-3">
                <label className={choice}>
                  <input type="radio" name={f.id} className={box} checked={v.optionId === OTHER} onChange={() => set(f.id, { ...v, optionId: OTHER })} />
                  Lainnya
                </label>
                {v.optionId === OTHER && (
                  <input aria-label="Jawaban lainnya" className="nb-input max-w-xs" maxLength={500} value={v.other ?? ""} onChange={(e) => set(f.id, { ...v, other: e.target.value })} />
                )}
              </div>
            )}
          </div>
          {errEl}
        </fieldset>,
      );
    }

    if (f.type === "checkbox") {
      const v = (answers[f.id] as MultiAnswer | undefined) ?? {};
      const ids = v.optionIds ?? [];
      const toggle = (oid: string, on: boolean) => set(f.id, { ...v, optionIds: on ? [...ids, oid] : ids.filter((x) => x !== oid) });
      const displayOpts = optionsForDisplay(f, shuffleSeed, Boolean(settings.shuffle?.options));
      return wrap(
        <fieldset id={id} tabIndex={-1} aria-describedby={describedBy} aria-invalid={invalid} className={groupCls}>
          <legend className={`${lblCls} p-0`}>{f.label}{reqMark(f)}</legend>
          {desc}
          <div className="space-y-1">
            {displayOpts.map((o) => (
              <label key={o.id} className={choice}>
                <input type="checkbox" className={box} checked={ids.includes(o.id)} onChange={(e) => toggle(o.id, e.target.checked)} />
                {o.label}
              </label>
            ))}
            {f.allowOther && (
              <div className="flex flex-wrap items-center gap-3">
                <label className={choice}>
                  <input type="checkbox" className={box} checked={ids.includes(OTHER)} onChange={(e) => toggle(OTHER, e.target.checked)} />
                  Lainnya
                </label>
                {ids.includes(OTHER) && (
                  <input aria-label="Jawaban lainnya" className="nb-input max-w-xs" maxLength={500} value={v.other ?? ""} onChange={(e) => set(f.id, { ...v, other: e.target.value })} />
                )}
              </div>
            )}
          </div>
          {errEl}
        </fieldset>,
      );
    }

    if (f.type === "linear_scale") {
      const s = f.scale ?? { min: 1, max: 5 };
      const cur = answers[f.id] as number | undefined;
      const nums = Array.from({ length: s.max - s.min + 1 }, (_, i) => s.min + i);
      return wrap(
        <fieldset id={id} tabIndex={-1} aria-describedby={describedBy} aria-invalid={invalid} className={groupCls}>
          <legend className={`${lblCls} p-0`}>{f.label}{reqMark(f)}</legend>
          {desc}
          <div className="flex flex-wrap gap-2">
            {nums.map((n) => (
              <div key={n} className="relative">
                <input type="radio" id={`${id}-${n}`} name={f.id} className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0" checked={cur === n} onChange={() => set(f.id, n)} />
                <label htmlFor={`${id}-${n}`} className={chip}>{n}</label>
              </div>
            ))}
          </div>
          {(s.minLabel || s.maxLabel) && (
            <p className="nb-mono mt-3 flex justify-between gap-4"><span>{s.minLabel}</span><span>{s.maxLabel}</span></p>
          )}
          {errEl}
        </fieldset>,
      );
    }

    if (f.type === "rating") {
      const max = f.ratingMax ?? 5;
      const cur = answers[f.id] as number | undefined;
      return wrap(
        <fieldset id={id} tabIndex={-1} aria-describedby={describedBy} aria-invalid={invalid} className={groupCls}>
          <legend className={`${lblCls} p-0`}>{f.label}{reqMark(f)}</legend>
          {desc}
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
              <div key={n} className="relative">
                <input type="radio" id={`${id}-${n}`} name={f.id} className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0" checked={cur === n} onChange={() => set(f.id, n)} />
                <label
                  htmlFor={`${id}-${n}`}
                  aria-label={`${n} bintang`}
                  className="flex h-12 w-10 items-center justify-center text-4xl leading-none peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-solid peer-focus-visible:outline-cobalt"
                >
                  {cur !== undefined && n <= cur ? "★" : "☆"}
                </label>
              </div>
            ))}
          </div>
          {errEl}
        </fieldset>,
      );
    }

    if (f.type === "consent") {
      return wrap(
        <>
          <label className="flex cursor-pointer items-start gap-3">
            <input id={id} type="checkbox" className={`${box} mt-1`} aria-describedby={describedBy} aria-invalid={invalid} checked={answers[f.id] === true} onChange={(e) => set(f.id, e.target.checked)} />
            <span>{f.label}{reqMark(f)}</span>
          </label>
          {errEl}
        </>,
      );
    }

    if (f.type === "file") {
      const fileVal = Array.isArray(answers[f.id]) ? (answers[f.id] as UploadedFile[]) : [];
      return wrap(
        <div id={id} tabIndex={-1}>
          <p className={lblCls}>{f.label}{reqMark(f)}</p>
          {desc}
          <FileUploadField
            field={f}
            slug={slug}
            value={fileVal}
            onChange={(files) => set(f.id, files)}
            error={err}
            disabled={status === "submitting"}
          />
          {errEl}
        </div>,
      );
    }

    // ----- kolom satu input -----
    const label = <label htmlFor={id} className={lblCls}>{f.label}{reqMark(f)}</label>;
    const common = { id, name: f.id, "aria-describedby": describedBy, "aria-invalid": invalid };
    const value = typeof answers[f.id] === "string" ? (answers[f.id] as string) : "";

    if (f.type === "long_text") {
      return wrap(
        <>
          {label}{desc}
          <textarea {...common} rows={4} className="nb-input" placeholder={f.placeholder} maxLength={f.maxLength ?? 10000} value={value} onChange={(e) => set(f.id, e.target.value)} />
          {errEl}
        </>,
      );
    }
    if (f.type === "dropdown") {
      const cur = (answers[f.id] as ChoiceAnswer | undefined)?.optionId ?? "";
      const displayOpts = optionsForDisplay(f, shuffleSeed, Boolean(settings.shuffle?.options));
      return wrap(
        <>
          {label}{desc}
          <select {...common} className="nb-input" value={cur} onChange={(e) => set(f.id, { optionId: e.target.value })}>
            <option value="">Pilih salah satu…</option>
            {displayOpts.map((o) => (<option key={o.id} value={o.id}>{o.label}</option>))}
          </select>
          {errEl}
        </>,
      );
    }

    const t = TEXT_INPUTS[f.type] ?? TEXT_INPUTS.short_text;
    return wrap(
      <>
        {label}{desc}
        <input
          {...common}
          type={t.type}
          inputMode={t.inputMode}
          autoComplete={t.autoComplete}
          step={f.type === "number" ? "any" : undefined}
          className="nb-input"
          placeholder={f.placeholder}
          maxLength={f.type === "short_text" ? (f.maxLength ?? 1000) : undefined}
          value={value}
          onChange={(e) => set(f.id, e.target.value)}
        />
        {errEl}
      </>,
    );
  }

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6 sm:gap-8">
        {isTimeLimit && examStarted && remainingSeconds !== null && (
          <div
            className={`sticky top-3 z-30 flex items-center justify-between gap-3 border-[3px] border-line px-4 py-3 font-bold shadow-[3px_3px_0px_#000] ${
              remainingSeconds <= 60
                ? "bg-red-500 text-white animate-pulse"
                : remainingSeconds <= 300
                  ? "bg-amber-300 text-ink"
                  : "bg-surface text-ink"
            }`}
            role="timer"
            aria-live="polite"
          >
            <div className="flex items-center gap-2">
              <Clock size={20} className="shrink-0" aria-hidden="true" />
              <span className="nb-mono text-xs uppercase tracking-wider font-extrabold">
                {remainingSeconds <= 60 ? "WAKTU HAMPIR HABIS" : "SISA WAKTU"}
              </span>
            </div>
            <span className="nb-mono text-2xl font-extrabold tracking-widest">
              {formatClock(remainingSeconds)}
            </span>
          </div>
        )}

        {pageIdx === 0 ? (
          <header className="nb-panel nb-panel-strong nb-shadow p-6 sm:p-8">
            {settings.quiz && <p className="nb-mono mb-3">Kuis</p>}
            <h1 className="break-words font-display text-4xl font-bold sm:text-5xl">{title}</h1>
            {description && <p className="mt-5 whitespace-pre-wrap text-lg leading-relaxed">{description}</p>}
            <p className="nb-mono mt-6">* wajib diisi</p>
          </header>
        ) : (
          <header className="nb-panel nb-panel-strong nb-shadow p-6 sm:p-8">
            <p className="nb-mono mb-2">{title}</p>
            <h1 className="break-words font-display text-3xl font-bold sm:text-4xl">{current.title || `Halaman ${pageIdx + 1}`}</h1>
            {current.description && <p className="mt-4 whitespace-pre-wrap leading-relaxed">{current.description}</p>}
          </header>
        )}

        {pages.length > 1 && (
          <div className="nb-panel p-4" role="group" aria-label="Kemajuan halaman">
            <div className="flex items-center justify-between gap-3">
              <p className="nb-mono">Halaman {pageIdx + 1} dari {pages.length}</p>
              <p className="nb-mono">{Math.round(((pageIdx + 1) / pages.length) * 100)}%</p>
            </div>
            <div
              className="mt-3 h-3 border-2 border-line bg-surface"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={pages.length}
              aria-valuenow={pageIdx + 1}
              aria-label={`Halaman ${pageIdx + 1} dari ${pages.length}`}
            >
              <div className="h-full bg-accent" style={{ width: `${((pageIdx + 1) / pages.length) * 100}%` }} />
            </div>
          </div>
        )}

        {isProctoring && (
          <div role="note" className="nb-panel border-[3px] bg-lavender p-5 text-ink">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="text-orange shrink-0" size={20} aria-hidden="true" />
                <p className="font-display font-bold">Pengawasan Anti-Cheating & Tab Lock Aktif</p>
              </div>
              <span className="nb-mono text-xs border-2 border-line px-2 py-0.5 bg-surface font-bold">
                Pelanggaran: {vCount}/{proctoring.maxViolations}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink/90">
              {`Tetap fokus pada form ini. Berpindah tab, meminimalkan jendela, atau keluar dari fullscreen akan dicatat. Melebihi ${proctoring.maxViolations} kali pelanggaran akan otomatis memblokir sesi Anda.`}
            </p>
          </div>
        )}

        {errorFields.length > 0 && (
          <div role="alert" id="error-summary" className={`nb-panel border-[3px] p-5 ${errRing}`}>
            <p className="font-display text-lg font-bold text-[color:var(--danger)]">
              ⚠ Ada {errorFields.length} pertanyaan yang perlu diperbaiki
            </p>
            <ul className="mt-3 space-y-2">
              {errorFields.map((f) => (
                <li key={f.id}>
                  <button type="button" onClick={() => jumpTo(f.id)} className="text-left underline underline-offset-4">
                    {f.label || "(tanpa judul)"}
                  </button>
                  <span className="block text-sm">{errors[f.id]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Honeypot: tersembunyi dari manusia dan screen reader */}
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label>Website<input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></label>
        </div>

        {current.fields.map(renderField)}

        {formError && (
          <div role="alert" className="nb-panel border-[3px] bg-orange p-5 font-bold text-ink">{formError}</div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {pageIdx > 0 && (
            <button type="button" onClick={() => setPageIdx((i) => Math.max(0, i - 1))} className="nb-btn nb-btn-ghost">← Kembali</button>
          )}
          <button type="submit" className="nb-btn" disabled={status === "submitting"}>
            {status === "submitting" ? "Mengirim…" : isLast ? "Kirim" : "Lanjut →"}
          </button>
        </div>
      </form>

      {settings.audio?.enabled && (
        <MiniAudioPlayer
          audioSettings={settings.audio}
          themePreset={themePreset}
          formSubmitted={false}
        />
      )}

      {warningModal?.show && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="warn-title"
          aria-describedby="warn-desc"
        >
          <div className="nb-panel nb-panel-strong nb-shadow w-full max-w-lg bg-orange p-6 text-ink border-4 border-ink">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={24} className="shrink-0 text-ink" aria-hidden="true" />
              <span className="nb-mono text-xs uppercase tracking-wider font-bold">
                Pemberitahuan Sistem Keamanan
              </span>
            </div>
            <h2 id="warn-title" className="font-display text-2xl sm:text-3xl font-bold leading-tight">
              {warningModal.title}
            </h2>
            <p id="warn-desc" className="mt-4 leading-relaxed font-medium">
              {warningModal.message}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-line/40 pt-4">
              <span className="nb-mono font-bold text-sm">
                Pelanggaran: {warningModal.count} dari {warningModal.max}
              </span>
              <button
                ref={okRef}
                type="button"
                onClick={() => setWarningModal(null)}
                className="nb-btn nb-btn-ink"
              >
                Mengerti, Kembali ke Form
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
