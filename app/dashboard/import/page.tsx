import Link from "next/link";
import type { Metadata } from "next";
import { ImportForm } from "@/components/import/ImportForm";

export const metadata: Metadata = { title: "Impor form" };

export default function ImportPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/dashboard" className="nb-mono underline underline-offset-4">← Dashboard</Link>
      <h1 className="mt-4 font-display text-[clamp(2.25rem,7vw,4rem)] font-bold">Impor Form</h1>
      <p className="mt-3 max-w-xl text-lg leading-relaxed">
        Buat form dari file JSON, termasuk yang dibuatkan AI. Hasil impor selalu berstatus draft, jadi kamu bisa memeriksanya dulu di editor.
      </p>
      <ImportForm />
    </main>
  );
}
