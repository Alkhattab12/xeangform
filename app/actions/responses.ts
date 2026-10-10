"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();

export async function deleteResponsesAction(fd: FormData): Promise<void> {
  const formId = fd.get("formId");
  if (typeof formId !== "string" || !uuid.safeParse(formId).success) redirect("/dashboard");

  const base = `/dashboard/forms/${formId}/responses`;
  const qs = new URLSearchParams(typeof fd.get("qs") === "string" ? (fd.get("qs") as string) : "");
  for (const k of ["notice", "error", "page"]) qs.delete(k);
  const back = (key: "notice" | "error", msg: string) => {
    const p = new URLSearchParams(qs);
    p.set(key, msg);
    return `${base}?${p.toString()}`;
  };

  const ids = [...new Set(fd.getAll("ids").filter((v): v is string => typeof v === "string" && uuid.safeParse(v).success))].slice(0, 200);
  if (ids.length === 0) redirect(back("error", "Pilih minimal satu respons untuk dihapus."));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  // RLS (submissions_owner_delete) memastikan hanya respons milik form kamu yang terhapus
  const { error, count } = await supabase
    .from("form_submissions")
    .delete({ count: "exact" })
    .eq("form_id", formId)
    .in("id", ids);

  revalidatePath(base);
  revalidatePath("/dashboard");
  if (error) redirect(back("error", "Gagal menghapus respons. Coba lagi."));
  redirect(back("notice", `${count ?? 0} respons dihapus.`));
}
