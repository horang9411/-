import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import {
  hasValidMutationOrigin,
  invalidOriginResponse,
} from "@/lib/auth/api";
import { hashPassword } from "@/lib/auth/password";
import {
  getProfileImageExtension,
  hasValidProfileImageSignature,
  validateProfileImage,
} from "@/lib/employees/profile-image-file";
import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { registerSchema } from "@/schemas/auth";

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return invalidOriginResponse();

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { message: "가입 정보를 읽을 수 없습니다." },
      { status: 400 },
    );
  }

  const parsed = registerSchema.safeParse({
    loginId: formData.get("loginId"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
    name: formData.get("name"),
    position: formData.get("position"),
    department: formData.get("department"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "가입 정보를 확인해 주세요." },
      { status: 400 },
    );
  }

  const profileImageValue = formData.get("profileImage");
  const profileImage =
    profileImageValue instanceof File && profileImageValue.size > 0
      ? profileImageValue
      : null;

  if (profileImage) {
    const validationError = validateProfileImage(profileImage);
    if (validationError || !(await hasValidProfileImageSignature(profileImage))) {
      return NextResponse.json(
        {
          message:
            validationError ?? "프로필 이미지의 실제 파일 형식을 확인해 주세요.",
        },
        { status: 400 },
      );
    }
  }

  let env: ReturnType<typeof getServerEnv>;
  try {
    env = getServerEnv();
  } catch {
    return NextResponse.json(
      { message: "가입 서버 설정이 완료되지 않았습니다. 관리자에게 문의해 주세요." },
      { status: 503 },
    );
  }

  const supabase = createAdminClient();
  const loginId = parsed.data.loginId.toLowerCase();
  const { data: duplicate } = await supabase
    .from("employees")
    .select("id")
    .eq("login_id", loginId)
    .maybeSingle();

  if (duplicate) {
    return NextResponse.json(
      { message: "이미 사용 중인 로그인 아이디입니다." },
      { status: 409 },
    );
  }

  const employeeId = randomUUID();
  let profileImagePath: string | null = null;

  if (profileImage) {
    const extensionByMime: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    profileImagePath = `${employeeId}/${randomUUID()}.${extensionByMime[profileImage.type] ?? getProfileImageExtension(profileImage.name)}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-images")
      .upload(profileImagePath, profileImage, {
        contentType: profileImage.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { message: "프로필 이미지를 등록하지 못했습니다. 파일을 확인해 주세요." },
        { status: 500 },
      );
    }
  }

  const passwordHash = await hashPassword(
    parsed.data.password,
    env.PASSWORD_PEPPER,
  );
  const { error: insertError } = await supabase.from("employees").insert({
    id: employeeId,
    login_id: loginId,
    password_hash: passwordHash,
    name: parsed.data.name,
    position: parsed.data.position,
    department: parsed.data.department,
    phone: parsed.data.phone,
    profile_image_url: profileImagePath,
    role: "employee",
    account_status: "pending",
  });

  if (insertError) {
    if (profileImagePath) {
      await supabase.storage.from("profile-images").remove([profileImagePath]);
    }

    return NextResponse.json(
      {
        message:
          insertError.code === "23505"
            ? "이미 사용 중인 로그인 아이디입니다."
            : "가입 신청을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: insertError.code === "23505" ? 409 : 500 },
    );
  }

  await supabase.from("activity_logs").insert({
    employee_id: employeeId,
    action_type: "employee.register",
    target_type: "employee",
    target_id: employeeId,
    changed_data: { account_status: "pending" },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
