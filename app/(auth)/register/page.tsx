import type { Metadata } from "next";
import { ArrowLeft, CheckCircle2, ShieldCheck, UserPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentEmployee } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "직원 가입",
};

export default async function RegisterPage() {
  const employee = await getCurrentEmployee();
  if (employee) redirect("/calendar");

  return (
    <main className="min-h-screen bg-[#f4f6f4]">
      <div className="mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="relative hidden overflow-hidden bg-[#315f47] p-10 text-white lg:flex lg:flex-col">
          <div className="pointer-events-none absolute -right-28 top-20 size-72 rounded-full bg-[#80cfa5]/10 blur-2xl" />
          <Link href="/login" className="relative z-10 inline-flex w-fit rounded-[13px] bg-white px-3.5 py-2.5 shadow-lg shadow-black/10">
            <Image
              src="/brand/pastelplay-logo.png"
              alt="파스텔크래프트 회사 로고"
              width={363}
              height={108}
              priority
              className="h-auto w-[190px] object-contain"
            />
          </Link>

          <div className="relative z-10 my-auto">
            <span className="flex size-12 items-center justify-center rounded-[15px] bg-[#f6d978] text-[#5c4910]">
              <UserPlus className="size-5" />
            </span>
            <h1 className="mt-6 text-[30px] font-extrabold leading-tight tracking-[-0.05em]">직원 계정을<br />신청해 주세요.</h1>
            <p className="mt-4 text-[13px] leading-6 text-[#c6dbcf]">가입 정보는 관리자 검토 후 승인되며,<br />승인 완료 후 로그인할 수 있습니다.</p>

            <div className="mt-9 space-y-4">
              <InfoItem icon={CheckCircle2} text="로그인 아이디 중복 확인" />
              <InfoItem icon={ShieldCheck} text="비밀번호 안전한 해시 저장" />
              <InfoItem icon={CheckCircle2} text="관리자 승인 후 서비스 이용" />
            </div>
          </div>

          <Link href="/login" className="relative z-10 inline-flex items-center gap-2 text-xs font-bold text-[#c8ddd0] transition hover:text-white">
            <ArrowLeft className="size-4" /> 로그인으로 돌아가기
          </Link>
        </aside>

        <section className="px-5 py-8 sm:px-8 lg:px-12 lg:py-12 xl:px-20">
          <div className="mx-auto w-full max-w-[760px]">
            <div className="mb-7 flex items-center justify-between lg:hidden">
              <Image
                src="/brand/pastelplay-logo.png"
                alt="파스텔크래프트 회사 로고"
                width={363}
                height={108}
                priority
                className="h-auto w-[170px] object-contain"
              />
              <Link href="/login" className="text-xs font-bold text-[#4d785f]">로그인</Link>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e5f5eb] px-2.5 py-1 text-[11px] font-bold text-[#397253]">직원 가입</span>
            <h2 className="mt-3 text-[28px] font-extrabold tracking-[-0.045em] text-[#28342d]">가입 정보를 입력해 주세요</h2>
            <p className="mt-2 text-[13px] text-[#7b857f]">모든 필수 항목을 정확하게 입력하면 관리자에게 승인 요청이 전달됩니다.</p>

            <RegisterForm />

            <p className="mt-6 text-center text-xs text-[#7e8882]">
              이미 계정이 있나요? <Link href="/login" className="font-bold text-[#356c4d] hover:underline">로그인하기</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoItem({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return <div className="flex items-center gap-3 text-[12px] font-semibold text-[#d5e5dc]"><span className="flex size-7 items-center justify-center rounded-full bg-white/10"><Icon className="size-3.5 text-[#f6d978]" /></span>{text}</div>;
}
