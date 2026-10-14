"use client";

import { useActionState, useEffect, useRef } from "react";
import { AuthField } from "@/components/auth/AuthField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { changeEmail, changePassword, updateDisplayName, type AccountState } from "@/app/actions/account";

function Banner({ state }: { state: AccountState }) {
  if (!state?.error && !state?.message) return null;
  const isError = Boolean(state.error);
  return (
    <div
      role={isError ? "alert" : "status"}
      className={`nb-panel border-[3px] p-4 font-bold text-ink ${isError ? "bg-orange" : "bg-accent"}`}
    >
      {state.error ?? state.message}
    </div>
  );
}

/** Mengosongkan seluruh kolom (termasuk kata sandi) setelah operasi berhasil. */
function useResetOnSuccess(state: AccountState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

export function ProfileForm({ displayName }: { displayName: string }) {
  const [state, action] = useActionState<AccountState, FormData>(updateDisplayName, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="space-y-5">
      <Banner state={state} />
      <AuthField id="displayName" label="Nama" autoComplete="name" defaultValue={state?.values?.displayName ?? displayName} hint="2–60 karakter" error={fe.displayName} />
      <SubmitButton pendingLabel="Menyimpan…">Simpan Nama</SubmitButton>
    </form>
  );
}

export function EmailForm() {
  const [state, action] = useActionState<AccountState, FormData>(changeEmail, null);
  const ref = useResetOnSuccess(state);
  const fe = state?.fieldErrors ?? {};
  return (
    <form ref={ref} action={action} noValidate className="space-y-5">
      <Banner state={state} />
      <AuthField id="newEmail" label="Email baru" type="email" autoComplete="email" defaultValue={state?.values?.email} error={fe.newEmail} />
      <AuthField id="currentPassword" label="Kata sandi saat ini" type="password" autoComplete="current-password" hint="Dibutuhkan untuk memastikan ini benar-benar kamu" error={fe.currentPassword} />
      <SubmitButton pendingLabel="Mengirim…">Kirim Tautan Konfirmasi</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<AccountState, FormData>(changePassword, null);
  const ref = useResetOnSuccess(state);
  const fe = state?.fieldErrors ?? {};
  return (
    <form ref={ref} action={action} noValidate className="space-y-5">
      <Banner state={state} />
      <AuthField id="currentPassword" label="Kata sandi saat ini" type="password" autoComplete="current-password" error={fe.currentPassword} />
      <AuthField id="newPassword" label="Kata sandi baru" type="password" autoComplete="new-password" hint="Minimal 8 karakter" error={fe.newPassword} />
      <AuthField id="confirm" label="Ulangi kata sandi baru" type="password" autoComplete="new-password" error={fe.confirm} />
      <SubmitButton pendingLabel="Menyimpan…">Ubah Kata Sandi</SubmitButton>
    </form>
  );
}
