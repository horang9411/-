"use client";

import {
  Bell,
  CalendarCheck2,
  CalendarX2,
  Loader2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { WorkspaceUser } from "@/components/layout/workspace-user";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  type: "approval" | "cancelled" | "deleted";
  title: string;
  description: string;
  createdAt: string;
  href: string;
};

type NotificationResponse = {
  items: NotificationItem[];
  pendingCount: number;
  changeCount: number;
  checkedAt: string;
};

export function LeaveNotificationCenter({ user }: { user: WorkspaceUser }) {
  const canReceive =
    user.positionCode === "team_lead" ||
    (user.role === "admin" && user.positionCode === "representative");
  const storageKey = `pastelcraft-leave-notifications-seen:${user.id}`;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [changeCount, setChangeCount] = useState(0);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const sinceRef = useRef<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    if (!canReceive) return;
    const since = sinceRef.current ?? new Date().toISOString();
    setLoading(true);
    try {
      const response = await fetch(
        `/api/notifications?since=${encodeURIComponent(since)}`,
        { cache: "no-store" },
      );
      if (!response.ok) return;
      const result = (await response.json()) as NotificationResponse;
      setItems(result.items);
      setPendingCount(result.pendingCount);
      setChangeCount(result.changeCount);
      setCheckedAt(result.checkedAt);
    } finally {
      setLoading(false);
    }
  }, [canReceive]);

  useEffect(() => {
    if (!canReceive) return;
    sinceRef.current = window.localStorage.getItem(storageKey) ?? new Date().toISOString();
    const initialLoad = window.setTimeout(() => void loadNotifications(), 0);

    const interval = window.setInterval(() => void loadNotifications(), 30_000);
    const handleFocus = () => void loadNotifications();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void loadNotifications();
    };
    const handleLeaveChange = () => void loadNotifications();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("leave-requests-changed", handleLeaveChange);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("leave-requests-changed", handleLeaveChange);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [canReceive, loadNotifications, storageKey]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  if (!canReceive) return null;

  const count = pendingCount + changeCount;
  function toggle() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen) return;

    const nextSeenAt = checkedAt ?? new Date().toISOString();
    sinceRef.current = nextSeenAt;
    window.localStorage.setItem(storageKey, nextSeenAt);
    setChangeCount(0);
  }

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={count > 0 ? `알림 ${count}개` : "알림"}
        aria-expanded={open}
        onClick={toggle}
        className="relative"
      >
        <Bell className="size-[19px]" />
        {count > 0 && (
          <span className="absolute right-0.5 top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#dc6b61] px-1 text-[10px] font-extrabold leading-none text-white ring-2 ring-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-[48px] z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-[16px] border border-[#dfe5e1] bg-white shadow-[0_18px_55px_rgba(31,48,38,0.18)]">
          <div className="flex items-center justify-between border-b border-[#edf0ee] px-4 py-3.5">
            <div>
              <p className="text-[14px] font-extrabold text-[#303c35]">휴가 알림</p>
              <p className="mt-0.5 text-[10px] text-[#8a948e]">승인 대기와 최근 취소·삭제 내역</p>
            </div>
            <Link
              href="/admin/leave"
              onClick={() => setOpen(false)}
              className="rounded-[8px] bg-[#edf7f0] px-2.5 py-1.5 text-[11px] font-extrabold text-[#397050] hover:bg-[#e2f1e7]"
            >
              휴가 승인
            </Link>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="flex min-h-32 items-center justify-center text-[#809087]">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <CalendarCheck2 className="mx-auto size-7 text-[#9bb4a5]" />
                <p className="mt-2 text-[12px] font-bold text-[#77827b]">새 휴가 알림이 없습니다.</p>
              </div>
            ) : (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex gap-3 border-b border-[#f0f2f0] px-4 py-3.5 transition last:border-0 hover:bg-[#f8faf8]"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
                      item.type === "approval"
                        ? "bg-[#fff3c4] text-[#806719]"
                        : "bg-[#f8e8e6] text-[#9a514b]",
                    )}
                  >
                    {item.type === "approval" ? (
                      <CalendarCheck2 className="size-4" />
                    ) : item.type === "deleted" ? (
                      <Trash2 className="size-4" />
                    ) : (
                      <CalendarX2 className="size-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-extrabold leading-5 text-[#39443e]">{item.title}</span>
                    <span className="mt-0.5 block text-[10px] leading-4 text-[#7e8982]">{item.description}</span>
                    <time className="mt-1 block text-[9px] font-medium text-[#a0a8a3]">{formatDateTime(item.createdAt)}</time>
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
