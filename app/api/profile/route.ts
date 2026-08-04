import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { hasValidMutationOrigin, invalidOriginResponse, requireApiEmployee } from "@/lib/auth/api";
import {
  getProfileImageExtension,
  hasValidProfileImageSignature,
  validateProfileImage,
} from "@/lib/employees/profile-image-file";
import { getProfileImagePath } from "@/lib/storage/profile-image";
import { createAdminClient } from "@/lib/supabase/admin";
import { profileFormSchema } from "@/schemas/profile";

const PROFILE_BUCKET = "profile-images";

export async function PATCH(request: Request) {
  if (!hasValidMutationOrigin(request)) return invalidOriginResponse();
  const auth = await requireApiEmployee();
  if (auth.response) return auth.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: "프로필 정보를 읽을 수 없습니다." }, { status: 400 });
  }

  const parsed = profileFormSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "프로필 정보를 확인해 주세요." }, { status: 400 });
  }

  const imageValue = formData.get("profileImage");
  const image = imageValue instanceof File && imageValue.size > 0 ? imageValue : null;
  const removeImage = formData.get("removeImage") === "true";

  if (image) {
    const imageError = validateProfileImage(image);
    if (imageError) return NextResponse.json({ message: imageError }, { status: 400 });
    if (!(await hasValidProfileImageSignature(image))) {
      return NextResponse.json({ message: "파일 내용과 이미지 형식이 일치하지 않습니다." }, { status: 400 });
    }
  }

  const supabase = createAdminClient();
  const { data: before } = await supabase
    .from("employees")
    .select("id, name, phone, profile_image_url")
    .eq("id", auth.employee.id)
    .maybeSingle();
  if (!before) return NextResponse.json({ message: "직원 정보를 찾을 수 없습니다." }, { status: 404 });

  let newImagePath: string | null = null;
  if (image) {
    const extensionByMime: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    const extension = extensionByMime[image.type] ?? getProfileImageExtension(image.name);
    newImagePath = `${auth.employee.id}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from(PROFILE_BUCKET).upload(newImagePath, image, { contentType: image.type, upsert: false });
    if (uploadError) return NextResponse.json({ message: "프로필 이미지를 저장하지 못했습니다." }, { status: 500 });
  }

  const nextImagePath = image ? newImagePath : removeImage ? null : before.profile_image_url;
  const updates = { name: parsed.data.name, phone: parsed.data.phone, profile_image_url: nextImagePath };
  const { error: updateError } = await supabase.from("employees").update(updates).eq("id", auth.employee.id);
  if (updateError) {
    if (newImagePath) await supabase.storage.from(PROFILE_BUCKET).remove([newImagePath]);
    return NextResponse.json({ message: "프로필 정보를 수정하지 못했습니다." }, { status: 500 });
  }

  const oldImagePath = getProfileImagePath(before.profile_image_url);
  if ((image || removeImage) && oldImagePath && oldImagePath !== newImagePath) {
    await supabase.storage.from(PROFILE_BUCKET).remove([oldImagePath]);
  }

  const changedData: Record<string, unknown> = {};
  if (before.name !== updates.name) changedData.name = { before: before.name, after: updates.name };
  if (before.phone !== updates.phone) changedData.phone = { before: before.phone, after: updates.phone };
  if (before.profile_image_url !== updates.profile_image_url) changedData.profile_image = { before: Boolean(before.profile_image_url), after: Boolean(updates.profile_image_url) };
  if (Object.keys(changedData).length) {
    await supabase.from("activity_logs").insert({
      employee_id: auth.employee.id,
      action_type: "employee.profile.update",
      target_type: "employee",
      target_id: auth.employee.id,
      changed_data: changedData,
    });
  }

  return NextResponse.json({ ok: true });
}
