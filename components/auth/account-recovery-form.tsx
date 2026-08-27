"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Phone,
  Search,
  ShieldQuestion,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { cn, formatPhone } from "@/lib/utils";
import {
  findLoginIdSchema,
  recoveryIdentitySchema,
  resetPasswordSchema,
  type FindLoginIdInput,
  type RecoveryIdentityInput,
  type ResetPasswordInput,
} from "@/schemas/auth";

type RecoveryTab = "id" | "password";

export function AccountRecoveryForm() {
  const [tab, setTab] = useState<RecoveryTab>("id");

  return (
    <div className="mt-7">
      <div role="tablist" aria-label="계정 찾기 종류" className="grid grid-cols-2 rounded-[12px] bg-[#eef2ef] p-1">
        <TabButton active={tab === "id"} onClick={() => setTab("id")}>아이디 찾기</TabButton>
        <TabButton active={tab === "password"} onClick={() => setTab("password")}>비밀번호 재설정</TabButton>
      </div>
      {tab === "id" ? <FindIdForm /> : <ResetPasswordForm />}
      <Link href="/login" className="mt-6 flex h-11 items-center justify-center gap-2 rounded-[11px] text-[13px] font-bold text-[#5f6b64] transition hover:bg-[#f2f5f3]">
        <ArrowLeft className="size-4" /> 로그인으로 돌아가기
      </Link>
    </div>
  );
}

function FindIdForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [loginIds, setLoginIds] = useState<string[]>([]);
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FindLoginIdInput>({
    resolver: zodResolver(findLoginIdSchema),
    defaultValues: { name: "", phone: "" },
  });

  const onSubmit = handleSubmit(async (input) => {
    setServerError(null);
    setLoginIds([]);
    try {
      const response = await fetch("/api/auth/recovery/find-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const result = (await response.json()) as { message?: string; loginIds?: string[] };
      if (!response.ok) throw new Error(result.message ?? "아이디를 찾지 못했습니다.");
      setLoginIds(result.loginIds ?? []);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "확인 중 오류가 발생했습니다.");
    }
  });

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
      <p className="text-[12px] leading-5 text-[#7b857f]">가입할 때 등록한 이름과 연락처를 입력해 주세요.</p>
      {serverError && <Notice text={serverError} />}
      {loginIds.length > 0 && (
        <div role="status" className="rounded-[13px] border border-[#bfe1ca] bg-[#eff9f2] px-4 py-4 text-center">
          <CheckCircle2 className="mx-auto size-5 text-[#417858]" />
          <p className="mt-2 text-[11px] font-bold text-[#688071]">등록된 로그인 아이디</p>
          {loginIds.map((loginId) => <p key={loginId} className="mt-1 text-[18px] font-extrabold tracking-[0.02em] text-[#315f47]">{loginId}</p>)}
        </div>
      )}
      <RecoveryField label="이름" error={errors.name?.message} icon={<UserRound className="size-[18px]" />}>
        <input {...register("name")} autoComplete="name" placeholder="가입 시 등록한 이름" className="recovery-input" />
      </RecoveryField>
      <RecoveryField label="연락처" error={errors.phone?.message} icon={<Phone className="size-[18px]" />}>
        <input {...register("phone")} type="tel" inputMode="numeric" autoComplete="tel" placeholder="010-1234-5678" className="recovery-input" onChange={(event) => setValue("phone", formatPhone(event.target.value), { shouldValidate: true, shouldDirty: true })} />
      </RecoveryField>
      <Button type="submit" className="h-12 w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
        {isSubmitting ? "아이디 확인 중" : "아이디 확인"}
      </Button>
    </form>
  );
}

function ResetPasswordForm() {
  const [question, setQuestion] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const identityForm = useForm<RecoveryIdentityInput>({
    resolver: zodResolver(recoveryIdentitySchema),
    defaultValues: { loginId: "", name: "", phone: "" },
  });
  const resetForm = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { securityAnswer: "", password: "", passwordConfirm: "" },
  });

  const requestQuestion = identityForm.handleSubmit(async (input) => {
    setServerError(null);
    try {
      const response = await fetch("/api/auth/recovery/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const result = (await response.json()) as { message?: string; question?: string };
      if (!response.ok) throw new Error(result.message ?? "계정 정보를 확인하지 못했습니다.");
      setQuestion(result.question ?? "등록된 보안 질문");
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "확인 중 오류가 발생했습니다.");
    }
  });

  const resetPassword = resetForm.handleSubmit(async (input) => {
    setServerError(null);
    try {
      const response = await fetch("/api/auth/recovery/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "비밀번호를 변경하지 못했습니다.");
      setCompleted(true);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "변경 중 오류가 발생했습니다.");
    }
  });

  if (completed) {
    return (
      <div className="mt-6 rounded-[16px] border border-[#bfe1ca] bg-[#eff9f2] px-5 py-8 text-center">
        <CheckCircle2 className="mx-auto size-8 text-[#3e7553]" />
        <h3 className="mt-3 text-[17px] font-extrabold text-[#33473a]">비밀번호가 변경되었습니다</h3>
        <p className="mt-2 text-[12px] leading-5 text-[#698073]">기존 로그인은 모두 종료되었습니다.<br />새 비밀번호로 다시 로그인해 주세요.</p>
        <Button asChild className="mt-5 h-11 w-full"><Link href="/login">로그인하기</Link></Button>
      </div>
    );
  }

  if (!question) {
    const phoneField = identityForm.register("phone");
    return (
      <form onSubmit={requestQuestion} className="mt-6 space-y-5" noValidate>
        <p className="text-[12px] leading-5 text-[#7b857f]">계정 정보가 일치하면 가입 시 등록한 보안 질문을 표시합니다.</p>
        {serverError && <Notice text={serverError} />}
        <RecoveryField label="로그인 아이디" error={identityForm.formState.errors.loginId?.message} icon={<UserRound className="size-[18px]" />}>
          <input {...identityForm.register("loginId")} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="로그인 아이디" className="recovery-input" />
        </RecoveryField>
        <RecoveryField label="이름" error={identityForm.formState.errors.name?.message} icon={<UserRound className="size-[18px]" />}>
          <input {...identityForm.register("name")} autoComplete="name" placeholder="가입 시 등록한 이름" className="recovery-input" />
        </RecoveryField>
        <RecoveryField label="연락처" error={identityForm.formState.errors.phone?.message} icon={<Phone className="size-[18px]" />}>
          <input {...phoneField} type="tel" inputMode="numeric" autoComplete="tel" placeholder="010-1234-5678" className="recovery-input" onChange={(event) => { event.target.value = formatPhone(event.target.value); phoneField.onChange(event); }} />
        </RecoveryField>
        <Button type="submit" className="h-12 w-full" disabled={identityForm.formState.isSubmitting}>
          {identityForm.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <ShieldQuestion className="size-4" />}
          {identityForm.formState.isSubmitting ? "계정 확인 중" : "보안 질문 확인"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={resetPassword} className="mt-6 space-y-5" noValidate>
      {serverError && <Notice text={serverError} />}
      <div className="rounded-[13px] border border-[#d8e5dc] bg-[#f3f8f5] px-4 py-4">
        <p className="flex items-center gap-2 text-[11px] font-bold text-[#5f7868]"><ShieldQuestion className="size-4" /> 등록된 보안 질문</p>
        <p className="mt-2 text-[15px] font-extrabold text-[#35443a]">{question}</p>
      </div>
      <RecoveryField label="질문 답변" error={resetForm.formState.errors.securityAnswer?.message} icon={<KeyRound className="size-[18px]" />}>
        <input {...resetForm.register("securityAnswer")} type="password" autoComplete="off" placeholder="등록한 답변 입력" className="recovery-input" />
      </RecoveryField>
      <RecoveryField label="새 비밀번호" error={resetForm.formState.errors.password?.message} icon={<KeyRound className="size-[18px]" />} trailing={<VisibilityButton visible={showPassword} onClick={() => setShowPassword((value) => !value)} />}>
        <input {...resetForm.register("password")} type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="영문·숫자 포함 10자 이상" className="recovery-input pr-2" />
      </RecoveryField>
      <RecoveryField label="새 비밀번호 확인" error={resetForm.formState.errors.passwordConfirm?.message} icon={<KeyRound className="size-[18px]" />}>
        <input {...resetForm.register("passwordConfirm")} type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="새 비밀번호 다시 입력" className="recovery-input" />
      </RecoveryField>
      <Button type="submit" className="h-12 w-full" disabled={resetForm.formState.isSubmitting}>
        {resetForm.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
        {resetForm.formState.isSubmitting ? "비밀번호 변경 중" : "비밀번호 변경"}
      </Button>
      <button type="button" onClick={() => { setQuestion(null); setServerError(null); }} className="w-full text-center text-[11px] font-bold text-[#748078] hover:underline">계정 정보를 다시 입력할게요</button>
    </form>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={cn("h-10 rounded-[9px] text-[12px] font-extrabold transition", active ? "bg-white text-[#315f47] shadow-sm" : "text-[#7a857e] hover:text-[#4b5750]")}>{children}</button>;
}

function RecoveryField({ label, error, icon, trailing, children }: { label: string; error?: string; icon: React.ReactNode; trailing?: React.ReactNode; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-[12px] font-bold text-[#4d5851]">{label}</span><span className={cn("flex h-12 items-center rounded-[12px] border bg-white transition focus-within:ring-3", error ? "border-[#e4aaa6] focus-within:ring-red-100" : "border-[#dce2de] focus-within:border-[#8fc9a7] focus-within:ring-emerald-100")}><span className="flex w-11 shrink-0 items-center justify-center text-[#7d8982]">{icon}</span>{children}{trailing && <span className="mr-1.5">{trailing}</span>}</span>{error && <span className="mt-1.5 block text-[11px] font-semibold text-[#ad544f]">{error}</span>}</label>;
}

function VisibilityButton({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex size-9 items-center justify-center rounded-[9px] text-[#849088] hover:bg-[#eff3f0]" aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>;
}

function Notice({ text }: { text: string }) {
  return <div role="alert" className="flex items-start gap-2.5 rounded-[12px] border border-[#efc7c3] bg-[#fff3f2] px-4 py-3 text-[12px] leading-5 text-[#984b46]"><AlertCircle className="mt-0.5 size-4 shrink-0" />{text}</div>;
}
