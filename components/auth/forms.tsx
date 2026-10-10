"use client";

import { useActionState } from "react";
import { AuthField } from "./AuthField";
import { SubmitButton } from "./SubmitButton";
import { forgotPassword, resetPassword, signIn, signUp, type AuthState } from "@/app/actions/auth";

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

export function LoginForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const [state, action] = useActionState<AuthState, FormData>(signIn, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="space-y-6">
      <Banner state={state} extraError={linkError ? "Tautan tidak valid atau sudah kedaluwarsa." : undefined} />
      {next && <input type="hidden" name="next" value={next} />}
      <AuthField id="email" label="Email" type="email" autoComplete="email" defaultValue={state?.values?.email} error={fe.email} />
      <AuthField id="password" label="Kata sandi" type="password" autoComplete="current-password" error={fe.password} />
      <SubmitButton pendingLabel="Memproses…">Masuk</SubmitButton>
    </form>
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

export function ForgotForm() {
  const [state, action] = useActionState<AuthState, FormData>(forgotPassword, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="space-y-6">
      <Banner state={state} />
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
