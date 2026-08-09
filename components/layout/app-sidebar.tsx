"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { flushSync } from "react-dom";

import {
  adminNavigation,
  leaveApprovalNavigation,
  mainNavigation,
} from "@/config/navigation";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import type { WorkspaceUser } from "@/components/layout/workspace-user";

type AppSidebarProps = {
  user: WorkspaceUser;
};

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const [pendingNavigation, setPendingNavigation] = useState<{
    href: string;
    fromPath: string;
  } | null>(null);
  const pendingHref =
    pendingNavigation?.fromPath === pathname ? pendingNavigation.href : null;
  const isAdmin = user.role === "admin";
  const canApproveLeave = isAdmin || user.positionCode === "team_lead";
  const beginNavigation = (href: string) => {
    if (href !== pathname) {
      flushSync(() => setPendingNavigation({ href, fromPath: pathname }));
    }
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[76px] flex-col border-r border-[#e2e7e3] bg-[#f8faf8] lg:w-[244px]">
      {pendingHref && (
        <div className="fixed left-[76px] right-0 top-[72px] z-50 h-1 overflow-hidden bg-[#dce9df] lg:left-[244px]">
          <div className="h-full w-1/2 animate-pulse rounded-r-full bg-[#58a873]" />
          <span className="sr-only">새 화면을 불러오고 있습니다.</span>
        </div>
      )}
      <div className="flex h-[72px] items-center justify-center border-b border-[#e8ece9] px-2 lg:px-5">
        <Link
          href="/calendar"
          prefetch
          onClick={() => beginNavigation("/calendar")}
          aria-label="파스텔크래프트 캘린더로 이동"
          className="flex h-10 w-[56px] items-center justify-center overflow-hidden rounded-[9px] border border-[#e5e9e6] bg-white px-1.5 shadow-sm lg:h-12 lg:w-full lg:px-3"
        >
          <Image
            src="/brand/pastelplay-logo.png"
            alt="파스텔크래프트 회사 로고"
            width={363}
            height={108}
            priority
            className="h-auto w-full object-contain"
          />
        </Link>
      </div>

      <nav aria-label="주 메뉴" className="flex-1 overflow-y-auto px-3 py-5 lg:px-4">
        <NavGroup
          items={mainNavigation}
          pathname={pathname}
          pendingHref={pendingHref}
          onNavigate={beginNavigation}
        />

        {canApproveLeave && (
          <div className="mt-7 border-t border-[#e5e9e6] pt-5">
            <p className="mb-2 hidden px-3 text-[11px] font-bold tracking-[0.08em] text-[#9aa39e] lg:block">
              승인
            </p>
            <NavGroup
              items={leaveApprovalNavigation}
              pathname={pathname}
              pendingHref={pendingHref}
              onNavigate={beginNavigation}
            />
          </div>
        )}

        {isAdmin && (
          <div className="mt-7 border-t border-[#e5e9e6] pt-5">
            <p className="mb-2 hidden px-3 text-[11px] font-bold tracking-[0.08em] text-[#9aa39e] lg:block">
              관리자
            </p>
            <NavGroup
              items={adminNavigation}
              pathname={pathname}
              pendingHref={pendingHref}
              onNavigate={beginNavigation}
            />
          </div>
        )}
      </nav>

      <Link
        href="/my-profile"
        prefetch
        onClick={() => beginNavigation("/my-profile")}
        className="m-3 hidden items-center gap-3 rounded-[14px] border border-[#e2e7e3] bg-white p-3 transition hover:border-[#cbd8cf] hover:bg-[#fbfdfb] lg:flex"
      >
        <Avatar name={user.name} imageUrl={user.imageUrl} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-xs font-extrabold text-[#354139]">{user.name}</span>
            {isAdmin && (
              <span className="rounded-full bg-[#fff3bd] px-1.5 py-0.5 text-[8px] font-extrabold text-[#735c17]">
                관리자
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-[10px] text-[#87918b]">
            {user.department} · {user.position}
          </span>
        </span>
      </Link>
    </aside>
  );
}

type NavItem = {
  readonly href: string;
  readonly label: string;
  readonly icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

function NavGroup({
  items,
  pathname,
  pendingHref,
  onNavigate,
}: {
  items: readonly NavItem[];
  pathname: string;
  pendingHref: string | null;
  onNavigate: (href: string) => void;
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/calendar" && pathname.startsWith(`${item.href}/`));
        const Icon = item.icon;
        const isPending = pendingHref === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            onClick={() => onNavigate(item.href)}
            title={item.label}
            className={cn(
              "group flex h-11 items-center justify-center gap-3 rounded-[11px] px-3 text-base font-semibold transition-colors lg:justify-start",
              isActive
                ? "bg-[#e3f5ea] text-[#285d40]"
                : "text-[#66716a] hover:bg-[#edf1ee] hover:text-[#36423b]",
            )}
          >
            {isPending ? (
              <span className="size-[19px] shrink-0 animate-spin rounded-full border-2 border-[#b7d2c0] border-t-[#2f7650]" />
            ) : (
              <Icon className="size-[19px] shrink-0" strokeWidth={isActive ? 2.35 : 1.9} />
            )}
            <span className="hidden lg:inline">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
