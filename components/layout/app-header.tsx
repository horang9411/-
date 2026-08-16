"use client";

import { HelpCircle, Loader2, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LeaveNotificationCenter } from "@/components/layout/leave-notification-center";
import type { WorkspaceUser } from "@/components/layout/workspace-user";

const routeTitles: Record<string, { title: string; description: string }> = {
  "/calendar": { title: "캘린더", description: "팀의 업무와 휴가 일정을 확인하세요" },
  "/announcements": { title: "공지사항", description: "회사 공지와 주요 안내를 확인하세요" },
  "/meetings": { title: "회의실", description: "회의를 등록하고 참여자를 선택하세요" },
  "/employees": { title: "직원 목록", description: "함께 일하는 동료를 확인하세요" },
  "/leave/new": { title: "휴가 신청", description: "새 휴가 신청서를 작성하세요" },
  "/tasks/new": { title: "업무 등록", description: "새 업무 일정을 등록하세요" },
  "/my-profile": { title: "내 정보", description: "프로필과 계정 정보를 관리하세요" },
  "/admin/employees": { title: "직원 관리", description: "직원 가입과 계정을 관리하세요" },
  "/admin/leave": { title: "휴가 승인", description: "대기 중인 휴가 신청을 검토하세요" },
  "/admin/settings": { title: "설정", description: "회사 휴무일과 기본 설정을 관리하세요" },
};

export function AppHeader({ user }: { user: WorkspaceUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const current = routeTitles[pathname] ?? routeTitles["/calendar"];

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
    }
  }

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-[72px] items-center justify-between border-b border-[#e3e8e4] bg-white/95 px-4 backdrop-blur lg:ml-[244px] lg:px-8">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-lg font-extrabold tracking-[-0.03em] text-[#27332c]">
            {current.title}
          </h1>
          <span className="hidden rounded-full bg-[#fff5c8] px-2 py-0.5 text-[10px] font-bold text-[#715c1d] sm:inline">
            MVP
          </span>
        </div>
        <p className="mt-0.5 hidden text-xs text-[#89918c] md:block">{current.description}</p>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <Button variant="ghost" size="icon" aria-label="도움말" className="hidden sm:inline-flex">
          <HelpCircle className="size-[19px]" />
        </Button>
        <LeaveNotificationCenter user={user} />

        <Link
          href="/my-profile"
          aria-label={`${user.name} 내 정보로 이동`}
          className="ml-1 flex items-center gap-2 rounded-[12px] p-1.5 text-left transition hover:bg-[#f3f6f4]"
        >
          <Avatar name={user.name} imageUrl={user.imageUrl} />
          <span className="hidden min-w-0 sm:block">
            <span className="flex items-center gap-1.5">
              <span className="block truncate text-[13px] font-bold text-[#344039]">{user.name}</span>
              {user.role === "admin" && (
                <span className="rounded-full bg-[#fff3bd] px-1.5 py-0.5 text-[9px] font-extrabold text-[#735c17]">
                  관리자
                </span>
              )}
            </span>
            <span className="block truncate text-[11px] text-[#8b948f]">
              {user.department} · {user.position}
            </span>
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label="로그아웃"
          title="로그아웃"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? <Loader2 className="size-[18px] animate-spin" /> : <LogOut className="size-[18px]" />}
        </Button>
      </div>
    </header>
  );
}
