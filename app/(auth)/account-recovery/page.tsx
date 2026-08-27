import type { Metadata } from "next";
import { KeyRound, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountRecoveryForm } from "@/components/auth/account-recovery-form";
import { getCurrentEmployee } from "@/lib/auth/session";

export const metadata: Metadata = { title: "아이디·비밀번호 찾기" };

export default async function AccountRecoveryPage() {
  const employee = await getCurrentEmployee();
  if (employee) redirect("/calendar");

  return (
    <main className="min-h-screen bg-[#f3f6f4] px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-[1050px] overflow-hidden rounded-[24px] border border-[#dfe6e1] bg-white shadow-[0_24px_70px_rgba(34,54,42,0.09)] lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden overflow-hidden bg-[#315f47] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute -right-24 -top-20 size-72 rounded-full bg-[#90d6ad]/10 blur-2xl" />
          <Link href="/login" className="relative text-[14px] font-extrabold tracking-[-0.03em] text-[#d9e9df]">Pastelcraft Workspace</Link>
          <div className="relative">
            <span className="flex size-14 items-center justify-center rounded-[17px] bg-[#f6d978] text-[#5b480d]"><KeyRound className="size-6" /></span>
            <h1 className="mt-6 text-[34px] font-extrabold leading-tight tracking-[-0.05em]">계정 정보를<br />안전하게 찾아보세요.</h1>
            <p className="mt-4 text-[13px] leading-6 text-[#c6dbcf]">가입할 때 등록한 직원 정보와 보안 질문으로 본인 여부를 확인합니다.</p>
            <div className="mt-8 flex items-center gap-2 text-[11px] font-bold text-[#d8e7de]"><ShieldCheck className="size-4 text-[#f6d978]" /> 답변과 비밀번호는 암호화되어 저장됩니다.</div>
          </div>
          <p className="relative text-[10px] text-[#9fbeac]">© 2026 Pastelcraft. 임직원 전용 서비스</p>
        </aside>

        <section className="flex items-center justify-center px-5 py-8 sm:px-10 lg:px-14">
          <div className="w-full max-w-[430px]">
            <p className="text-[11px] font-extrabold text-[#4b765a]">ACCOUNT RECOVERY</p>
            <h2 className="mt-2 text-[27px] font-extrabold tracking-[-0.045em] text-[#29352e]">아이디·비밀번호 찾기</h2>
            <p className="mt-2 text-[13px] leading-6 text-[#7b857f]">가입 시 등록한 정보를 정확하게 입력해 주세요.</p>
            <AccountRecoveryForm />
          </div>
        </section>
      </div>
    </main>
  );
}
