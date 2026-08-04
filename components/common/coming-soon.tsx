import { ArrowLeft, Construction } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function ComingSoon({ title, description, stage }: { title: string; description: string; stage: string }) {
  return (
    <section className="flex min-h-[calc(100vh-72px)] items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-[20px] border border-[#e2e7e3] bg-white p-8 text-center shadow-[0_15px_40px_rgba(35,54,42,0.05)]">
        <span className="mx-auto flex size-14 items-center justify-center rounded-[17px] bg-[#fff4c8] text-[#8a6a16]">
          <Construction className="size-6" />
        </span>
        <p className="mt-5 text-xs font-bold text-[#3f7555]">{stage}</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[#2c3831]">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-[#7a847e]">{description}</p>
        <Button asChild variant="secondary" className="mt-6">
          <Link href="/calendar"><ArrowLeft className="size-4" /> 캘린더로 돌아가기</Link>
        </Button>
      </div>
    </section>
  );
}
