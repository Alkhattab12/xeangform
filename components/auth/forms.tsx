"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { AuthField } from "./AuthField";
import { SubmitButton } from "./SubmitButton";
import { forgotPassword, resendConfirmation, resetPassword, signIn, signUp, type AuthState } from "@/app/actions/auth";

function Banner({ state, extraError }: { state: AuthState; extraError?: string }) {
  const error = state?.error ?? extraError;
  return (
    <>
      {error && (
        <div role="alert" className="nb-panel border-[3px] bg-orange p-4 font-bold text-ink">
          {error}
        </div>
      )}
      {state?.message && (
        <div role="status" className="nb-panel border-[3px] bg-accent p-4 font-bold text-ink">
          {state.message}
        </div>
      )}
    </>
  );
}

export function LoginForm({ next, linkMessage }: { next?: string; linkMessage?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signIn, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <>
      <form action={action} noValidate className="space-y-6">
        <Banner state={state} extraError={linkMessage} />
        {next && <input type="hidden" name="next" value={next} />}
        <AuthField id="email" label="Email" type="email" autoComplete="email" defaultValue={state?.values?.email} error={fe.email} />
        <AuthField id="password" label="Kata sandi" type="password" autoComplete="current-password" error={fe.password} />
        <SubmitButton pendingLabel="Memproses…">Masuk</SubmitButton>
      </form>
      {state?.unverifiedEmail && (
        <div className="mt-6 border-t-[3px] border-line pt-6">
          <p className="mb-4 font-bold">Belum menerima email konfirmasi?</p>
          <ResendForm email={state.unverifiedEmail} next={next} />
        </div>
      )}
    </>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signUp, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="space-y-6">
      <Banner state={state} />
      {next && <input type="hidden" name="next" value={next} />}
      <AuthField id="displayName" label="Nama" autoComplete="name" defaultValue={state?.values?.displayName} error={fe.displayName} />
      <AuthField id="email" label="Email" type="email" autoComplete="email" defaultValue={state?.values?.email} error={fe.email} />
      <AuthField id="password" label="Kata sandi" type="password" autoComplete="new-password" hint="Minimal 8 karakter" error={fe.password} />
      <AuthField id="confirm" label="Ulangi kata sandi" type="password" autoComplete="new-password" error={fe.confirm} />
      <SubmitButton pendingLabel="Membuat akun…">Buat Akun</SubmitButton>
    </form>
  );
}

export function ForgotForm({ linkMessage }: { linkMessage?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(forgotPassword, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="space-y-6">
      <Banner state={state} extraError={linkMessage} />
      <AuthField id="email" label="Email" type="email" autoComplete="email" defaultValue={state?.values?.email} error={fe.email} />
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
      <AuthField id="password" label="Kata sandi baru" type="password" autoComplete="new-password" hint="Minimal 8 karakter" error={fe.password} />
      <AuthField id="confirm" label="Ulangi kata sandi baru" type="password" autoComplete="new-password" error={fe.confirm} />
      <SubmitButton pendingLabel="Menyimpan…">Simpan Kata Sandi</SubmitButton>
    </form>
  );
}

function ResendButton({ cooldown }: { cooldown: number }) {
  const { pending } = useFormStatus();
  const waiting = cooldown > 0;
  return (
    <button type="submit" className="nb-btn nb-btn-ghost w-full" disabled={pending || waiting} aria-live="polite">
      {pending ? "Mengirim…" : waiting ? `Kirim ulang dalam ${cooldown} dtk` : "Kirim Ulang Email Konfirmasi"}
    </button>
  );
}

/** Kirim ulang email konfirmasi: jeda hitung mundur di UI + pembatas di server (jangan hanya andalkan UI). */
export function ResendForm({ email, next }: { email?: string; next?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(resendConfirmation, null);
  const [left, setLeft] = useState(0);
  const fe = state?.fieldErrors ?? {};

  useEffect(() => {
    if (state?.resendCooldown) setLeft(state.resendCooldown);
  }, [state]);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  return (
    <form action={action} noValidate className="space-y-4">
      <Banner state={state} />
      {next && <input type="hidden" name="next" value={next} />}
      {email ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <AuthField id="email" label="Email yang didaftarkan" type="email" autoComplete="email" defaultValue={state?.values?.email} error={fe.email} />
      )}
      <ResendButton cooldown={left} />
    </form>
  );
}
