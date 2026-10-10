import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicForm } from "@/components/public/PublicForm";
import { getPublicForm } from "@/lib/forms/public";

export const dynamic = "force-dynamic"; // unpublish langsung berlaku

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const form = await getPublicForm(slug);
  return { title: form?.title ?? "Form tidak tersedia", robots: { index: false, follow: false } };
}

export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = await getPublicForm(slug);
  if (!form) notFound(); // draft, arsip, atau tidak ada: respons sama (tidak membocorkan keberadaan draft)

  return (
    <div className="min-h-dvh">
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <PublicForm slug={slug} title={form.title} description={form.description} fields={form.fields} />
        <p className="nb-mono mt-8 text-center">
          <Link href="/" className="underline underline-offset-4">Dibuat dengan Syamil Form</Link>
        </p>
      </main>
    </div>
  );
}
