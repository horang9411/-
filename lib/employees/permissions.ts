import type { CurrentEmployee } from "@/lib/auth/session";

const detailedViewPositions = new Set([
  "manager",
  "deputy_general_manager",
  "general_manager",
  "team_lead",
]);

export function canViewEmployeeWorkDetails(
  employee: CurrentEmployee,
  targetEmployeeId: string,
  targetDepartmentCode?: string,
) {
  return (
    employee.role === "admin" ||
    employee.id === targetEmployeeId ||
    employee.positionCode === "team_lead" ||
    (detailedViewPositions.has(employee.positionCode) &&
      Boolean(targetDepartmentCode) &&
      employee.departmentCode === targetDepartmentCode)
  );
}

export function canViewAllDepartments(employee: CurrentEmployee) {
  return employee.role === "admin" || employee.positionCode === "team_lead";
}

export function canViewDepartment(
  employee: CurrentEmployee,
  departmentCode: string,
) {
  return (
    canViewAllDepartments(employee) ||
    employee.departmentCode === departmentCode
  );
}
