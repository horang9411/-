import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getLeaveFileExtension } from "@/lib/leave/files";

export const LEAVE_ATTACHMENT_BUCKET = "leave-attachments";

export async function uploadLeaveAttachment(
  supabase: SupabaseClient,
  leaveId: string,
  file: File,
) {
  const path = `${leaveId}/${randomUUID()}.${getLeaveFileExtension(file.name)}`;
  const { error } = await supabase.storage
    .from(LEAVE_ATTACHMENT_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  return { path, error };
}

export function leaveAttachmentFromFormData(formData: FormData) {
  const value = formData.get("attachment");
  return value instanceof File && value.size > 0 ? value : null;
}
