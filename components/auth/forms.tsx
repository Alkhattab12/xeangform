"use client";

import { useActionState, useState, useEffect } from "react";
import Link from "next/link";
import { Mail, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw } from "lucide-react";
import { AuthField } from "./AuthField";
import { SubmitButton } from "./SubmitButton";
import {
  forgotPassword,
  resetPassword,
  signIn,
  signUp,
  resendConfirmationEmail,
  type AuthState,
} from "@/app/actions/auth";

export function ResendVerificationCard({ defaultEmail }: { defaultEmail?: string }) {
  const [resendState, resendAction, isPending] = useActionState<AuthState, FormData>(
    resendConfirmationEmail,
    null
  );
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (resendState?.message) {
      setCooldown(60);
    }
  }, [resendState]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  return (
    <div className="nb-panel border-[3px] bg-paper p-5 mt-4 space-y-4">
      <div className="flex items-start gap-3">
        <Mail className="h-6 w-6 text-cobalt shrink-0 mt-0.5" />
        <div>
          <h2 className="font-display font-bold text-base">Kirim Ulang Email Konfirmasi</h2>
          <p className="text-sm text-ink/80 mt-1">
            Belum menerima tautan atau tautan sudah kedaluwarsa? Masukkan email kamu untuk menerima tautan baru.
          </p>
        </div>
      </div>

      {resendState?.error && (
        <div role="alert" className="nb-panel border-[2px] bg-orange p-3 font-bold text-sm text-ink">
          {resendState.error}
        </div>
      )}

      {resendState?.message && (
        <div role="status" className="nb-panel border-[2px] bg-lime p-3 font-bold text-sm text-ink">
          {resendState.message}
        </div>
      )}

      <form action={resendAction} className="space-y-3">
        <input
          type="email"
          name="email"
          defaultValue={defaultEmail || resendState?.values?.email || ""}
          required
          placeholder="nama@email.com"
          className="nb-input text-sm"
          aria-label="Email untuk kirim ulang konfirmasi"
        />
        <button
          type="submit"
          disabled={isPending || cooldown > 0}
          className="nb-btn nb-btn-ghost w-full text-sm font-bold flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Mengirim ulang…</span>
            </>
          ) : cooldown > 0 ? (
            <span>Kirim ulang dalam {cooldown}s</span>
          ) : (
            <>
              <Mail className="h-4 w-4" />
              <span>Kirim Ulang Tautan Konfirmasi</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function Banner({
  state,
  extraError,
  verified,
}: {
  state: AuthState;
  extraError?: string;
  verified?: boolean;
}) {
  const error = state?.error ?? extraError;
  return (
    <>
      {verified && (
        <div role="status" className="nb-panel border-[3px] bg-lime p-4 font-bold text-ink flex items-center gap-2.5">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>Email berhasil dikonfirmasi! Silakan masuk ke akun kamu.</span>
        </div>
      )}
      {error && (
        <div role="alert" className="nb-panel border-[3px] bg-orange p-4 font-bold text-ink flex items-start gap-2.5">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}
      {state?.message && !verified && (
        <div role="status" className="nb-panel border-[3px] bg-accent p-4 font-bold text-ink">
          {state.message}
        </div>
      )}
    </>
  );
}

export function LoginForm({
  next,
  errorCode,
  verified,
  initialEmail,
}: {
  next?: string;
  errorCode?: string;
  verified?: boolean;
  initialEmail?: string;
}) {
  const [state, action] = useActionState<AuthState, FormData>(signIn, null);
  const fe = state?.fieldErrors ?? {};

  let extraError: string | undefined;
  if (errorCode === "tautan_kedaluwarsa") {
    extraError = "Tautan konfirmasi tidak valid atau sudah kedaluwarsa. Silakan minta pengiriman ulang tautan konfirmasi.";
  } else if (errorCode === "tautan_tidak_valid" || errorCode === "tautan") {
    extraError = "Tautan verifikasi tidak valid. Silakan periksa kembali tautan yang kamu terima.";
  } else if (errorCode === "email_belum_dikonfirmasi") {
    extraError = "Email belum dikonfirmasi. Harap verifikasi email kamu sebelum mengakses dashboard.";
  }

  const showResend =
    state?.unconfirmed ||
    errorCode === "tautan_kedaluwarsa" ||
    errorCode === "email_belum_dikonfirmasi";

  return (
    <div className="space-y-6">
      <Banner state={state} extraError={extraError} verified={verified} />

      <form action={action} noValidate className="space-y-6">
        {next && <input type="hidden" name="next" value={next} />}
        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          defaultValue={state?.values?.email || initialEmail}
          error={fe.email}
          required
        />
        <AuthField
          id="password"
          label="Kata sandi"
          type="password"
          autoComplete="current-password"
          error={fe.password}
          required
        />
        <SubmitButton pendingLabel="Memproses…">Masuk</SubmitButton>
      </form>

      {showResend && (
        <ResendVerificationCard
          defaultEmail={state?.values?.email || initialEmail || ""}
        />
      )}
    </div>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signUp, null);
  const fe = state?.fieldErrors ?? {};

  // Jika pendaftaran berhasil dan menunggu konfirmasi email
  if (state?.registeredSuccess && state.values?.email) {
    return (
      <div className="space-y-6">
        <div className="nb-panel border-[3px] bg-surface p-6 sm:p-8 space-y-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-none border-[2px] border-line bg-accent text-ink">
            <Mail className="h-6 w-6" />
          </div>

          <div>
            <span className="nb-mono text-xs uppercase tracking-wider text-ink/70">Pendaftaran Berhasil</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1">Konfirmasi Email Kamu</h2>
          </div>

          <p className="text-base text-ink/90 leading-relaxed">
            Kami telah mengirimkan tautan konfirmasi pendaftaran akun ke alamat:
          </p>

          <div className="nb-panel border-[2px] bg-paper px-4 py-3 font-mono font-bold text-sm text-ink break-all">
            {state.values.email}
          </div>

          <div className="space-y-2 text-sm text-ink/80 border-t-[2px] border-line/20 pt-4">
            <p className="font-bold text-ink">Langkah selanjutnya:</p>
            <ol className="list-decimal list-inside space-y-1 pl-1">
              <li>Buka kotak masuk (inbox) email kamu.</li>
              <li>Klik tautan verifikasi yang kami kirim untuk mengaktifkan akun.</li>
              <li>Jika tidak ada di inbox, periksa folder <strong>Spam</strong> atau <strong>Promosi</strong>.</li>
            </ol>
          </div>

          <ResendVerificationCard defaultEmail={state.values.email} />

          <div className="pt-2">
            <Link
              href={next ? `/masuk?next=${encodeURIComponent(next)}` : "/masuk"}
              className="nb-btn w-full flex items-center justify-center gap-2"
            >
              <span>Sudah Konfirmasi? Masuk ke Akun</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="space-y-6">
      <Banner state={state} />
      {next && <input type="hidden" name="next" value={next} />}
      <AuthField
        id="displayName"
        label="Nama"
        autoComplete="name"
        defaultValue={state?.values?.displayName}
        error={fe.displayName}
        hint="Nama tampilan di dashboard dan form kamu"
        required
      />
      <AuthField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        defaultValue={state?.values?.email}
        error={fe.email}
        hint="Tautan konfirmasi akan dikirim ke alamat ini"
        required
      />
      <AuthField
        id="password"
        label="Kata sandi"
        type="password"
        autoComplete="new-password"
        hint="Minimal 8 karakter"
        error={fe.password}
        required
      />
      <AuthField
        id="confirm"
        label="Ulangi kata sandi"
        type="password"
        autoComplete="new-password"
        error={fe.confirm}
        required
      />
      <SubmitButton pendingLabel="Mendaftarkan akun…">Daftar Akun Baru</SubmitButton>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState<AuthState, FormData>(forgotPassword, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="space-y-6">
      <Banner state={state} />
      <AuthField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        defaultValue={state?.values?.email}
        error={fe.email}
        required
      />
      <SubmitButton pendingLabel="Mengirim…">Kirim Tautan Reset</SubmitButton>
    </form>
  );
}

export function ResetForm() {
  const [state, action] = useActionState<AuthState, FormData>(resetPassword, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="space-y-6">
      <Banner state={state} />
      <AuthField
        id="password"
        label="Kata sandi baru"
        type="password"
        autoComplete="new-password"
        hint="Minimal 8 karakter"
        error={fe.password}
        required
      />
      <AuthField
        id="confirm"
        label="Ulangi kata sandi baru"
        type="password"
        autoComplete="new-password"
        error={fe.confirm}
        required
      />
      <SubmitButton pendingLabel="Menyimpan…">Simpan Kata Sandi</SubmitButton>
    </form>
  );
}
