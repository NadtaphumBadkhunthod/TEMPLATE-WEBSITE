"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const STATUSES = [
  "new",
  "in_progress",
  "quoted",
  "won",
  "lost",
  "spam",
] as const;

export async function updateQuoteStatus(formData: FormData) {
  await requireUser();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !(STATUSES as readonly string[]).includes(status)) return;

  await db.quoteRequest.update({
    where: { id },
    data: {
      status: status as (typeof STATUSES)[number],
      handledAt: status === "new" ? null : new Date(),
    },
  });

  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/quotes/${id}`);
}

export async function addQuoteNote(formData: FormData) {
  const user = await requireUser();

  const id = String(formData.get("id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!id || !body) return;

  await db.quoteRequestNote.create({
    data: { quoteRequestId: id, authorId: user.sub, body },
  });

  revalidatePath(`/admin/quotes/${id}`);
}
