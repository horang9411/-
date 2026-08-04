import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getTaskFileExtension } from "@/lib/tasks/files";

export const TASK_ATTACHMENT_BUCKET = "task-attachments";

export async function uploadTaskAttachments({
  supabase,
  taskId,
  files,
  uploadedBy,
}: {
  supabase: SupabaseClient;
  taskId: string;
  files: File[];
  uploadedBy: string;
}) {
  const uploadedPaths: string[] = [];

  try {
    for (const file of files) {
      const extension = getTaskFileExtension(file.name);
      const path = `${taskId}/${randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(TASK_ATTACHMENT_BUCKET)
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;
      uploadedPaths.push(path);

      const { error: metadataError } = await supabase
        .from("task_attachments")
        .insert({
          task_id: taskId,
          file_name: file.name,
          file_url: path,
          mime_type: file.type,
          file_size_bytes: file.size,
          uploaded_by: uploadedBy,
        });

      if (metadataError) throw metadataError;
    }

    return { paths: uploadedPaths, error: null };
  } catch (error) {
    if (uploadedPaths.length) {
      await Promise.all([
        supabase.storage.from(TASK_ATTACHMENT_BUCKET).remove(uploadedPaths),
        supabase
          .from("task_attachments")
          .delete()
          .eq("task_id", taskId)
          .in("file_url", uploadedPaths),
      ]);
    }
    return { paths: [], error };
  }
}

export function taskAttachmentFiles(formData: FormData) {
  return formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);
}
