import type { CurrentEmployee } from "@/lib/auth/session";
import { canViewDepartment } from "@/lib/employees/permissions";

const seniorPositions = new Set([
  "manager",
  "deputy_general_manager",
  "general_manager",
  "team_lead",
]);

export function canManageTask(
  employee: CurrentEmployee,
  ownerId: string,
  taskDepartment: string,
) {
  return (
    employee.role === "admin" ||
    (employee.id === ownerId && canViewDepartment(employee, taskDepartment))
  );
}

export function canViewTaskDetails(
  employee: CurrentEmployee,
  ownerId: string,
  taskDepartment: string,
  isParticipant = false,
) {
  if (!canViewDepartment(employee, taskDepartment)) return false;
  return (
    canManageTask(employee, ownerId, taskDepartment) ||
    isParticipant ||
    seniorPositions.has(employee.positionCode)
  );
}
