import type { CurrentEmployee } from "@/lib/auth/session";

const seniorPositions = new Set([
  "manager",
  "deputy_general_manager",
  "general_manager",
  "team_lead",
]);

export function canManageTask(employee: CurrentEmployee, ownerId: string) {
  return employee.role === "admin" || employee.id === ownerId;
}

export function canViewTaskDetails(
  employee: CurrentEmployee,
  ownerId: string,
  isParticipant = false,
) {
  return (
    canManageTask(employee, ownerId) ||
    isParticipant ||
    seniorPositions.has(employee.positionCode)
  );
}
