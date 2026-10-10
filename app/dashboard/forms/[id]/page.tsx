import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { FormEditor } from "@/components/editor/FormEditor";
import { formSchemaJson, type FormStatus } from "@/lib/forms/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Editor form" };
export const dynamic = "force-dynamic";

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("forms")
    .select("id,title,description,slug,status,schema_json")
    .eq("id", id)
    .maybeSingle(); // RLS: hanya form milik user yang terbaca

  if (error) throw new Error("Gagal memuat form.");
  if (!data) notFound();

  const parsed = formSchemaJson.safeParse(data.schema_json);
  return (
    <FormEditor
      initial={{
        id: data.id,
        title: data.title,
        description: data.description ?? "",
        slug: data.slug,
        status: data.status as FormStatus,
        fields: parsed.success ? parsed.data.fields : [],
      }}
    />
  );
}
