import {
  CalendarDays,
  ClipboardPlus,
  ContactRound,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

export const mainNavigation = [
  { href: "/calendar", label: "캘린더", icon: CalendarDays },
  { href: "/employees", label: "직원 목록", icon: ContactRound },
  { href: "/leave/new", label: "휴가 신청", icon: ClipboardPlus },
  { href: "/tasks/new", label: "업무 등록", icon: CalendarDays },
  { href: "/my-profile", label: "내 정보", icon: UserRound },
] as const;

export const adminNavigation = [
  { href: "/admin/employees", label: "직원 관리", icon: UsersRound },
  { href: "/admin/settings", label: "설정", icon: Settings },
] as const;

export const leaveApprovalNavigation = [
  { href: "/admin/leave", label: "휴가 승인", icon: ShieldCheck },
] as const;
