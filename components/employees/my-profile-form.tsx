"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Camera, CheckCircle2, ChevronDown, IdCard, Loader2, Save, ShieldQuestion, Trash2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { securityQuestionOptions } from "@/lib/auth/security-questions";
import { PROFILE_IMAGE_ACCEPT, validateProfileImage } from "@/lib/employees/profile-image-file";
import { cn, formatPhone } from "@/lib/utils";
import { profileFormSchema, type ProfileFormInput } from "@/schemas/profile";

type ProfileEmployee = {
  id: string;
  loginId: string;
  name: string;
  position: string;
  department: string;
  phone: string;
  imageUrl: string | null;
  hasProfileImage: boolean;
  role: string;
  securityQuestion: string | null;
  hasSecurityAnswer: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

export function MyProfileForm({ employee }: { employee: ProfileEmployee }) {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [removeImage, setRemoveImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<ProfileFormInput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: employee.name,
      phone: formatPhone(employee.phone),
      securityQuestion: (employee.securityQuestion ?? "high_school") as ProfileFormInput["securityQuestion"],
      securityAnswer: "",
    },
  });

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function handleImage(file: File | undefined) {
    if (!file) return;
    const error = validateProfileImage(file);
    setImageError(error);
    if (error) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setRemoveImage(false);
    setSuccess(false);
  }

  function handleRemoveImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedImage(null);
    setPreviewUrl(null);
    setRemoveImage(true);
    setImageError(null);
    setFileInputKey((key) => key + 1);
  }

  const onSubmit = handleSubmit(async (input) => {
    if (selectedImage) {
      const error = validateProfileImage(selectedImage);
      if (error) return setImageError(error);
    }
    setServerError(null);
    setSuccess(false);
    const formData = new FormData();
    formData.set("name", input.name);
    formData.set("phone", input.phone);
    formData.set("removeImage", String(removeImage));
    formData.set("securityQuestion", input.securityQuestion);
    formData.set("securityAnswer", input.securityAnswer);
    if (selectedImage) formData.set("profileImage", selectedImage);

    try {
      const response = await fetch("/api/profile", { method: "PATCH", body: formData });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "프로필을 수정하지 못했습니다.");
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSelectedImage(null);
      setPreviewUrl(null);
      setRemoveImage(false);
      setFileInputKey((key) => key + 1);
      setSuccess(true);
      router.refresh();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "프로필 수정 중 오류가 발생했습니다.");
    }
  });

  const displayedImage = removeImage ? null : previewUrl ?? employee.imageUrl;

  return (
    <section className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[920px]">
        <div>
          <p className="text-[12px] font-extrabold text-[#4c795d]">MY PROFILE</p>
          <h2 className="mt-1 text-[27px] font-extrabold tracking-[-0.045em] text-[#29352e]">내 정보</h2>
          <p className="mt-2 text-[13px] text-[#78827c]">이름, 연락처, 프로필 이미지를 직접 변경할 수 있습니다.</p>
        </div>

        <form onSubmit={onSubmit} noValidate className="mt-6 overflow-hidden rounded-[20px] border border-[#e0e6e2] bg-white shadow-[0_16px_45px_rgba(35,54,42,0.05)]">
          <div className="border-b border-[#e5ebe7] bg-[linear-gradient(120deg,#edf7f0_0%,#fffbed_100%)] px-5 py-7 sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar name={employee.name} imageUrl={displayedImage} size="lg" className="size-24 text-3xl ring-4 ring-white/80" />
              <div className="flex-1">
                <h3 className="text-[20px] font-extrabold text-[#303c35]">프로필 이미지</h3>
                <p className="mt-1 text-[12px] leading-5 text-[#748078]">JPG, PNG, WEBP 파일 · 최대 4MB<br />등록한 이미지는 비공개 저장소에서 안전하게 제공됩니다.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="secondary"><label htmlFor="profile-image-input" className="cursor-pointer"><Camera className="size-4" />이미지 선택</label></Button>
                  {(employee.hasProfileImage || selectedImage) && !removeImage && <Button type="button" size="sm" variant="ghost" onClick={handleRemoveImage} className="text-[#a0524d]"><Trash2 className="size-4" />이미지 삭제</Button>}
                </div>
                <input key={fileInputKey} id="profile-image-input" type="file" accept={PROFILE_IMAGE_ACCEPT} className="sr-only" onChange={(event) => handleImage(event.target.files?.[0])} />
                {selectedImage && <p className="mt-2 text-[11px] font-semibold text-[#4f745d]">선택됨: {selectedImage.name}</p>}
                {removeImage && <p className="mt-2 text-[11px] font-semibold text-[#a0524d]">저장하면 기존 프로필 이미지가 삭제됩니다.</p>}
                {imageError && <p className="mt-2 text-[11px] font-semibold text-[#a0524d]">{imageError}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-7 px-5 py-6 sm:px-8 sm:py-8">
            {(serverError || success) && (
              <div role={serverError ? "alert" : "status"} className={cn("flex items-center gap-2.5 rounded-[12px] border px-4 py-3 text-[13px] font-semibold", serverError ? "border-[#efc7c3] bg-[#fff3f2] text-[#984b46]" : "border-[#c5e4ce] bg-[#f0faf3] text-[#3e7552]")}>
                {serverError ? <AlertCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
                {serverError ?? "프로필 정보가 저장되었습니다."}
              </div>
            )}

            <ProfileSection title="계정 정보" icon={<IdCard className="size-4.5" />}>
              <div className="grid gap-4 sm:grid-cols-2">
                <ReadonlyField label="로그인 아이디" value={employee.loginId} />
                <ReadonlyField label="권한" value={employee.role} />
                <ReadonlyField label="부서" value={employee.department} />
                <ReadonlyField label="직급" value={employee.position} />
              </div>
              <p className="mt-3 text-[11px] text-[#8a948e]">아이디·권한·부서·직급 변경은 관리자에게 요청해 주세요.</p>
            </ProfileSection>

            <ProfileSection title="기본 정보" icon={<UserRound className="size-4.5" />}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="이름" error={errors.name?.message}>
                  <input {...register("name")} className={inputClass} />
                </Field>
                <Field label="연락처" error={errors.phone?.message}>
                  <input {...register("phone")} inputMode="numeric" placeholder="010-1234-5678" className={inputClass} onChange={(event) => setValue("phone", formatPhone(event.target.value), { shouldValidate: true, shouldDirty: true })} />
                </Field>
              </div>
            </ProfileSection>

            <ProfileSection title="비밀번호 찾기 보안 질문" icon={<ShieldQuestion className="size-4.5" />}>
              <div className="rounded-[13px] border border-[#e0e7e2] bg-[#f8faf8] p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-[11px] leading-5 text-[#78837c]">비밀번호를 잊었을 때 본인 확인에 사용합니다. 답변은 해시로 저장되어 누구도 원문을 볼 수 없습니다.</p>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold", employee.hasSecurityAnswer ? "bg-[#e4f4e9] text-[#397050]" : "bg-[#fff0c6] text-[#80661c]")}>
                    {employee.hasSecurityAnswer ? "등록 완료" : "등록 필요"}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="보안 질문" error={errors.securityQuestion?.message}>
                    <span className="relative block">
                      <select {...register("securityQuestion")} className={`${inputClass} appearance-none pr-10`}>
                        {securityQuestionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-[#89938d]" />
                    </span>
                  </Field>
                  <Field label={employee.hasSecurityAnswer ? "새 답변 (변경할 때만 입력)" : "답변"} error={errors.securityAnswer?.message}>
                    <input {...register("securityAnswer")} type="password" autoComplete="off" placeholder={employee.hasSecurityAnswer ? "기존 답변을 유지하려면 비워두세요" : "답변을 입력해 주세요"} className={inputClass} />
                  </Field>
                </div>
              </div>
            </ProfileSection>

            <div className="flex flex-col justify-between gap-3 border-t border-[#e8ece9] pt-5 sm:flex-row sm:items-center">
              <p className="text-[11px] text-[#8a948e]">가입일 {formatDateTime(employee.createdAt)} · 최근 로그인 {employee.lastLoginAt ? formatDateTime(employee.lastLoginAt) : "기록 없음"}</p>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{isSubmitting ? "저장 중..." : "변경사항 저장"}</Button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}

function ProfileSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section><div className="mb-4 flex items-center gap-2 text-[#3f6f52]">{icon}<h3 className="text-[14px] font-extrabold text-[#3b473f]">{title}</h3></div>{children}</section>;
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return <div><p className="mb-1.5 text-[11px] font-bold text-[#707b74]">{label}</p><div className="flex h-11 items-center rounded-[10px] border border-[#e5e9e6] bg-[#f5f7f5] px-3.5 text-[13px] font-semibold text-[#68736c]">{value}</div></div>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label><span className="mb-1.5 block text-[11px] font-bold text-[#5e6962]">{label}</span>{children}{error && <span className="mt-1.5 block text-[11px] font-semibold text-[#a0524d]">{error}</span>}</label>;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(value));
}

const inputClass = "h-11 w-full rounded-[10px] border border-[#dfe5e1] bg-white px-3.5 text-[13px] font-semibold text-[#455049] outline-none transition focus:border-[#7eae8d] focus:ring-3 focus:ring-[#dcefe2]";
