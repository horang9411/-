import type { CurrentEmployee } from "@/lib/auth/session";

export function canDeleteMeeting(
  employee: CurrentEmployee,
  createdBy: string,
) {
  return employee.role === "admin" || employee.id === createdBy;
}
