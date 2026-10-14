import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { GateCard } from "@/components/public/GateCard";
import { PublicForm } from "@/components/public/PublicForm";
import { ThemeScope } from "@/components/public/ThemeScope";
import { findPriorSubmission, getPublicForm } from "@/lib/forms/public";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/auth/verified-user";

export const dynamic = "force-dynamic"; // unpublish & status pengisian langsung berlaku

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const form = await getPublicForm(slug);
  return { title: form?.title ?? "Form tidak tersedia", robots: { index: false, follow: false } };
}

export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = await getPublicForm(slug);
  if (!form) notFound(); // draft, arsip, atau tidak ada: respons sama (tidak membocorkan keberadaan draft)

  // 1 respons per akun: wajib login; akun yang sudah mengisi ditolak
  let gate: ReactNode = null;
  if (form.settings.oneResponsePerAccount) {
    const supabase = await createClient();
    const user = await getVerifiedUser(supabase);
    if (!user) {
      gate = <GateCard kind="login" slug={slug} title={form.title} />;
    } else {
      const prior = await findPriorSubmission(form.id, user.id);
      if (prior) gate = <GateCard kind="done" slug={slug} title={form.title} score={form.settings.quiz ? prior.score : null} />;
    }
  }

  return (
    <ThemeScope theme={form.theme} className="min-h-dvh">
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {gate ?? (
          <PublicForm
            slug={slug}
            title={form.title}
            description={form.description}
            fields={form.fields}
            settings={form.settings}
            themePreset={form.theme?.preset}
          />
        )}
        <p className="nb-mono mt-10 text-center">
          <Link href="/" className="underline underline-offset-4">Dibuat dengan Syamil Form</Link>
        </p>
      </main>
    </ThemeScope>
  );
}
