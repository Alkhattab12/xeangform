"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  User,
  Mail,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  CircleOff,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  updateProfileName,
  updateUserEmail,
  changeUserPassword,
  type AuthState,
} from "@/app/actions/auth";
import { useBackground, type BackgroundMode } from "@/components/background/BackgroundContext";

function Banner({ state }: { state: AuthState }) {
  if (!state) return null;
  return (
    <div className="space-y-2">
      {state.error && (
        <div
          role="alert"
          className="nb-panel border-[2px] bg-orange p-3 font-bold text-sm text-ink flex items-start gap-2"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>{state.error}</div>
        </div>
      )}
      {state.message && (
        <div
          role="status"
          className="nb-panel border-[2px] bg-lime p-3 font-bold text-sm text-ink flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <div>{state.message}</div>
        </div>
      )}
    </div>
  );
}

export function ProfileNameForm({ initialName }: { initialName: string }) {
  const [state, action, isPending] = useActionState<AuthState, FormData>(updateProfileName, null);
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="space-y-4">
      <Banner state={state} />

      <div>
        <label htmlFor="displayName" className="block font-display font-bold text-sm mb-1.5">
          Nama Tampilan
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          defaultValue={initialName}
          required
          maxLength={60}
          className="nb-input text-sm"
          placeholder="Nama lengkap kamu"
          aria-invalid={fe.displayName ? true : undefined}
        />
        {fe.displayName && (
          <p role="alert" className="text-xs font-bold text-[#c62f00] dark:text-orange mt-1.5">
            {fe.displayName}
          </p>
        )}
        <p className="nb-mono text-[11px] text-ink/70 mt-1">
          Digunakan di dashboard, pembuatan form, dan pemberitahuan.
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="nb-btn text-sm font-bold flex items-center gap-2 min-h-[42px]"
      >
        {isPending ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Menyimpan…</span>
          </>
        ) : (
          <span>Simpan Perubahan Nama</span>
        )}
      </button>
    </form>
  );
}

export function EmailUpdateForm({ currentEmail, isConfirmed }: { currentEmail: string; isConfirmed: boolean }) {
  const [state, action, isPending] = useActionState<AuthState, FormData>(updateUserEmail, null);
  const fe = state?.fieldErrors ?? {};
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <Banner state={state} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 nb-panel border-[2px] bg-paper">
        <div>
          <span className="nb-mono text-[11px] text-ink/70 block">Email Saat Ini</span>
          <span className="font-mono font-bold text-sm text-ink break-all">{currentEmail}</span>
        </div>
        <div className="flex items-center gap-2">
          {isConfirmed ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-lime border-[2px] border-line text-ink">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Terverifikasi</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-orange border-[2px] border-line text-ink">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Belum Terverifikasi</span>
            </span>
          )}
        </div>
      </div>

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="nb-btn nb-btn-ghost text-xs font-bold py-2 px-3"
        >
          Ganti Alamat Email
        </button>
      ) : (
        <form action={action} noValidate className="space-y-4 pt-2 border-t-[2px] border-line/20">
          <div>
            <label htmlFor="newEmail" className="block font-display font-bold text-sm mb-1.5">
              Alamat Email Baru
            </label>
            <input
              id="newEmail"
              name="newEmail"
              type="email"
              required
              className="nb-input text-sm"
              placeholder="emailbaru@domain.com"
              aria-invalid={fe.newEmail ? true : undefined}
            />
            {fe.newEmail && (
              <p role="alert" className="text-xs font-bold text-[#c62f00] dark:text-orange mt-1.5">
                {fe.newEmail}
              </p>
            )}
            <p className="text-xs text-ink/80 mt-1.5">
              Tautan konfirmasi akan dikirim ke alamat email baru. Email belum akan berganti sebelum tautan tersebut diklik.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="nb-btn text-sm font-bold flex items-center gap-2 min-h-[42px]"
            >
              {isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Mengirim Tautan…</span>
                </>
              ) : (
                <span>Kirim Tautan Verifikasi Email Baru</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="nb-btn nb-btn-ghost text-sm font-bold min-h-[42px]"
            >
              Batal
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function PasswordChangeForm() {
  const [state, action, isPending] = useActionState<AuthState, FormData>(changeUserPassword, null);
  const fe = state?.fieldErrors ?? {};
  const formRef = useRef<HTMLFormElement>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (state?.message && formRef.current) {
      formRef.current.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} noValidate className="space-y-4">
      <Banner state={state} />

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="account-password" className="block font-display font-bold text-sm">
            Kata Sandi Baru
          </label>
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="flex items-center gap-1 text-xs font-semibold text-ink/70 hover:text-ink"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{showPassword ? "Sembunyikan" : "Perlihatkan"}</span>
          </button>
        </div>
        <input
          id="account-password"
          name="password"
          type={showPassword ? "text" : "password"}
          required
          autoComplete="new-password"
          className="nb-input text-sm"
          placeholder="Minimal 8 karakter"
          aria-invalid={fe.password ? true : undefined}
        />
        {fe.password && (
          <p role="alert" className="text-xs font-bold text-[#c62f00] dark:text-orange mt-1.5">
            {fe.password}
          </p>
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="account-confirm" className="block font-display font-bold text-sm">
            Konfirmasi Kata Sandi Baru
          </label>
          <button
            type="button"
            onClick={() => setShowConfirm((p) => !p)}
            className="flex items-center gap-1 text-xs font-semibold text-ink/70 hover:text-ink"
            tabIndex={-1}
          >
            {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{showConfirm ? "Sembunyikan" : "Perlihatkan"}</span>
          </button>
        </div>
        <input
          id="account-confirm"
          name="confirm"
          type={showConfirm ? "text" : "password"}
          required
          autoComplete="new-password"
          className="nb-input text-sm"
          placeholder="Ulangi kata sandi baru"
          aria-invalid={fe.confirm ? true : undefined}
        />
        {fe.confirm && (
          <p role="alert" className="text-xs font-bold text-[#c62f00] dark:text-orange mt-1.5">
            {fe.confirm}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="nb-btn text-sm font-bold flex items-center gap-2 min-h-[42px]"
      >
        {isPending ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Memperbarui…</span>
          </>
        ) : (
          <span>Perbarui Kata Sandi</span>
        )}
      </button>
    </form>
  );
}

export function BackgroundPreferenceCard() {
  const { mode, setMode, isMounted } = useBackground();

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink/85">
        Pilih preferensi tampilan latar belakang di seluruh aplikasi. Mode yang dipilih akan diterapkan secara instan dan disimpan ke profil kamu.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          onClick={() => setMode("motion")}
          className={`nb-panel p-4 text-left transition-all flex flex-col justify-between gap-3 cursor-pointer ${
            isMounted && mode === "motion"
              ? "border-[3px] border-cobalt bg-accent/20 ring-2 ring-cobalt/30"
              : "border-[2px] border-line bg-surface hover:bg-paper"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-display font-bold text-base">
              <Sparkles className="h-5 w-5 text-cobalt" />
              <span>Mode Gerak</span>
            </span>
            {isMounted && mode === "motion" && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-cobalt text-white rounded-none">
                Aktif
              </span>
            )}
          </div>
          <p className="text-xs text-ink/80 leading-relaxed">
            Animasi aura warna halus, pencahayaan interaktif, dan tekstur dinamis yang memberikan karakter visual modern.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setMode("static")}
          className={`nb-panel p-4 text-left transition-all flex flex-col justify-between gap-3 cursor-pointer ${
            isMounted && mode === "static"
              ? "border-[3px] border-line bg-accent/20 ring-2 ring-line/30"
              : "border-[2px] border-line bg-surface hover:bg-paper"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-display font-bold text-base">
              <CircleOff className="h-5 w-5 text-ink/70" />
              <span>Mode Diam</span>
            </span>
            {isMounted && mode === "static" && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-ink text-paper rounded-none">
                Aktif
              </span>
            )}
          </div>
          <p className="text-xs text-ink/80 leading-relaxed">
            Latar visual statis elegan tanpa gerakan. Semua animasi nonesensial dihentikan total demi fokus dan efisiensi.
          </p>
        </button>
      </div>
    </div>
  );
}
